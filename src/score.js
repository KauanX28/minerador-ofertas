// Pontuação de "escala". Mesma lógica que Minera ROI/SpyROI usam: muitos anúncios ativos,
// rodando há muito tempo, com o mesmo criativo duplicado e crescendo entre varreduras.
import { all, get, hoje } from './db.js';
import { GATEWAYS } from './util.js';

const DIA = 86400;
const clamp = (x) => Math.max(0, Math.min(1, x));
const nomeGateway = (id) => GATEWAYS.find((g) => g.id === id)?.nome || id;
const diasAtras = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

export function classificar({ ativos, dias, crescimentoPct }) {
  if (ativos >= 50) return 'Escalada forte';
  if (crescimentoPct >= 50 && ativos >= 10) return 'Escalando agora';
  if (ativos >= 20 && dias >= 21) return 'Escalada';
  if (ativos >= 8) return 'Validando';
  return 'Teste';
}

export function pontuar({ ativos, dias, dupMax, crescimentoPct }) {
  const sA = clamp(Math.log10(ativos + 1) / Math.log10(101));      // 100 anúncios ativos = nota máxima
  const sD = clamp(dias / 45);                                      // 45+ dias rodando = máxima
  const sDup = clamp(Math.log2(dupMax + 1) / Math.log2(21));        // criativo em 20+ anúncios = máxima
  const sG = clamp((crescimentoPct ?? 0) / 100);                    // dobrou de tamanho = máxima
  return Math.round(100 * (0.55 * sA + 0.2 * sD + 0.1 * sDup + 0.15 * sG));
}

async function favoritosSet(tipo) {
  return new Set((await all('SELECT chave FROM favoritos WHERE tipo = ?', [tipo])).map((r) => r.chave));
}

async function mapaAnalises() {
  const m = new Map();
  for (const r of await all('SELECT dominio, dados FROM analises')) m.set(r.dominio, JSON.parse(r.dados));
  return m;
}

// Última contagem de cada página NAQUELE país (até uma data).
const SQL_ULTIMO = `SELECT h.page_id, h.ativos, h.data FROM historico h
  JOIN (SELECT page_id, MAX(data) d FROM historico WHERE data <= ? AND pais = ? GROUP BY page_id) m
    ON m.page_id = h.page_id AND m.d = h.data WHERE h.pais = ?`;

// Países que já têm dados (para as abas do painel).
export async function paisesComDados() {
  return all(`SELECT pais, COUNT(DISTINCT page_id) paginas, COUNT(*) anuncios FROM anuncios
    WHERE ativo = 1 AND pais IS NOT NULL GROUP BY pais ORDER BY COUNT(DISTINCT page_id) DESC`);
}

// Carrega tudo de uma vez (poucas consultas) e calcula em memória.
export async function rankingPaginas({ pais = 'BR', nicho = '', min = 0, busca = '', minDias = 0, gateway = '' } = {}) {
  const agora = Date.now() / 1000;
  const [paginas, ult, ant, ads, analises, favs] = await Promise.all([
    all('SELECT * FROM paginas'),
    all(SQL_ULTIMO, ['9999-12-31', pais, pais]),
    all(SQL_ULTIMO, [diasAtras(5), pais, pais]),
    all(`SELECT page_id, inicio, dup, dominio, gateway, thumb, titulo, SUBSTR(texto, 1, 220) texto, formato
         FROM anuncios WHERE ativo = 1 AND pais = ? ORDER BY dup DESC, inicio ASC`, [pais]),
    mapaAnalises(),
    favoritosSet('pagina'),
  ]);
  const ultimo = new Map(ult.map((r) => [r.page_id, r]));
  const anterior = new Map(ant.map((r) => [r.page_id, r]));
  const adsPorPagina = new Map();
  for (const a of ads) { if (!adsPorPagina.has(a.page_id)) adsPorPagina.set(a.page_id, []); adsPorPagina.get(a.page_id).push(a); }

  const saida = [];
  for (const p of paginas) {
    if (!JSON.parse(p.paises || '[]').includes(pais)) continue;
    const nichos = JSON.parse(p.nichos || '[]');
    if (nicho && !nichos.includes(nicho)) continue;
    if (busca && !String(p.nome).toLowerCase().includes(busca.toLowerCase())) continue;
    const lista = adsPorPagina.get(p.page_id) || [];
    const h = ultimo.get(p.page_id);
    const ativos = h ? h.ativos : lista.length;
    if (ativos < min) continue;
    const dias = lista.reduce((m, a) => Math.max(m, a.inicio ? Math.floor((agora - a.inicio) / DIA) : 0), 0);
    if (dias < minDias) continue;
    const an = anterior.get(p.page_id);
    const temAnterior = an && an.data !== h?.data;
    const crescimento = temAnterior ? ativos - an.ativos : null;
    const crescimentoPct = temAnterior && an.ativos > 0 ? Math.round((100 * crescimento) / an.ativos) : null;
    const dupMax = lista.reduce((m, a) => Math.max(m, a.dup || 1), 0);
    const dominios = {}, gws = new Set();
    for (const a of lista) {
      if (a.dominio) dominios[a.dominio] = (dominios[a.dominio] || 0) + 1;
      if (a.gateway) gws.add(a.gateway);
    }
    const listaDom = Object.entries(dominios).sort((a, b) => b[1] - a[1]).map(([d]) => d).slice(0, 3);
    let preco = null, produto = null, formatoFunil = null;
    for (const d of listaDom) {
      const x = analises.get(d.split('/')[0]);
      if (!x) continue;
      (x.checkouts || []).forEach((c) => gws.add(c.gateway));
      preco ||= x.checkouts?.[0]?.preco || x.precos?.[0] || null;
      produto ||= x.checkouts?.[0]?.produto || null;
      formatoFunil ||= x.tecnologia?.quiz?.length ? 'Quiz' : x.tecnologia?.vsl?.length ? 'VSL' : 'Página';
    }
    if (!formatoFunil && lista.some((a) => a.gateway)) formatoFunil = 'Direto p/ checkout';
    if (gateway && !gws.has(gateway)) continue;
    const top = lista[0] || {};
    const m = { ativos, dias, dupMax, crescimentoPct };
    if (!h && !lista.length) continue;
    saida.push({
      page_id: p.page_id, pais, nome: p.nome, uri: p.uri, foto: p.foto, curtidas: p.curtidas,
      categorias: p.categorias, nichos, palavras: JSON.parse(p.palavras || '[]'),
      ativos, ativosConfirmado: !!h, dataContagem: h?.data || null,
      crescimento, crescimentoPct, dias, dupMax, criativosNoBanco: lista.length,
      dominios: listaDom, gateways: [...gws].map(nomeGateway), preco, produto, funil: formatoFunil,
      thumb: top.thumb || null, titulo: top.titulo || '', texto: top.texto || '',
      favorito: favs.has(p.page_id),
      score: pontuar(m), status: classificar({ ...m, crescimentoPct: crescimentoPct ?? 0 }),
    });
  }
  return saida.sort((a, b) => b.score - a.score || b.ativos - a.ativos);
}

// Agrupa por site de destino: a mesma oferta costuma rodar em várias páginas (fanpages).
export async function rankingDominios({ pais = 'BR', nicho = '' } = {}) {
  const [paginas, rows, analises, favs] = await Promise.all([
    rankingPaginas({ pais, nicho }),
    all(`SELECT dominio, page_id, MIN(inicio) inicio, MAX(dup) dup, MAX(thumb) thumb, MAX(link) link
         FROM anuncios WHERE ativo = 1 AND pais = ? AND dominio IS NOT NULL GROUP BY dominio, page_id`, [pais]),
    mapaAnalises(),
    favoritosSet('oferta'),
  ]);
  const porPagina = new Map(paginas.map((p) => [p.page_id, p]));
  const mapa = new Map();
  const agora = Date.now() / 1000;
  for (const r of rows) {
    const p = porPagina.get(r.page_id);
    if (!p) continue;
    const d = mapa.get(r.dominio) || { dominio: r.dominio, link: r.link, thumb: r.thumb, paginas: [], ativos: 0, dias: 0, dupMax: 0 };
    d.paginas.push({ page_id: p.page_id, nome: p.nome, ativos: p.ativos });
    d.ativos += p.ativos;
    d.dias = Math.max(d.dias, r.inicio ? Math.floor((agora - r.inicio) / DIA) : 0);
    d.dupMax = Math.max(d.dupMax, r.dup || 1);
    mapa.set(r.dominio, d);
  }
  return [...mapa.values()].map((d) => {
    const an = analises.get(d.dominio.split('/')[0]);
    return {
      ...d, favorito: favs.has(d.dominio),
      gateways: an?.gateways || [], preco: an?.checkouts?.[0]?.preco || an?.precos?.[0] || null,
      produto: an?.checkouts?.[0]?.produto || null, titulo: an?.titulo || null, analisado: !!an,
      funil: an ? (an.tecnologia?.quiz?.length ? 'Quiz' : an.tecnologia?.vsl?.length ? 'VSL' : 'Página') : (/\//.test(d.dominio) ? 'Direto p/ checkout' : null),
      score: pontuar({ ...d, crescimentoPct: 0 }), status: classificar({ ...d, crescimentoPct: 0 }),
    };
  }).sort((a, b) => b.ativos - a.ativos);
}

// "Checkouts mais acessados" de um gateway (equivalente ao Top Pages do Semrush), medido por anúncios ativos.
export async function rankingGateway(id, pais = 'BR') {
  const agora = Date.now() / 1000;
  const [rows, cks, pags, hist, favs, analises, buscas] = await Promise.all([
    all(`SELECT checkout, COUNT(*) anuncios, SUM(dup) variacoes, MIN(inicio) inicio, MAX(thumb) thumb,
           MAX(link) link, GROUP_CONCAT(DISTINCT page_id) paginas FROM anuncios
         WHERE gateway = ? AND pais = ? AND ativo = 1 AND checkout IS NOT NULL GROUP BY checkout ORDER BY SUM(dup) DESC, COUNT(*) DESC LIMIT 200`, [id, pais]),
    all('SELECT * FROM checkouts WHERE gateway = ?', [id]),
    all('SELECT page_id, nome FROM paginas'),
    all(SQL_ULTIMO, ['9999-12-31', pais, pais]),
    favoritosSet('checkout'),
    mapaAnalises(),
    all('SELECT palavra, total, quando FROM buscas WHERE nicho = ? AND pais = ? ORDER BY quando DESC LIMIT 6', ['gateway:' + id, pais]),
  ]);
  const textos = new Map((await all(`SELECT checkout, titulo, SUBSTR(texto, 1, 200) texto, dup FROM anuncios
    WHERE gateway = ? AND pais = ? AND ativo = 1 AND checkout IS NOT NULL ORDER BY dup ASC`, [id, pais])).map((r) => [r.checkout, r]));
  const ck = new Map(cks.map((c) => [c.checkout, c]));
  const nome = new Map(pags.map((p) => [p.page_id, p.nome]));
  const ativos = new Map(hist.map((h) => [h.page_id, h.ativos]));
  const checkouts = rows.map((r) => {
    const c = ck.get(r.checkout) || {};
    const t = textos.get(r.checkout) || {};
    const dias = r.inicio ? Math.floor((agora - r.inicio) / DIA) : 0;
    return {
      checkout: r.checkout, url: c.url || r.link, produto: c.produto || null, preco: c.preco || null,
      disponivel: c.analisado ? !!c.ok : null, anuncios: r.anuncios, variacoes: r.variacoes, dias,
      paginas: String(r.paginas || '').split(',').filter(Boolean)
        .map((pid) => ({ page_id: pid, nome: nome.get(pid) || pid, ativos: ativos.get(pid) ?? null }))
        .sort((a, b) => (b.ativos ?? 0) - (a.ativos ?? 0)),
      thumb: r.thumb, titulo: t.titulo || '', texto: t.texto || '', favorito: favs.has(r.checkout),
      score: pontuar({ ativos: r.variacoes, dias, dupMax: 1, crescimentoPct: 0 }),
    };
  });
  const paginasVendas = [...analises.entries()].map(([dominio, a]) => ({ dominio, ...a }))
    .filter((a) => (a.checkouts || []).some((c) => c.gateway === id))
    .map((a) => {
      const c = a.checkouts.find((x) => x.gateway === id);
      return { dominio: a.dominio, titulo: a.titulo, preco: c?.preco || a.precos?.[0] || null, produto: c?.produto || null,
        imagem: a.imagem, anuncios: a.biblioteca?.total ?? null, paginas: a.biblioteca?.paginas?.length ?? null };
    }).sort((a, b) => (b.anuncios ?? 0) - (a.anuncios ?? 0));
  return { gateway: GATEWAYS.find((g) => g.id === id), checkouts, paginasVendas, buscas };
}

export async function resumoGateways(pais = 'BR') {
  const [stats, totais] = await Promise.all([
    all(`SELECT gateway, COUNT(*) n, COUNT(DISTINCT checkout) c, COUNT(DISTINCT page_id) p
         FROM anuncios WHERE ativo = 1 AND pais = ? AND gateway IS NOT NULL GROUP BY gateway`, [pais]),
    all(`SELECT nicho, MAX(quando) quando, MAX(total) total FROM buscas WHERE nicho LIKE 'gateway:%' AND pais = ? GROUP BY nicho`, [pais]),
  ]);
  const s = new Map(stats.map((r) => [r.gateway, r]));
  return GATEWAYS.map((g) => {
    const x = s.get(g.id) || {};
    const t = totais.find((y) => y.nicho === 'gateway:' + g.id);
    return { id: g.id, nome: g.nome, busca: g.busca, anuncios: x.n || 0, checkouts: x.c || 0, paginas: x.p || 0,
      totalBiblioteca: t?.total ?? null, consultado: t?.quando ?? null };
  }).sort((a, b) => (b.totalBiblioteca ?? -1) - (a.totalBiblioteca ?? -1) || b.anuncios - a.anuncios);
}

export async function detalhePagina(pageId, pais = 'BR') {
  const [ranking, anuncios, historico] = await Promise.all([
    rankingPaginas({ pais }),
    all('SELECT * FROM anuncios WHERE page_id = ? AND pais = ? ORDER BY ativo DESC, dup DESC, inicio ASC LIMIT 60', [pageId, pais]),
    all('SELECT data, ativos FROM historico WHERE page_id = ? AND pais = ? ORDER BY data', [pageId, pais]),
  ]);
  return { pagina: ranking.find((x) => x.page_id === pageId), anuncios, historico };
}

export async function listaAnalises() {
  const rows = await all('SELECT dominio, url, dados, quando FROM analises ORDER BY quando DESC LIMIT 100');
  return rows.map((r) => {
    const d = JSON.parse(r.dados);
    return { dominio: r.dominio, url: r.url, quando: r.quando, titulo: d.titulo, imagem: d.imagem, gateways: d.gateways,
      preco: d.checkouts?.[0]?.preco || d.precos?.[0] || null, anuncios: d.biblioteca?.total ?? null,
      paginas: d.biblioteca?.paginas?.length ?? null, funil: d.tecnologia?.quiz?.length ? 'Quiz' : d.tecnologia?.vsl?.length ? 'VSL' : 'Página' };
  });
}

export async function painelGeral(pais = 'BR') {
  const agora = Math.floor(Date.now() / 1000);
  const [pags, nAds, ult, n7, gws, nAn, nFav] = await Promise.all([
    rankingPaginas({ pais }),
    get('SELECT COUNT(*) n FROM anuncios WHERE ativo = 1 AND pais = ?', [pais]),
    get('SELECT MAX(quando) q FROM buscas WHERE pais = ?', [pais]),
    get('SELECT COUNT(*) n FROM buscas WHERE quando > ? AND pais = ?', [agora - 7 * DIA, pais]),
    resumoGateways(pais),
    get('SELECT COUNT(*) n FROM analises'),
    get('SELECT COUNT(*) n FROM favoritos'),
  ]);
  return {
    paginas: pags.length, anuncios: nAds.n,
    escaladas: pags.filter((p) => ['Escalada forte', 'Escalada'].includes(p.status)).length,
    escalandoAgora: pags.filter((p) => p.status === 'Escalando agora').slice(0, 6),
    top: pags.slice(0, 6),
    novas: pags.filter((p) => p.dias > 0 && p.dias <= 14 && p.ativos >= 10).slice(0, 6),
    ultimaBusca: ult.q, buscas7d: n7.n,
    gateways: gws.filter((g) => g.anuncios > 0).slice(0, 8),
    analises: nAn.n, favoritos: nFav.n, hoje: hoje(),
  };
}

export async function listaFavoritos(pais = 'BR') {
  const [favs, pags] = await Promise.all([all('SELECT * FROM favoritos ORDER BY criado DESC'), rankingPaginas({ pais })]);
  const m = new Map(pags.map((p) => [p.page_id, p]));
  return favs.map((f) => ({ ...f, pagina: f.tipo === 'pagina' ? m.get(f.chave) || null : null }));
}
