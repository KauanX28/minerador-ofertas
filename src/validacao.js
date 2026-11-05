// Validação grátis de um site (alternativa ao Semrush/Similarweb), só com APIs públicas:
// - Chrome UX Report / PageSpeed Insights: o site tem tráfego real detectável? (exige GOOGLE_API_KEY grátis)
// - Wayback Machine (CDX): primeira captura, número de versões e links das versões antigas
// - RDAP: idade do domínio e registrador
// - Cert Spotter (ou crt.sh): subdomínios do produtor (quiz., pay., app., membros.)
// - Tranco: posição entre os 1 milhão de sites mais acessados
import { get, run } from './db.js';
import { raizDominio } from './util.js';

const UA = { 'User-Agent': 'Minerador/1.0 (ferramenta pessoal de pesquisa)' };
const json = async (url, opcoes = {}, ms = 20000) => {
  const r = await fetch(url, { ...opcoes, headers: { ...UA, ...(opcoes.headers || {}) }, signal: AbortSignal.timeout(ms) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

// Chrome UX Report: só aparece site com tráfego relevante de usuários do Chrome. 404 = sem dados = pouco tráfego.
async function crux(host) {
  const k = process.env.GOOGLE_API_KEY;
  if (!k) return { semChave: true };
  const pedir = (origin, formFactor) => json(`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${k}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origin, ...(formFactor ? { formFactor } : {}) }) });
  const r = (await pedir('https://' + host)) || (host.startsWith('www.') ? null : await pedir('https://www.' + host));
  if (!r?.record) return { trafego: false };
  const m = r.record.metrics || {};
  const p75 = (n) => m[n]?.percentiles?.p75 ?? null;
  const fracoes = r.record.metrics?.form_factors?.fractions || null;
  return { trafego: true, lcp: p75('largest_contentful_paint'), inp: p75('interaction_to_next_paint'), cls: p75('cumulative_layout_shift'), ttfb: p75('experimental_time_to_first_byte'), dispositivos: fracoes };
}

// PageSpeed Insights: nota de desempenho no celular (mais lento; só com chave, que dá cota própria e grátis).
async function pagespeed(host) {
  const k = process.env.GOOGLE_API_KEY;
  if (!k) return { semChave: true };
  const r = await json(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent('https://' + host)}&strategy=mobile&category=performance&key=${k}`, {}, 45000);
  const nota = r?.lighthouseResult?.categories?.performance?.score;
  return { nota: nota == null ? null : Math.round(nota * 100), campo: r?.originLoadingExperience?.overall_category || null };
}

async function wayback(host) {
  const linhas = await json(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(host)}&output=json&fl=timestamp,statuscode,digest&collapse=digest&filter=statuscode:200&limit=5000`, {}, 25000);
  if (!linhas || linhas.length < 2) return { versoes: 0 };
  const v = linhas.slice(1).map(([ts]) => ts);
  const data = (ts) => `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
  const ult12 = v.filter((ts) => Date.parse(data(ts)) > Date.now() - 365 * 864e5).length;
  return { versoes: v.length, primeira: data(v[0]), ultima: data(v.at(-1)), ultimos12meses: ult12,
    amostras: v.slice(-6).reverse().map((ts) => ({ data: data(ts), url: `https://web.archive.org/web/${ts}/${host}` })) };
}

async function rdap(dominio) {
  const r = await json(`https://rdap.org/domain/${encodeURIComponent(dominio)}`, {}, 15000);
  if (!r) return null;
  const evento = (tipo) => r.events?.find((e) => e.eventAction === tipo)?.eventDate?.slice(0, 10) || null;
  const registrador = r.entities?.find((e) => e.roles?.includes('registrar'))?.vcardArray?.[1]?.find((x) => x[0] === 'fn')?.[3] || null;
  const criado = evento('registration');
  return { criado, expira: evento('expiration'), atualizado: evento('last changed'), registrador,
    idadeDias: criado ? Math.floor((Date.now() - Date.parse(criado)) / 864e5) : null };
}

const INTERESSANTES = /^(quiz|teste|pay|checkout|app|membros|members|area|aluno|alunos|lp|vsl|oferta|promo|go|pv|vendas|obrigado|upsell|lead|cursos?)\./i;
async function subdominios(dominio) {
  let nomes = [];
  try {
    const r = await json(`https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(dominio)}&include_subdomains=true&expand=dns_names`, {}, 20000);
    nomes = (r || []).flatMap((c) => c.dns_names || []);
  } catch {
    const r = await json(`https://crt.sh/?q=${encodeURIComponent('%.' + dominio)}&output=json`, {}, 30000);
    nomes = (r || []).flatMap((c) => String(c.name_value || '').split('\n'));
  }
  const unicos = [...new Set(nomes.map((n) => n.toLowerCase().replace(/^\*\./, '')).filter((n) => n.endsWith(dominio) && n !== dominio && n !== 'www.' + dominio))].sort();
  return { total: unicos.length, lista: unicos.slice(0, 60), destaque: unicos.filter((n) => INTERESSANTES.test(n)).slice(0, 15) };
}

async function tranco(dominio) {
  const r = await json(`https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(dominio)}`, {}, 15000);
  const ranks = r?.ranks || [];
  if (!ranks.length) return { posicao: null };
  return { posicao: ranks[0].rank, data: ranks[0].date, tendencia: ranks.length > 7 ? ranks[7].rank - ranks[0].rank : null };
}

// Roda todas as fontes em paralelo; uma fonte fora do ar não derruba as outras.
export async function validarDominio(entrada, { pagespeedTambem = true } = {}) {
  const host = String(entrada).replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  const dominio = raizDominio(host);
  const fontes = { crux: () => crux(host), wayback: () => wayback(host), rdap: () => rdap(dominio), subdominios: () => subdominios(dominio), tranco: () => tranco(dominio),
    ...(pagespeedTambem ? { pagespeed: () => pagespeed(host) } : {}) };
  const res = await Promise.allSettled(Object.values(fontes).map((f) => f()));
  const dados = { host, dominio, quando: Math.floor(Date.now() / 1000), erros: {} };
  Object.keys(fontes).forEach((k, i) => { if (res[i].status === 'fulfilled') dados[k] = res[i].value; else dados.erros[k] = String(res[i].reason?.message || res[i].reason); });
  await run(`INSERT INTO validacoes (dominio, dados, quando) VALUES (?, ?, ?) ON CONFLICT(dominio) DO UPDATE SET dados = excluded.dados, quando = excluded.quando`,
    [host, JSON.stringify(dados), dados.quando]);
  return dados;
}

export async function lerValidacao(entrada) {
  const host = String(entrada).replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  const r = await get('SELECT dados FROM validacoes WHERE dominio = ?', [host]);
  return r ? JSON.parse(r.dados) : null;
}
