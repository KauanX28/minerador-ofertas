// Enriquecimento automático (roda no robô ao fim de cada coleta, sem navegador):
// preço em reais, idioma/hash dos anúncios, links encurtados, tipo de cada anunciante e ofertas agrupadas por checkout.
import { all, get, run, tx, atualizarLote } from './banco.js';
import { agora, lerConfig } from './db.js';
import { classificar, idiomaDe, hashTexto, lerPreco, paraBRL, precoDosTextos } from './classificador.js';
import { cambioHoje } from './cambio.js';
import { chaveOferta, detectarGateway, hostDe, raizDominio } from './util.js';

export const BLOQUEIO_PADRAO = ['betterme', 'yoga-go', 'yogago', 'lessie fitness', 'tori repa', '28 day challenge', 'speediance', 'fitpulley',
  'mercado livre', 'shopee', 'amazon', 'netflix', 'spotify', 'duolingo', 'calm', 'noom', 'headway', 'mimo', 'simple fasting', 'fastic', 'madmuscles'];

const ENCURTADORES = ['bit.ly', 'tinyurl.com', 'cutt.ly', 'encurtador.com.br', 'rebrand.ly', 'ow.ly', 't.co', 'is.gd', 'shorturl.at', 'tiny.cc', 'bl.ink', 'rb.gy', 'linkfly.to', 'wa.link'];

// Preço numérico (reais) de cada checkout.
export async function atualizarPrecos() {
  const cambio = await cambioHoje();
  const lista = await all('SELECT checkout, preco FROM checkouts WHERE preco IS NOT NULL');
  await atualizarLote('checkouts', 'checkout', [['preco_valor', 'real'], ['moeda', 'text'], ['preco_brl', 'real']],
    lista.map((c) => { const p = lerPreco(c.preco); return [c.checkout, p?.valor ?? null, p?.moeda ?? null, paraBRL(p, cambio)]; }));
}

// Idioma e hash de texto dos anúncios que ainda não têm.
export async function marcarAnuncios(limite = 5000) {
  const lista = await all('SELECT ad_id, titulo, texto FROM anuncios WHERE texto_hash IS NULL AND texto IS NOT NULL LIMIT ?', [limite]);
  if (!lista.length) return 0;
  await atualizarLote('anuncios', 'ad_id', [['idioma', 'text'], ['texto_hash', 'text']],
    lista.map((a) => [a.ad_id, idiomaDe(`${a.titulo || ''} ${a.texto || ''}`), hashTexto(a.texto) || 'x']));
  return lista.length;
}

// Segue redirecionamentos de encurtadores (bit.ly etc.) para achar o destino real e o gateway.
export async function desembrulharLinks({ limite = 60, log = () => {} } = {}) {
  const lista = await all(`SELECT ad_id, link FROM anuncios WHERE link_final IS NULL AND link IS NOT NULL AND ativo = 1
    AND (${ENCURTADORES.map(() => 'link LIKE ?').join(' OR ')}) LIMIT ?`, [...ENCURTADORES.map((e) => `%://${e}/%`), limite]);
  let n = 0;
  for (const a of lista) {
    let url = a.link;
    try {
      for (let i = 0; i < 6; i++) {
        const r = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }, signal: AbortSignal.timeout(10000) });
        const prox = r.headers.get('location');
        if (!prox || r.status < 300 || r.status >= 400) break;
        url = new URL(prox, url).toString();
      }
    } catch { /* fica com o último */ }
    const g = detectarGateway(url);
    await run('UPDATE anuncios SET link_final = ?, dominio = ?, gateway = ?, checkout = ? WHERE ad_id = ?', [url, chaveOferta(url), g?.gateway ?? null, g?.checkout ?? null, a.ad_id]);
    n++;
  }
  if (n) log(`  links desembrulhados: ${n}`);
  return n;
}

// Classifica todos os anunciantes (tipo de oferta, idioma predominante).
export async function classificarAnunciantes({ log = () => {} } = {}) {
  const config = await lerConfig();
  const { mapaMarcas, ehPlataforma } = await import('./marcas.js');
  const marcas = await mapaMarcas().catch(() => new Map());
  const bloqueio = config.bloqueio || BLOQUEIO_PADRAO;
  const limiteLow = Number(config.precoMaxLowTicket ?? 97);
  const cambio = await cambioHoje();
  const [paginas, ads, analises, checkouts] = await Promise.all([
    all('SELECT page_id, nome, categorias, curtidas FROM paginas'),
    all('SELECT page_id, titulo, SUBSTR(texto, 1, 600) texto, cta, COALESCE(link_final, link) link, gateway, checkout, dominio, idioma, dup FROM anuncios WHERE ativo = 1'),
    all('SELECT dominio, dados FROM analises'),
    all('SELECT checkout, preco_brl FROM checkouts WHERE preco_brl IS NOT NULL'),
  ]);
  const porPagina = new Map();
  for (const a of ads) { if (!porPagina.has(a.page_id)) porPagina.set(a.page_id, []); porPagina.get(a.page_id).push(a); }
  // Análise por domínio e pelo domínio principal (bio.loja.com e pilates.loja.com são o mesmo produtor).
  const mapaAn = new Map();
  for (const r of analises) { const d = JSON.parse(r.dados); mapaAn.set(r.dominio, d); if (!mapaAn.has(raizDominio(r.dominio))) mapaAn.set(raizDominio(r.dominio), d); }
  const precoCk = new Map(checkouts.map((c) => [c.checkout, c.preco_brl]));
  // Quantas páginas diferentes anunciam cada site (marcas costumam ter várias páginas no mesmo site, sem checkout).
  const paginasPorRaiz = new Map();
  for (const a of ads) { if (!a.dominio) continue; const h = a.dominio.split('/')[0]; if (ehPlataforma(h)) continue; const r = raizDominio(h); if (!paginasPorRaiz.has(r)) paginasPorRaiz.set(r, new Set()); paginasPorRaiz.get(r).add(a.page_id); }
  const t = agora();
  const cont = {};
  const atualizacoes = [];
  for (const p of paginas) {
    const lista = porPagina.get(p.page_id) || [];
    if (!lista.length) continue;
    const doms = {};
    for (const a of lista) if (a.dominio) doms[a.dominio.split('/')[0]] = (doms[a.dominio.split('/')[0]] || 0) + 1;
    const dom = Object.entries(doms).sort((a, b) => b[1] - a[1])[0]?.[0];
    const analise = dom ? mapaAn.get(dom) || mapaAn.get(raizDominio(dom)) : null;
    const cks = lista.map((a) => a.checkout).filter(Boolean);
    const precoBrl = cks.map((c) => precoCk.get(c)).find((v) => v != null)
      ?? (analise?.checkouts || []).map((c) => precoCk.get(c.checkout)).find((v) => v != null)
      ?? precoDosTextos(lista.map((a) => a.texto), cambio);
    const raiz = dom && !ehPlataforma(dom) ? raizDominio(dom) : null;
    const r = classificar({ nome: p.nome, categorias: p.categorias, curtidas: p.curtidas, anuncios: lista, analise, precoBrl, bloqueio, limiteLow,
      marca: raiz ? marcas.get(raiz) : null, paginasNoSite: raiz ? paginasPorRaiz.get(raiz)?.size || 1 : 1 });
    const idiomas = {};
    for (const a of lista) if (a.idioma) idiomas[a.idioma] = (idiomas[a.idioma] || 0) + 1;
    const idioma = Object.entries(idiomas).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    atualizacoes.push([p.page_id, r.tipo, r.motivo, idioma, t]);
    cont[r.tipo] = (cont[r.tipo] || 0) + 1;
  }
  await atualizarLote('paginas', 'page_id', [['tipo', 'text'], ['tipo_motivo', 'text'], ['idioma', 'text'], ['classificado', 'bigint']], atualizacoes);
  log(`  classificação: ${Object.entries(cont).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  return cont;
}

// "Oferta" = checkout (ou domínio, ou página): várias páginas e domínios no mesmo checkout viram uma oferta só.
export async function montarOfertas({ log = () => {} } = {}) {
  const [paginas, ads, analises, cks, hist] = await Promise.all([
    all('SELECT page_id, nome, tipo, idioma FROM paginas'),
    all(`SELECT page_id, pais, checkout, gateway, dominio, inicio, dup,
      CASE WHEN thumb_arquivo IS NOT NULL THEN '/api/midia/' || ad_id ELSE thumb END AS thumb FROM anuncios WHERE ativo = 1`),
    all('SELECT dominio, dados FROM analises'),
    all('SELECT checkout, gateway, produto, preco, preco_brl FROM checkouts'),
    all(`SELECT h.page_id, h.pais, h.ativos FROM historico_diario h JOIN (SELECT page_id, pais, MAX(data) d FROM historico_diario GROUP BY page_id, pais) m
      ON m.page_id = h.page_id AND m.pais = h.pais AND m.d = h.data`),
  ]);
  const pag = new Map(paginas.map((p) => [p.page_id, p]));
  const ck = new Map(cks.map((c) => [c.checkout, c]));
  const ativos = new Map(hist.map((h) => [h.page_id + '|' + h.pais, h.ativos]));
  const anCheckout = new Map();
  for (const r of analises) { const d = JSON.parse(r.dados); if (d.checkouts?.[0]) anCheckout.set(r.dominio, d.checkouts[0]); }

  // Chave de cada página em cada país: checkout mais anunciado > checkout do site analisado > domínio > página.
  const grupos = new Map();
  const porPaginaPais = new Map();
  for (const a of ads) {
    const k = a.page_id + '|' + a.pais;
    if (!porPaginaPais.has(k)) porPaginaPais.set(k, []);
    porPaginaPais.get(k).push(a);
  }
  for (const [k, lista] of porPaginaPais) {
    const [pageId, pais] = k.split('|');
    const conta = (f) => { const c = {}; for (const a of lista) { const v = f(a); if (v) c[v] = (c[v] || 0) + (a.dup || 1); } return Object.entries(c).sort((x, y) => y[1] - x[1])[0]?.[0]; };
    const checkoutAd = conta((a) => a.checkout);
    const dominio = conta((a) => (a.dominio && !detectarGateway('https://' + a.dominio) ? a.dominio.split('/')[0] : null));
    const checkoutSite = dominio ? anCheckout.get(dominio)?.checkout : null;
    const chave = checkoutAd ? `ck:${checkoutAd}` : checkoutSite ? `ck:${checkoutSite}` : dominio ? `dom:${dominio}` : `pag:${pageId}`;
    const gk = pais + ':' + chave;
    if (!grupos.has(gk)) grupos.set(gk, { chave: gk, tipo_chave: chave.split(':')[0], pais, checkout: chave.startsWith('ck:') ? chave.slice(3) : null, membros: [], ads: [] });
    const g = grupos.get(gk);
    g.membros.push({ page_id: pageId, dominio });
    g.ads.push(...lista);
  }
  const linhas = [];
  for (const g of grupos.values()) {
    const c = g.checkout ? ck.get(g.checkout) : null;
    const tipos = {}, idiomas = {};
    for (const m of g.membros) { const p = pag.get(m.page_id); if (p?.tipo) tipos[p.tipo] = (tipos[p.tipo] || 0) + 1; if (p?.idioma) idiomas[p.idioma] = (idiomas[p.idioma] || 0) + 1; }
    const maior = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const thumb = g.ads.sort((a, b) => (b.dup || 1) - (a.dup || 1)).find((a) => a.thumb)?.thumb || null;
    linhas.push({
      g, valores: [g.chave, g.tipo_chave, g.pais, c?.gateway || g.ads.find((a) => a.gateway)?.gateway || null, c?.produto || null, c?.preco || null, c?.preco_brl ?? null,
        maior(tipos), maior(idiomas), g.membros.length, JSON.stringify([...new Set(g.membros.map((m) => m.dominio).filter(Boolean))].slice(0, 10)),
        g.ads.length, g.membros.reduce((s, m) => s + (ativos.get(m.page_id + '|' + g.pais) || 0), 0),
        Math.min(...g.ads.map((a) => a.inicio || Infinity).filter(Number.isFinite)) || null, thumb, agora()],
    });
  }
  // Reconstrói tudo numa transação, com inserções em lote (na nuvem, uma por linha levava minutos).
  const COLS = ['chave', 'tipo_chave', 'pais', 'gateway', 'produto', 'preco', 'preco_brl', 'tipo', 'idioma', 'paginas', 'dominios', 'anuncios', 'ativos_paginas', 'inicio', 'thumb', 'atualizado'];
  const marcas = (n, k) => Array.from({ length: n }, () => '(' + Array(k).fill('?').join(', ') + ')').join(', ');
  await tx(async (db) => {
    await db.run('DELETE FROM oferta_membros');
    await db.run('DELETE FROM ofertas');
    const ids = new Map();
    for (let i = 0; i < linhas.length; i += 200) {
      const lote = linhas.slice(i, i + 200);
      const r = await db.all(`INSERT INTO ofertas (${COLS.join(', ')}) VALUES ${marcas(lote.length, COLS.length)} RETURNING id, chave`,
        lote.flatMap((l) => l.valores.map((v) => (v === Infinity ? null : v))));
      for (const x of r) ids.set(x.chave, x.id);
    }
    const membros = linhas.flatMap((l) => l.g.membros.map((m) => [ids.get(l.g.chave), m.page_id, m.dominio ?? null]));
    for (let i = 0; i < membros.length; i += 400) {
      const lote = membros.slice(i, i + 400);
      await db.run(`INSERT INTO oferta_membros (oferta_id, page_id, dominio) VALUES ${marcas(lote.length, 3)} ON CONFLICT DO NOTHING`, lote.flat());
    }
  });
  const multi = linhas.filter((l) => l.g.membros.length > 1).length;
  log(`  ofertas: ${linhas.length} (${multi} com mais de uma página no mesmo checkout/site)`);
  return linhas.length;
}

// Tudo o que roda sem navegador, na ordem certa.
export async function enriquecerTudo({ log = () => {}, limiteMarcas = 250, temTempo } = {}) {
  await atualizarPrecos();
  if (limiteMarcas) { const { verificarMarcas } = await import('./marcas.js'); await verificarMarcas({ limite: limiteMarcas, log, temTempo }).catch((e) => log(`  marcas: ${e.message}`)); }
  const n = await marcarAnuncios();
  if (n) log(`  idioma/hash de texto: ${n} anúncios`);
  await desembrulharLinks({ log });
  await classificarAnunciantes({ log });
  await montarOfertas({ log });
}

export const resumoTipos = () => all('SELECT tipo, COUNT(*) n FROM paginas GROUP BY tipo ORDER BY n DESC');
export { hostDe, get };
