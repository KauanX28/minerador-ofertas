// Raio-X de uma página de vendas / quiz / checkout, seguindo o checklist dos vídeos de mineração:
// gateway e link de checkout, preço, player de VSL, quiz, rastreadores, construtor da página e sitemap.xml.
import { detectarGateway, hostDe, GATEWAYS } from './util.js';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const ASSINATURAS = {
  vsl: [
    ['VTurb / ConverteAI', /converteai\.net|vturb/i], ['Panda Video', /pandavideo/i], ['YouTube', /youtube\.com\/embed|youtu\.be/i],
    ['Vimeo', /player\.vimeo/i], ['Wistia', /wistia/i], ['SmartPlayer', /smartplayer/i], ['Vídeo próprio (mp4)', /<video[^>]+src=|\.mp4/i],
  ],
  quiz: [
    ['Cakto Quiz', /quiz\.cakto/i], ['InLead', /inlead/i], ['xQuiz', /xquiz/i], ['Typebot', /typebot/i],
    ['BK Funnels', /bkfunnel/i], ['Quiz (genérico)', /quiz|pergunta\s*\d+\s*de\s*\d+/i],
  ],
  rastreio: [
    ['Pixel Meta', /fbq\(|connect\.facebook\.net/i], ['UTMify', /utmify/i], ['Google Tag', /googletagmanager|gtag\(/i],
    ['TikTok Pixel', /analytics\.tiktok\.com/i], ['Microsoft Clarity', /clarity\.ms/i], ['Hotjar', /hotjar/i],
    ['Cloaker TWR', /twr\.|whiterabbit/i],
  ],
  construtor: [
    ['Lovable', /lovable/i], ['WordPress', /wp-content/i], ['Elementor', /elementor/i], ['Framer', /framer/i],
    ['Webflow', /webflow/i], ['GreatPages', /greatpages/i], ['Hotmart Pages', /hotmart.*pages|klickpages/i],
    ['Wix', /wix\.com|wixstatic/i], ['Next.js/Vercel', /_next\/|vercel/i], ['Atomicat', /atomicat/i],
  ],
};

// Preços em reais, dólares e euros (R$ 19,90 · US$ 7 · $27.00 · € 9,90).
const RX_PRECO = /(?:R\$|US\$|\$|€)\s?\d{1,4}(?:[.,]\d{3})*(?:[.,]\d{2})?/g;

// Ignora parcelas ("12x de R$ 5,44"), valores riscados de âncora ("de R$ 97 por") e taxas;
// o preço à vista é o que sobra com mais repetições.
function precosDoTexto(texto) {
  const vistos = new Map();
  for (const m of texto.matchAll(RX_PRECO)) {
    const antes = texto.slice(Math.max(0, m.index - 14), m.index).toLowerCase();
    if (/\d+\s*x\s*(de)?\s*$/.test(antes) || /parcela|juros|taxa|frete/.test(antes)) continue;
    const v = m[0].replace(/\s+/g, ' ').replace(/(R\$|US\$|€) /, '$1');
    vistos.set(v, (vistos.get(v) || 0) + (/\b(de|era|apenas de)\s*$/.test(antes) ? 0.5 : 1));
  }
  return [...vistos.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v).slice(0, 8);
}

function detectar(html) {
  const out = {};
  for (const [tipo, lista] of Object.entries(ASSINATURAS)) {
    out[tipo] = lista.filter(([, rx]) => rx.test(html)).map(([nome]) => nome);
    if (tipo === 'quiz' && out.quiz.length > 1) out.quiz = out.quiz.filter((n) => n !== 'Quiz (genérico)');
  }
  return out;
}

async function lerSitemap(ctx, dominio) {
  const req = ctx.request;
  const tentativas = [`https://${dominio}/sitemap.xml`, `https://${dominio}/sitemap_index.xml`];
  try {
    const robots = await req.get(`https://${dominio}/robots.txt`, { timeout: 10000 });
    if (robots.ok()) for (const m of (await robots.text()).matchAll(/sitemap:\s*(\S+)/gi)) tentativas.unshift(m[1]);
  } catch { /* sem robots */ }
  const urls = [];
  for (const u of [...new Set(tentativas)]) {
    try {
      const r = await req.get(u, { timeout: 12000 });
      if (!r.ok()) continue;
      const xml = await r.text();
      if (!xml.includes('<loc>')) continue;
      const blocos = xml.split(/<(?:url|sitemap)>/).slice(1);
      for (const b of blocos) {
        const loc = b.match(/<loc>\s*([^<]+)\s*<\/loc>/)?.[1];
        const mod = b.match(/<lastmod>\s*([^<]+)\s*<\/lastmod>/)?.[1] || null;
        if (loc) urls.push({ url: loc.trim(), lastmod: mod });
      }
      if (urls.length) break;
    } catch { /* tenta o próximo */ }
  }
  urls.sort((a, b) => String(b.lastmod || '').localeCompare(String(a.lastmod || '')));
  return urls.slice(0, 60);
}

// Abre a página no navegador (para pegar conteúdo gerado por JavaScript) e devolve o raio-X.
export async function analisarPagina(ctx, url, { sitemap = true } = {}) {
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const page = await ctx.newPage();
  const requisicoes = new Set();
  page.on('request', (r) => requisicoes.add(r.url()));
  const res = { url, ok: false };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await espera(5000);
    await page.mouse.wheel(0, 3000).catch(() => {});
    await espera(1500);
    res.status = resp?.status() ?? null;
    res.urlFinal = page.url();
    res.dominio = hostDe(res.urlFinal);
    const info = await page.evaluate(() => ({
      titulo: document.title,
      descricao: document.querySelector('meta[name="description"],meta[property="og:description"]')?.content || '',
      h1: [...document.querySelectorAll('h1,h2')].map((h) => h.innerText.trim()).filter(Boolean).slice(0, 6),
      texto: document.body?.innerText?.slice(0, 60000) || '',
      links: [...document.querySelectorAll('a[href],[data-href],form[action]')].map((a) => a.href || a.dataset.href || a.action),
      imagemOg: document.querySelector('meta[property="og:image"]')?.content || null,
    }));
    const html = await page.content();
    const todos = [...new Set([...info.links, ...requisicoes, ...(html.match(/https?:\/\/[^\s"'<>)]+/g) || [])])];
    const checkouts = new Map();
    for (const l of todos) {
      const g = detectarGateway(l);
      if (g?.checkout && !checkouts.has(g.checkout)) checkouts.set(g.checkout, { ...g, url: l.split('#')[0] });
    }
    const pagaAqui = detectarGateway(res.urlFinal);
    if (pagaAqui?.checkout && !checkouts.has(pagaAqui.checkout)) checkouts.set(pagaAqui.checkout, { ...pagaAqui, url: res.urlFinal });
    Object.assign(res, {
      ok: true,
      titulo: info.titulo, descricao: info.descricao, manchetes: info.h1, imagem: info.imagemOg,
      precos: precosDoTexto(info.texto),
      checkouts: [...checkouts.values()].slice(0, 12),
      gateways: [...new Set([...checkouts.values()].map((c) => c.gateway))].map((id) => GATEWAYS.find((g) => g.id === id)?.nome || id),
      tecnologia: detectar(html + ' ' + [...requisicoes].join(' ')),
      temGarantia: /garantia/i.test(info.texto), temBonus: /b[oô]nus/i.test(info.texto),
      temDepoimentos: /depoimento|o que (dizem|falam)|avalia[cç][oõ]es/i.test(info.texto),
      temEscassez: /vagas limitadas|[uú]ltimas vagas|s[oó] hoje|oferta (expira|termina)|tempo limitado/i.test(info.texto),
      palavras: info.texto.split(/\s+/).length,
    });
    if (sitemap && res.dominio && !detectarGateway(res.urlFinal)) res.sitemap = await lerSitemap(ctx, res.dominio);
  } catch (e) {
    res.erro = String(e.message || e).slice(0, 200);
  } finally {
    await page.close();
  }
  return res;
}

// Abre um checkout e tenta extrair o nome do produto e o preço.
export async function lerCheckout(ctx, url) {
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await espera(4500);
    const d = await page.evaluate(() => {
      const og = document.querySelector('meta[property="og:title"]')?.content;
      const cand = [...document.querySelectorAll('h1,h2,h3,[class*="product" i] [class*="name" i],[class*="title" i]')]
        .map((e) => e.innerText?.trim()).filter((t) => t && t.length > 3 && t.length < 120);
      return { titulo: document.title, og, cand, texto: document.body?.innerText?.slice(0, 20000) || '' };
    });
    const ruins = /checkout|pagamento|finalizar|compra segura|seus dados|identifica|oferta (expira|termina)|^\s*[\d:\s]+$|^cakto$|^kiwify$|^hotmart$|^kirvano$/i;
    const nomesGw = new Set(GATEWAYS.map((g) => g.nome.toLowerCase()));
    const produto = [d.og, ...d.cand, d.titulo].find((t) => t && !ruins.test(t) && !nomesGw.has(t.trim().toLowerCase())) || d.titulo || null;
    const precos = precosDoTexto(d.texto);
    const indisponivel = /indispon[ií]vel|n[aã]o encontrad|not found|desativad|404/i.test(d.texto.slice(0, 2000)) && precos.length === 0;
    return { produto: produto?.slice(0, 140) || null, preco: precos[0] || null, precos, ok: !indisponivel };
  } catch {
    return { produto: null, preco: null, ok: false };
  } finally {
    await page.close();
  }
}
