// Pontuação de "escala". Mesma lógica que Minera ROI/SpyROI usam: muitos anúncios ativos,
// rodando há muito tempo, com o mesmo criativo duplicado e crescendo entre varreduras.
import { all, get, hoje } from './db.js';
import { GATEWAYS } from './util.js';
import { uid } from './contexto.js';
import { precoDosTextos } from './classificador.js';

const DIA = 86400;
const clamp = (x) => Math.max(0, Math.min(1, x));
const nomeGateway = (id) => GATEWAYS.find((g) => g.id === id)?.nome || id;
const diasAtras = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

// ---------- Score v2 (Fase 2) ----------
// O que mais indica uma oferta escalando não é o total de anúncios, e sim o ritmo: quantos anúncios entram por semana,
// se a contagem sobe, se o criativo campeão está há semanas no ar e se o produtor já abriu várias contas no mesmo checkout.
export const PESOS = { velocidade: 25, volume: 15, contas: 15, novos: 15, consistencia: 15, campeao: 15 };
const pct = (v, total) => (v == null || total - v <= 0 ? null : v / (total - v)); // variação relativa ao valor anterior

// Recebe as métricas do anunciante e devolve nota (0–100), status, oportunidade de modelagem e a explicação de cada fator.
export function avaliar({ ativos = 0, dias = 0, dupMax = 1, crescimentoPct = null, var7 = null, var14 = null, var30 = null,
  contasCheckout = 1, contasMesmoCriativo = 1, novos7 = null, diasConsistentes = null, idadeCampeao = null } = {}) {
  const g7 = pct(var7, ativos), g14 = pct(var14, ativos), g30 = pct(var30, ativos);
  const gAnt = crescimentoPct == null ? null : crescimentoPct / 100;
  const temHistorico = [g7, g14, g30, gAnt].some((x) => x != null);
  // 50% em 7 dias, 80% em 14 ou dobrar em 30 já é velocidade máxima.
  const vel = temHistorico ? clamp(Math.max(g7 == null ? -1 : g7 / 0.5, g14 == null ? -1 : g14 / 0.8, g30 == null ? -1 : g30 / 1, gAnt == null ? -1 : gAnt / 0.5)) : 0;
  const fatores = [
    { chave: 'velocidade', nome: 'Velocidade', nota: vel,
      detalhe: !temHistorico ? 'só uma contagem até agora; aparece a partir da próxima recontagem'
        : [var7 != null && `${var7 >= 0 ? '+' : ''}${var7} em 7 dias`, var14 != null && `${var14 >= 0 ? '+' : ''}${var14} em 14`, var30 != null && `${var30 >= 0 ? '+' : ''}${var30} em 30`,
          var7 == null && var14 == null && var30 == null && gAnt != null && `${crescimentoPct >= 0 ? '+' : ''}${crescimentoPct}% desde a contagem anterior`].filter(Boolean).join(' · ') },
    { chave: 'volume', nome: 'Anúncios ativos', nota: clamp(Math.log10(ativos + 1) / Math.log10(101)), detalhe: `${ativos} anúncios ativos (100+ é nota máxima)` },
    { chave: 'contas', nome: 'Contas no mesmo checkout', nota: clamp(Math.log2(Math.max(1, contasCheckout)) / Math.log2(6)),
      detalhe: contasCheckout > 1 ? `${contasCheckout} páginas vendem o mesmo checkout/site` : 'uma página só vendendo este checkout' },
    { chave: 'novos', nome: 'Criativos novos na semana', nota: novos7 == null ? 0 : clamp(novos7 / 10), detalhe: novos7 == null ? 'sem dados' : `${novos7} anúncios começaram nos últimos 7 dias` },
    { chave: 'consistencia', nome: 'Consistência', nota: diasConsistentes != null ? clamp(diasConsistentes / 21) : clamp(dias / 45) * 0.7,
      detalhe: diasConsistentes != null ? `${diasConsistentes} dias seguidos com 10+ anúncios ativos` : `anúncio mais antigo ainda ativo há ${dias} dias` },
    { chave: 'campeao', nome: 'Criativo campeão', nota: clamp(Math.log2(dupMax + 1) / Math.log2(21)) * (idadeCampeao == null ? 0.6 : 0.4 + 0.6 * clamp(idadeCampeao / 30)),
      detalhe: `criativo mais duplicado em ${dupMax} anúncio${dupMax > 1 ? 's' : ''}${idadeCampeao != null ? `, no ar há ${idadeCampeao} dias` : ''}` },
  ];
  for (const f of fatores) { f.peso = PESOS[f.chave]; f.pontos = Math.round(f.nota * f.peso * 10) / 10; }
  const score = Math.round(fatores.reduce((t, f) => t + f.nota * f.peso, 0));

  const caindo = (g7 != null && g7 <= -0.3) || (g14 != null && g14 <= -0.4) || (!g7 && !g14 && gAnt != null && gAnt <= -0.3 && ativos < 50);
  const acelerando = (g7 != null && g7 >= 0.3) || (g14 != null && g14 >= 0.5) || (gAnt != null && gAnt >= 0.5);
  let status;
  if (caindo && ativos >= 3) status = 'Saturando/caindo';
  else if (dias <= 7 && ativos >= 8 && (acelerando || (novos7 ?? 0) >= 5)) status = 'Nova acelerando';
  else if (ativos >= 50) status = 'Escalada forte';
  else if (acelerando && ativos >= 10) status = 'Escalando agora';
  else if (ativos >= 20 && dias >= 21) status = 'Escalada';
  else if (ativos >= 8) status = 'Validando';
  else status = 'Teste';

  // Oportunidade de modelagem: escalada, mas com poucas contas de fora usando o mesmo criativo/estrutura.
  const concorrentes = Math.max(0, contasMesmoCriativo - contasCheckout);
  const fatorConc = Math.max(0.2, 1 - 0.15 * concorrentes);
  const oportunidade = Math.round(score * fatorConc * (status === 'Saturando/caindo' ? 0.5 : 1));
  const motivoOport = status === 'Saturando/caindo' ? 'oferta caindo: metade da nota'
    : concorrentes ? `${concorrentes} outra${concorrentes > 1 ? 's' : ''} conta${concorrentes > 1 ? 's' : ''} já usa${concorrentes > 1 ? 'm' : ''} o mesmo criativo`
      : 'ninguém mais usa o mesmo criativo';
  return { score, status, oportunidade, motivoOport, fatores };
}

// Compatibilidade: telas que só têm números agregados (sites, checkouts).
export const pontuar = (m) => avaliar(m).score;
export const classificar = (m) => avaliar(m).status;

// Dias seguidos (a partir da contagem mais recente) com pelo menos `limiar` anúncios ativos.
function diasSeguidos(serie, limiar = 10) {
  if (!serie?.length || serie.length < 2) return null;
  let inicio = null;
  for (let i = serie.length - 1; i >= 0; i--) { if (serie[i].ativos >= limiar) inicio = serie[i].data; else break; }
  if (!inicio) return 0;
  return Math.round((Date.parse(serie.at(-1).data) - Date.parse(inicio)) / 864e5) + 1;
}

async function favoritosSet(tipo) {
  return new Set((await all('SELECT chave FROM favoritos WHERE tipo = ? AND user_id = ?', [tipo, uid()])).map((r) => r.chave));
}

async function mapaAnalises() {
  const m = new Map();
  for (const r of await all('SELECT dominio, dados FROM analises')) m.set(r.dominio, JSON.parse(r.dados));
  return m;
}

// Última contagem de cada página NAQUELE país (até uma data).
const SQL_ULTIMO = `SELECT h.page_id, h.ativos, h.data FROM historico_diario h
  JOIN (SELECT page_id, MAX(data) d FROM historico_diario WHERE data <= ? AND pais = ? GROUP BY page_id) m
    ON m.page_id = h.page_id AND m.d = h.data WHERE h.pais = ?`;

// Países que já têm dados (para as abas do painel).
export async function paisesComDados() {
  return all(`SELECT pais, COUNT(DISTINCT page_id) paginas, COUNT(*) anuncios FROM anuncios
    WHERE ativo = 1 AND pais IS NOT NULL GROUP BY pais ORDER BY COUNT(DISTINCT page_id) DESC`);
}

// Carrega tudo de uma vez (poucas consultas) e calcula em memória.
// Filtros da Fase 1: tipo de oferta (padrão: só low ticket), preço máximo em reais, idioma e anunciantes bloqueados.
export async function rankingPaginas({ pais = 'BR', nicho = '', min = 0, busca = '', minDias = 0, gateway = '', tipo = '', precoMax = 0, semPreco = true, idioma = '' } = {}) {
  const agora = Date.now() / 1000;
  const [paginas, ult, ant, ads, analises, favs, hist30, cks, mesmoCriativo, mesmoTexto, contasOferta] = await Promise.all([
    all('SELECT * FROM paginas'),
    all(SQL_ULTIMO, ['9999-12-31', pais, pais]),
    all(SQL_ULTIMO, [diasAtras(5), pais, pais]),
    all(`SELECT page_id, inicio, dup, dominio, gateway, checkout, phash, texto_hash, CASE WHEN thumb_arquivo IS NOT NULL THEN '/api/midia/' || ad_id ELSE thumb END AS thumb, titulo, SUBSTR(texto, 1, 220) texto, formato
         FROM anuncios WHERE ativo = 1 AND pais = ? ORDER BY dup DESC, inicio ASC`, [pais]),
    mapaAnalises(),
    favoritosSet('pagina'),
    all('SELECT page_id, data, ativos FROM historico_diario WHERE pais = ? AND data >= ? ORDER BY data', [pais, diasAtras(31)]),
    all('SELECT checkout, preco_brl, produto, preco FROM checkouts'),
    all(`SELECT phash, COUNT(DISTINCT page_id) n FROM anuncios WHERE ativo = 1 AND pais = ? AND phash IS NOT NULL GROUP BY phash HAVING COUNT(DISTINCT page_id) > 1`, [pais]),
    all(`SELECT texto_hash, COUNT(DISTINCT page_id) n FROM anuncios WHERE ativo = 1 AND pais = ? AND texto_hash IS NOT NULL AND texto_hash <> 'x' GROUP BY texto_hash HAVING COUNT(DISTINCT page_id) > 1`, [pais]),
    all('SELECT m.page_id, MAX(o.paginas) n, MAX(o.id) oferta_id FROM oferta_membros m JOIN ofertas o ON o.id = m.oferta_id WHERE o.pais = ? GROUP BY m.page_id', [pais]),
  ]);
  // Criativos que já rodam no Brasil: oferta gringa "sem equivalente" é a que não tem nenhum deles.
  const phashBR = pais === 'BR' ? new Set() : new Set((await all("SELECT DISTINCT phash FROM anuncios WHERE ativo = 1 AND pais = 'BR' AND phash IS NOT NULL AND phash <> '-'")).map((r) => r.phash));
  const contasCk = new Map(contasOferta.map((r) => [r.page_id, r]));
  const ultimo = new Map(ult.map((r) => [r.page_id, r]));
  const serie = new Map();
  for (const h of hist30) { if (!serie.has(h.page_id)) serie.set(h.page_id, []); serie.get(h.page_id).push(h); }
  const ckMap = new Map(cks.map((c) => [c.checkout, c]));
  const phashContas = new Map(mesmoCriativo.map((r) => [r.phash, r.n]));
  const textoContas = new Map(mesmoTexto.map((r) => [r.texto_hash, r.n]));
  // Variação: contagem de hoje menos a contagem mais recente com pelo menos N dias.
  const variacao = (pid, atual, n) => {
    const corte = diasAtras(n);
    const ant = (serie.get(pid) || []).filter((h) => h.data <= corte).at(-1);
    return ant ? atual - ant.ativos : null;
  };
  const anterior = new Map(ant.map((r) => [r.page_id, r]));
  const adsPorPagina = new Map();
  for (const a of ads) { if (!adsPorPagina.has(a.page_id)) adsPorPagina.set(a.page_id, []); adsPorPagina.get(a.page_id).push(a); }

  const saida = [];
  for (const p of paginas) {
    if (!JSON.parse(p.paises || '[]').includes(pais)) continue;
    const nichos = JSON.parse(p.nichos || '[]');
    if (nicho && !nichos.includes(nicho)) continue;
    if (busca && !String(p.nome).toLowerCase().includes(busca.toLowerCase())) continue;
    if (tipo && (p.tipo || 'indefinido') !== tipo) continue;
    if (idioma && p.idioma && p.idioma !== idioma) continue;
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
    let preco = null, produto = null, formatoFunil = null, precoBrl = null;
    for (const a of lista) {
      const c = a.checkout && ckMap.get(a.checkout);
      if (c && precoBrl == null && c.preco_brl != null) { precoBrl = c.preco_brl; preco = c.preco; produto = c.produto; }
    }
    for (const d of listaDom) {
      const x = analises.get(d.split('/')[0]);
      if (!x) continue;
      (x.checkouts || []).forEach((c) => { gws.add(c.gateway); const k = ckMap.get(c.checkout); if (precoBrl == null && k?.preco_brl != null) { precoBrl = k.preco_brl; preco = k.preco; produto = k.produto; } });
      preco ||= x.checkouts?.[0]?.preco || x.precos?.[0] || null;
      produto ||= x.checkouts?.[0]?.produto || null;
      formatoFunil ||= x.tecnologia?.quiz?.length ? 'Quiz' : x.tecnologia?.vsl?.length ? 'VSL' : 'Página';
    }
    if (!formatoFunil && lista.some((a) => a.gateway)) formatoFunil = 'Direto p/ checkout';
    if (gateway && !gws.has(gateway)) continue;
    let precoOrigem = precoBrl != null ? 'checkout' : null;
    if (precoBrl == null) { precoBrl = precoDosTextos(lista.map((a) => a.texto)); if (precoBrl != null) { precoOrigem = 'anúncio'; preco = 'R$ ' + precoBrl.toFixed(2).replace('.', ','); } }
    if (precoMax && (precoBrl == null ? !semPreco : precoBrl > precoMax)) continue;
    const contasMesmoCriativo = lista.reduce((m, a) => Math.max(m, (a.phash && phashContas.get(a.phash)) || 1, (a.texto_hash && textoContas.get(a.texto_hash)) || 1), 1);
    const top = lista[0] || {};
    if (!h && !lista.length) continue;
    const var7 = variacao(p.page_id, ativos, 7), var14 = variacao(p.page_id, ativos, 14), var30 = variacao(p.page_id, ativos, 30);
    const novos7 = lista.filter((a) => a.inicio && agora - a.inicio <= 7 * DIA).length;
    const idadeCampeao = top.inicio ? Math.floor((agora - top.inicio) / DIA) : null;
    const contasCheckout = Number(contasCk.get(p.page_id)?.n || 1);
    const formatos = {};
    for (const a of lista) if (a.formato) formatos[a.formato] = (formatos[a.formato] || 0) + 1;
    const an0 = listaDom.map((d) => analises.get(d.split('/')[0])).find(Boolean);
    const textoTodo = `${p.nome} ${lista.slice(0, 30).map((a) => `${a.titulo || ''} ${a.texto || ''}`).join(' ')}`;
    const av = avaliar({ ativos, dias, dupMax, crescimentoPct, var7, var14, var30, contasCheckout, contasMesmoCriativo,
      novos7, diasConsistentes: diasSeguidos(serie.get(p.page_id)), idadeCampeao });
    saida.push({
      page_id: p.page_id, pais, nome: p.nome, uri: p.uri, foto: p.foto, curtidas: p.curtidas,
      categorias: p.categorias, nichos, palavras: JSON.parse(p.palavras || '[]'),
      ativos, ativosConfirmado: !!h, dataContagem: h?.data || null,
      crescimento, crescimentoPct, dias, dupMax, criativosNoBanco: lista.length,
      dominios: listaDom, gateways: [...gws].map(nomeGateway), preco, precoBrl, precoOrigem, produto, funil: formatoFunil,
      tipo: p.tipo || 'indefinido', tipoMotivo: p.tipo_motivo || '', idioma: p.idioma || null, contasMesmoCriativo,
      var7, var14, var30, novos7, contasCheckout, ofertaId: contasCk.get(p.page_id)?.oferta_id || null,
      serie: (serie.get(p.page_id) || []).map((x) => [x.data, x.ativos]),
      formato: Object.entries(formatos).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      temVsl: !!an0?.tecnologia?.vsl?.length, temQuiz: !!an0?.tecnologia?.quiz?.length,
      checkoutConhecido: gws.size > 0 || precoOrigem === 'checkout',
      plr: /\bplr\b|direitos? de revenda|licen[cç]a de revenda|revenda e lucre|private label/i.test(textoTodo),
      semEquivalenteBR: pais !== 'BR' && !JSON.parse(p.paises || '[]').includes('BR') && !lista.some((a) => a.phash && phashBR.has(a.phash)),
      thumb: top.thumb || null, titulo: top.titulo || '', texto: top.texto || '',
      favorito: favs.has(p.page_id),
      score: av.score, status: av.status, oportunidade: av.oportunidade, motivoOport: av.motivoOport, fatores: av.fatores,
    });
  }
  return saida.sort((a, b) => b.score - a.score || b.ativos - a.ativos);
}

// Agrupa por site de destino: a mesma oferta costuma rodar em várias páginas (fanpages).
export async function rankingDominios({ pais = 'BR', nicho = '' } = {}) {
  const [paginas, rows, analises, favs] = await Promise.all([
    rankingPaginas({ pais, nicho }),
    all(`SELECT dominio, page_id, MIN(inicio) inicio, MAX(dup) dup, MAX(CASE WHEN thumb_arquivo IS NOT NULL THEN '/api/midia/' || ad_id ELSE thumb END) thumb, MAX(link) link
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
    const d = mapa.get(r.dominio) || { dominio: r.dominio, link: r.link, thumb: r.thumb, paginas: [], ativos: 0, dias: 0, dupMax: 0, melhor: null };
    d.paginas.push({ page_id: p.page_id, nome: p.nome, ativos: p.ativos });
    if (!d.melhor || p.score > d.melhor.score) d.melhor = p;
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
      score: d.melhor?.score ?? pontuar(d), status: d.melhor?.status ?? classificar(d), oportunidade: d.melhor?.oportunidade ?? null, melhor: undefined,
    };
  }).sort((a, b) => b.ativos - a.ativos);
}

// "Checkouts mais acessados" de um gateway (equivalente ao Top Pages do Semrush), medido por anúncios ativos.
export async function rankingGateway(id, pais = 'BR') {
  const agora = Date.now() / 1000;
  const [rows, cks, pags, hist, favs, analises, buscas] = await Promise.all([
    all(`SELECT checkout, COUNT(*) anuncios, SUM(dup) variacoes, MAX(dup) dupmax, MIN(inicio) inicio, MAX(CASE WHEN thumb_arquivo IS NOT NULL THEN '/api/midia/' || ad_id ELSE thumb END) thumb,
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
      score: pontuar({ ativos: r.variacoes, dias, dupMax: r.dupmax || 1, contasCheckout: String(r.paginas || '').split(',').filter(Boolean).length }),
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
    all('SELECT data, ativos FROM historico_diario WHERE page_id = ? AND pais = ? ORDER BY data', [pageId, pais]),
  ]);
  for (const a of anuncios) if (a.thumb_arquivo) a.thumb = `/api/midia/${a.ad_id}`;
  const pagina = ranking.find((x) => x.page_id === pageId) || null;
  // Página da oferta: grupo (outras páginas no mesmo checkout/site), análise do site principal e checkouts com preço.
  const grupo = pagina?.ofertaId ? await all(`SELECT m.page_id, p.nome, p.foto, m.dominio FROM oferta_membros m JOIN paginas p ON p.page_id = m.page_id
    WHERE m.oferta_id = ? AND m.page_id <> ?`, [pagina.ofertaId, pageId]) : [];
  const dominio = pagina?.dominios?.[0]?.split('/')[0];
  const analiseRow = dominio ? await get('SELECT dados, quando FROM analises WHERE dominio = ?', [dominio]) : null;
  const analise = analiseRow ? { ...JSON.parse(analiseRow.dados), quando: analiseRow.quando } : null;
  const cks = [...new Set([...anuncios.map((a) => a.checkout), ...(analise?.checkouts || []).map((c) => c.checkout)].filter(Boolean))];
  const checkouts = cks.length ? await all(`SELECT checkout, gateway, url, produto, preco, preco_brl, ok, analisado FROM checkouts WHERE checkout IN (${cks.map(() => '?').join(', ')})`, cks) : [];
  const nomes = new Map(ranking.map((x) => [x.page_id, x]));
  return { pagina, anuncios, historico, grupo: grupo.map((g) => ({ ...g, ativos: nomes.get(g.page_id)?.ativos ?? null, score: nomes.get(g.page_id)?.score ?? null })), analise, checkouts };
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
    rankingPaginas({ pais, tipo: 'low' }), // a tela inicial mostra só low ticket
    get('SELECT COUNT(*) n FROM anuncios WHERE ativo = 1 AND pais = ?', [pais]),
    get('SELECT MAX(quando) q FROM buscas WHERE pais = ?', [pais]),
    get('SELECT COUNT(*) n FROM buscas WHERE quando > ? AND pais = ?', [agora - 7 * DIA, pais]),
    resumoGateways(pais),
    get('SELECT COUNT(*) n FROM analises'),
    get('SELECT COUNT(*) n FROM favoritos WHERE user_id = ?', [uid()]),
  ]);
  return {
    paginas: pags.length, anuncios: nAds.n,
    escaladas: pags.filter((p) => ['Escalada forte', 'Escalada'].includes(p.status)).length,
    escalandoAgora: pags.filter((p) => ['Nova acelerando', 'Escalando agora'].includes(p.status)).slice(0, 6),
    top: pags.slice(0, 6),
    novas: pags.filter((p) => p.dias > 0 && p.dias <= 14 && p.ativos >= 10).sort((a, b) => (b.status === 'Nova acelerando') - (a.status === 'Nova acelerando')).slice(0, 6),
    oportunidades: [...pags].filter((p) => p.status !== 'Teste').sort((a, b) => b.oportunidade - a.oportunidade).slice(0, 6),
    ultimaBusca: ult.q, buscas7d: n7.n,
    gateways: gws.filter((g) => g.anuncios > 0).slice(0, 8),
    analises: nAn.n, favoritos: nFav.n, hoje: hoje(),
  };
}

export async function listaFavoritos(pais = 'BR') {
  const [favs, pags] = await Promise.all([all('SELECT * FROM favoritos WHERE user_id = ? ORDER BY criado DESC', [uid()]), rankingPaginas({ pais })]);
  const m = new Map(pags.map((p) => [p.page_id, p]));
  // Criativos salvos (biblioteca de referências) vêm com os dados do anúncio.
  const ids = favs.filter((f) => f.tipo === 'criativo').map((f) => f.chave);
  const ads = ids.length ? await all(`SELECT ad_id, page_id, page_name, ativo, inicio, dup, formato, SUBSTR(texto, 1, 600) texto, titulo, link, cta, gateway, video,
    CASE WHEN thumb_arquivo IS NOT NULL THEN '/api/midia/' || ad_id ELSE thumb END AS thumb FROM anuncios WHERE ad_id IN (${ids.map(() => '?').join(', ')})`, ids) : [];
  const porAd = new Map(ads.map((a) => [a.ad_id, a]));
  return favs.map((f) => ({ ...f, pagina: f.tipo === 'pagina' ? m.get(f.chave) || null : null, anuncio: f.tipo === 'criativo' ? porAd.get(f.chave) || null : null }));
}
