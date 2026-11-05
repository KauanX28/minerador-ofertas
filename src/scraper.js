// Coleta anúncios da Biblioteca de Anúncios pública da Meta (facebook.com/ads/library)
// usando um navegador real (Playwright). Não precisa de login nem de API key.
import { chromium } from 'playwright';
import { chaveOferta } from './util.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const BASE = 'https://www.facebook.com/ads/library/';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const aleatorio = (min, max) => min + Math.floor(Math.random() * (max - min));

export class BloqueioError extends Error {}

export async function abrirNavegador({ visivel = false } = {}) {
  const browser = await chromium.launch({ headless: !visivel });
  const ctx = await browser.newContext({
    locale: 'pt-BR',
    userAgent: UA,
    viewport: { width: 1366, height: 900 },
  });
  return { browser, ctx };
}

// Extrai o objeto JSON que vem logo depois de `"search_results_connection":` no HTML.
function extrairConexaoDoHtml(html) {
  const chave = '"search_results_connection":';
  const i = html.indexOf(chave);
  if (i < 0) return null;
  const ini = i + chave.length;
  let prof = 0, emString = false, escape = false;
  for (let j = ini; j < html.length; j++) {
    const c = html[j];
    if (emString) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '"') emString = false;
      continue;
    }
    if (c === '"') emString = true;
    else if (c === '{') prof++;
    else if (c === '}') {
      prof--;
      if (prof === 0) {
        try { return JSON.parse(html.slice(ini, j + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function conexoesDoGraphql(texto) {
  const saida = [];
  for (let linha of texto.split('\n')) {
    linha = linha.trim();
    if (!linha) continue;
    if (linha.startsWith('for (;;);')) linha = linha.slice(9);
    try {
      const d = JSON.parse(linha);
      const c = d?.data?.ad_library_main?.search_results_connection;
      if (c) saida.push(c);
    } catch { /* ignora linhas que não são JSON */ }
  }
  return saida;
}

const dominioDe = chaveOferta;

function normalizar(r) {
  const s = r.snapshot || {};
  const card = (s.cards || [])[0] || {};
  let texto = s.body?.text || '';
  if (!texto || texto.includes('{{')) texto = card.body || texto;
  let titulo = s.title || '';
  if (!titulo || titulo.includes('{{')) titulo = card.title || titulo;
  const link = s.link_url || card.link_url || null;
  const thumb =
    s.videos?.[0]?.video_preview_image_url ||
    s.images?.[0]?.resized_image_url || s.images?.[0]?.original_image_url ||
    card.video_preview_image_url || card.resized_image_url || card.original_image_url || null;
  const video = s.videos?.[0]?.video_sd_url || s.videos?.[0]?.video_hd_url || card.video_sd_url || null;
  return {
    ad_id: String(r.ad_archive_id),
    page_id: String(r.page_id),
    page_name: r.page_name || s.page_name || '',
    ativo: r.is_active ? 1 : 0,
    inicio: r.start_date || null,
    fim: r.end_date || null,
    dup: r.collation_count || 1,
    plataformas: (r.publisher_platform || []).join(','),
    formato: s.display_format || '',
    texto: texto.slice(0, 3000),
    titulo: titulo.slice(0, 300),
    link,
    dominio: dominioDe(link),
    cta: s.cta_text || '',
    thumb,
    video,
    pagina: {
      uri: s.page_profile_uri || null,
      foto: s.page_profile_picture_url || null,
      curtidas: s.page_like_count ?? null,
      categorias: (s.page_categories || []).join(', '),
    },
  };
}

function anunciosDaConexao(con, mapa) {
  for (const e of con?.edges || []) {
    for (const r of e?.node?.collated_results || []) {
      if (!r?.ad_archive_id) continue;
      const a = normalizar(r);
      if (!mapa.has(a.ad_id)) mapa.set(a.ad_id, a);
    }
  }
}

async function abrir(ctx, url, { rolagens = 0, maxAnuncios = Infinity, log = () => {} } = {}) {
  const page = await ctx.newPage();
  const mapa = new Map();
  const pendentes = [];
  page.on('response', (resp) => {
    if (!resp.url().includes('/api/graphql')) return;
    pendentes.push(
      resp.text().then((t) => conexoesDoGraphql(t).forEach((c) => anunciosDaConexao(c, mapa))).catch(() => {})
    );
  });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await espera(aleatorio(3500, 5500));
    if (/login|checkpoint/.test(page.url())) throw new BloqueioError('A Meta pediu login/verificação.');
    const html = await page.content();
    if (html.includes('"xfb_ad_library_is_captcha_required":true')) {
      throw new BloqueioError('A Meta pediu captcha. Rode com --visivel e resolva no navegador, ou espere algumas horas.');
    }
    const con = extrairConexaoDoHtml(html);
    const total = con?.count ?? null;
    anunciosDaConexao(con, mapa);

    let semNovos = 0;
    for (let i = 0; i < rolagens && mapa.size < maxAnuncios; i++) {
      const antes = mapa.size;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.mouse.wheel(0, 4000);
      await espera(aleatorio(2200, 3800));
      await Promise.all(pendentes);
      if (mapa.size === antes) { if (++semNovos >= 3) break; } else semNovos = 0;
      log(`   ... ${mapa.size} anúncios lidos`);
    }
    await Promise.all(pendentes);
    return { total, anuncios: [...mapa.values()] };
  } finally {
    await page.close();
  }
}

// Busca por palavra-chave (só anúncios ativos).
export async function buscarPalavra(ctx, palavra, { pais = 'BR', maxAnuncios = 150, log } = {}) {
  const q = new URLSearchParams({
    active_status: 'active', ad_type: 'all', country: pais, is_targeted_country: 'false',
    media_type: 'all', q: palavra, search_type: 'keyword_unordered',
  });
  return abrir(ctx, `${BASE}?${q}`, { rolagens: Math.ceil(maxAnuncios / 10) + 2, maxAnuncios, log });
}

// Todos os anúncios ativos de uma página (anunciante). `total` = nº de anúncios ativos.
export async function buscarPagina(ctx, pageId, { pais = 'BR', rolagens = 1 } = {}) {
  const q = new URLSearchParams({
    active_status: 'active', ad_type: 'all', country: pais, is_targeted_country: 'false',
    media_type: 'all', search_type: 'page', view_all_page_id: pageId,
  });
  return abrir(ctx, `${BASE}?${q}`, { rolagens });
}

export const pausa = () => espera(aleatorio(2000, 4500));
