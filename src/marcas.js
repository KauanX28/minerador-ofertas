// Detector de marca grande (para ocultar empresas famosas como Burger King, Manual, Ápice, Lovable...), sem lista manual.
// Sinais públicos e grátis, guardados em cache por domínio:
//   - Tranco: posição do site entre os mais acessados do mundo (infoproduto low ticket quase nunca entra no top 200 mil)
//   - Wikidata: a empresa tem cadastro com aquele site oficial (base do Wikipédia: quase toda empresa conhecida está lá)
// O classificador junta isso com curtidas da página, categoria, várias páginas no mesmo site e ausência de checkout.
import { all, run, agora } from './db.js';
import { raizDominio } from './util.js';

// Sites de plataforma: muitos produtores diferentes usam o mesmo domínio, então ele não diz nada sobre a marca.
const PLATAFORMAS = ['instagram.com', 'facebook.com', 'fb.me', 'fb.com', 'wa.me', 'whatsapp.com', 'messenger.com', 'm.me', 'ig.me', 't.me', 'telegram.me', 'youtube.com', 'youtu.be', 'tiktok.com',
  'linktr.ee', 'beacons.ai', 'bio.link', 'linkbio.co', 'carrd.co', 'netlify.app', 'vercel.app', 'github.io', 'wixsite.com', 'wix.com', 'wordpress.com', 'blogspot.com', 'webflow.io', 'framer.website',
  'canva.site', 'my.canva.site', 'notion.site', 'sites.google.com', 'google.com', 'forms.gle', 'typeform.com', 'jotform.com', 'hotmart.com', 'hotmart.host', 'kiwify.com.br', 'kiwify.app', 'cakto.com.br',
  'eduzz.com', 'monetizze.com.br', 'payt.com.br', 'ticto.app', 'ticto.com.br', 'greenn.com.br', 'kirvano.com', 'hub.la', 'hubla.com.br', 'braip.com', 'perfectpay.com.br', 'mercadopago.com.br',
  'pagseguro.uol.com.br', 'inlead.digital', 'xquiz.co', 'typebot.io', 'wvltrack.com', 'bit.ly', 'cutt.ly', 'encurtador.com.br', 'rebrand.ly', 'shorturl.at', 'myshopify.com', 'lojaintegrada.com.br',
  'nuvemshop.com.br', 'mercadolivre.com.br', 'shopee.com.br', 'amazon.com.br', 'amazon.com', 'apple.com', 'play.google.com', 'apps.apple.com', 'lpages.co',
  // links de rastreamento/atribuição de apps e de afiliados: são de terceiros, não do anunciante
  'adjust.com', 'adjust.world', 'adj.st', 'app.link', 'onelink.me', 'page.link', 'bnc.lt', 'sng.link', 'smart.link', 'go.link', 'appsflyer.com', 'branch.io',
  'clickbank.net', 'hop.clickbank.net', 'digistore24.com', 'buygoods.com', 'maxweb.com', 'awin1.com', 'linksynergy.com', 'shopify.com', 'leadlovers.com', 'greatpages.com.br'];
export const ehPlataforma = (dominio) => { const r = raizDominio(dominio); return PLATAFORMAS.some((p) => r === p || r.endsWith('.' + p) || dominio.endsWith('.' + p) || dominio === p); };

const UA = { 'User-Agent': 'Minerador/1.0 (ferramenta pessoal de pesquisa)' };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function tranco(raiz) {
  const r = await fetch(`https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(raiz)}`, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (r.status === 429) throw new Error('limite do Tranco');
  if (!r.ok) return null;
  return (await r.json())?.ranks?.[0]?.rank ?? null;
}

async function wikidata(raiz) {
  const variantes = [`https://www.${raiz}/`, `https://${raiz}/`, `http://www.${raiz}/`, `http://${raiz}/`, `https://www.${raiz}`, `https://${raiz}`];
  const u = new URL('https://www.wikidata.org/w/api.php');
  Object.entries({ action: 'query', list: 'search', format: 'json', srlimit: '1', srsearch: 'haswbstatement:' + variantes.map((v) => 'P856=' + v).join('|') }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!r.ok) return null;
  return (await r.json())?.query?.search?.[0]?.title || null;
}

// Consulta os domínios ainda sem cache (ou com cache de mais de 30 dias). O Tranco aceita 1 consulta por segundo.
export async function verificarMarcas({ limite = 120, log = () => {}, temTempo = () => true } = {}) {
  const doms = await all(`SELECT a.dominio, COUNT(DISTINCT a.page_id) paginas FROM anuncios a WHERE a.ativo = 1 AND a.dominio IS NOT NULL GROUP BY a.dominio`);
  const raizes = new Map();
  for (const d of doms) {
    const host = String(d.dominio).split('/')[0].toLowerCase();
    if (!host.includes('.') || ehPlataforma(host)) continue;
    const r = raizDominio(host);
    raizes.set(r, (raizes.get(r) || 0) + Number(d.paginas));
  }
  const feitos = new Set((await all('SELECT dominio FROM marcas_cache WHERE quando > ?', [agora() - 30 * 86400])).map((x) => x.dominio));
  const fila = [...raizes.entries()].filter(([r]) => !feitos.has(r)).sort((a, b) => b[1] - a[1]).slice(0, limite).map(([r]) => r);
  if (!fila.length) return 0;
  log(`> Marcas grandes: conferindo ${fila.length} sites (Tranco e Wikidata)`);
  let n = 0;
  for (const raiz of fila) {
    if (!temTempo(1)) break;
    try {
      const [t, w] = await Promise.all([tranco(raiz), wikidata(raiz).catch(() => null)]);
      await run(`INSERT INTO marcas_cache (dominio, tranco, wikidata, quando) VALUES (?, ?, ?, ?)
        ON CONFLICT(dominio) DO UPDATE SET tranco = excluded.tranco, wikidata = excluded.wikidata, quando = excluded.quando`, [raiz, t, w, agora()]);
      n++;
    } catch (e) { log(`  ${raiz}: ${e.message}`); if (/limite/.test(e.message)) await espera(5000); }
    await espera(1100);
  }
  return n;
}

export async function mapaMarcas() {
  const m = new Map();
  for (const r of await all('SELECT dominio, tranco, wikidata FROM marcas_cache')) m.set(r.dominio, r);
  return m;
}
