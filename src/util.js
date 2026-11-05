// Destinos que não identificam uma oferta (redes sociais, lojas de app, encurtadores).
const GENERICOS = [
  'facebook.com', 'fb.me', 'fb.com', 'instagram.com', 'whatsapp.com', 'wa.me', 'm.me', 'messenger.com',
  'linktr.ee', 'youtube.com', 'youtu.be', 'bit.ly', 'google.com', 'tiktok.com', 'apple.com', 'apps.apple.com',
];

// Domínios compartilhados por muitas ofertas diferentes (rastreadores, checkouts, construtores de página).
// Para eles, a oferta é identificada pelo caminho do link, não pelo domínio.
const COMPARTILHADOS = [
  'wvltrack.com', 'suportee.online', 'hotmart.com', 'kiwify.com.br', 'kiwify.app', 'eduzz.com', 'monetizze.com.br',
  'braip.com', 'perfectpay.com.br', 'ticto.app', 'ticto.com.br', 'cakto.com.br', 'kirvano.com', 'lastlink.com',
  'greenn.com.br', 'pepper.com.br', 'payt.com.br', 'hub.la', 'doppus.com', 'yampi.com.br', 'linkfly.to', 'wa.link',
  'beacons.ai', 'carrd.co', 'lovable.app', 'vercel.app', 'netlify.app', 'pages.dev', 'wixsite.com', 'webflow.io',
  'hostingersite.com', 'mystrikingly.com', 'blogspot.com', 'sites.google.com', 'inlead.digital', 'xquiz.io',
  'clickbank.net', 'digistore24.com', 'stripe.com', 'gumroad.com', 'lemonsqueezy.com', 'systeme.io', 'thrivecart.com',
  'samcart.com', 'payhip.com', 'mykajabi.com', 'mercadopago.com.br', 'mercadopago.com', 'mpago.la', 'myshopify.com',
];

// Plataformas de pagamento (gateways). `raiz` identifica o checkout; `busca` são os termos usados na
// Biblioteca de Anúncios (ela também encontra anúncios pelo link de destino).
export const GATEWAYS = [
  // Brasil / LatAm
  { id: 'hotmart', nome: 'Hotmart', regiao: 'BR', raiz: 'hotmart.com', busca: ['pay.hotmart.com', 'go.hotmart.com'] },
  { id: 'kiwify', nome: 'Kiwify', regiao: 'BR', raiz: 'kiwify.com.br', extraRaiz: ['kiwify.app'], busca: ['pay.kiwify.com.br'] },
  { id: 'cakto', nome: 'Cakto', regiao: 'BR', raiz: 'cakto.com.br', busca: ['pay.cakto.com.br', 'quiz.cakto'] },
  { id: 'kirvano', nome: 'Kirvano', regiao: 'BR', raiz: 'kirvano.com', busca: ['pay.kirvano.com'] },
  { id: 'perfectpay', nome: 'Perfect Pay', regiao: 'BR', raiz: 'perfectpay.com.br', busca: ['checkout.perfectpay.com.br', 'go.perfectpay.com.br'] },
  { id: 'ticto', nome: 'Ticto', regiao: 'BR', raiz: 'ticto.app', extraRaiz: ['ticto.com.br'], busca: ['payment.ticto.app', 'checkout.ticto.app'] },
  { id: 'eduzz', nome: 'Eduzz', regiao: 'BR', raiz: 'eduzz.com', busca: ['sun.eduzz.com', 'chk.eduzz.com'] },
  { id: 'monetizze', nome: 'Monetizze', regiao: 'BR', raiz: 'monetizze.com.br', busca: ['app.monetizze.com.br'] },
  { id: 'braip', nome: 'Braip', regiao: 'BR', raiz: 'braip.com', busca: ['ev.braip.com'] },
  { id: 'greenn', nome: 'Greenn', regiao: 'BR', raiz: 'greenn.com.br', busca: ['payfast.greenn.com.br'] },
  { id: 'lastlink', nome: 'Lastlink', regiao: 'BR', raiz: 'lastlink.com', aceitaRaiz: true, busca: ['lastlink.com/p'] },
  { id: 'payt', nome: 'Payt', regiao: 'BR', raiz: 'payt.com.br', busca: ['checkout.payt.com.br'] },
  { id: 'hubla', nome: 'Hubla', regiao: 'BR', raiz: 'hub.la', busca: ['pay.hub.la'] },
  { id: 'doppus', nome: 'Doppus', regiao: 'BR', raiz: 'doppus.com', busca: ['checkout.doppus.com'] },
  { id: 'mercadopago', nome: 'Mercado Pago', regiao: 'BR', raiz: 'mercadopago.com.br', extraRaiz: ['mpago.la', 'mercadopago.com', 'mercadopago.com.mx', 'mercadopago.com.ar'], aceitaRaiz: true, busca: ['mpago.la'] },
  // Internacional
  { id: 'clickbank', nome: 'ClickBank', regiao: 'INT', raiz: 'clickbank.net', aceitaRaiz: true, busca: ['hop.clickbank.net', 'pay.clickbank.net'] },
  { id: 'digistore24', nome: 'Digistore24', regiao: 'INT', raiz: 'digistore24.com', aceitaRaiz: true, busca: ['digistore24.com/product'] },
  { id: 'stripe', nome: 'Stripe', regiao: 'INT', raiz: 'stripe.com', busca: ['buy.stripe.com'] },
  { id: 'gumroad', nome: 'Gumroad', regiao: 'INT', raiz: 'gumroad.com', aceitaRaiz: true, busca: ['gumroad.com/l'] },
  { id: 'systeme', nome: 'Systeme.io', regiao: 'INT', raiz: 'systeme.io', busca: ['systeme.io'] },
  { id: 'thrivecart', nome: 'ThriveCart', regiao: 'INT', raiz: 'thrivecart.com', busca: ['thrivecart.com'] },
  { id: 'samcart', nome: 'SamCart', regiao: 'INT', raiz: 'samcart.com', busca: ['checkout.samcart.com'] },
  { id: 'payhip', nome: 'Payhip', regiao: 'INT', raiz: 'payhip.com', aceitaRaiz: true, busca: ['payhip.com/b'] },
  { id: 'kajabi', nome: 'Kajabi', regiao: 'INT', raiz: 'mykajabi.com', busca: ['mykajabi.com/offers'] },
];

const casa = (host, raiz) => host === raiz || host.endsWith('.' + raiz);

export function urlReal(url) {
  let u = new URL(url);
  if (u.hostname.endsWith('facebook.com') && u.pathname.startsWith('/l.php') && u.searchParams.get('u')) {
    u = new URL(u.searchParams.get('u'));
  }
  return u;
}

export function hostDe(url) {
  try { return urlReal(url.includes('://') ? url : 'https://' + url).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return null; }
}

// Domínio principal (ex.: bio.loja.com.br -> loja.com.br) — usado na conferência de rota.
export function raizDominio(host) {
  if (!host) return host;
  const p = host.split('.');
  const n = /\.(com|net|org|gov|edu|art|blog|app|eco|med)\.[a-z]{2}$/.test(host) ? 3 : 2;
  return p.slice(-n).join('.');
}

// Chave da oferta: domínio próprio (ex.: desafiopilates.com) ou domínio+caminho quando é compartilhado.
export function chaveOferta(url) {
  if (!url) return null;
  try {
    const u = urlReal(url);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (GENERICOS.some((g) => casa(host, g))) return null;
    const gw = detectarGateway(url);
    if (gw?.checkout) return gw.checkout;
    if (COMPARTILHADOS.some((g) => casa(host, g))) {
      const caminho = u.pathname.replace(/\/+$/, '');
      return caminho && caminho !== '/' ? host + caminho : null;
    }
    return host;
  } catch { return null; }
}

// Se o link é de checkout de um gateway, devolve { gateway, checkout } (checkout = host + id do produto).
export function detectarGateway(url) {
  if (!url) return null;
  try {
    const u = urlReal(url.includes('://') ? url : 'https://' + url);
    const host = u.hostname.toLowerCase();
    for (const g of GATEWAYS) {
      const raizes = [g.raiz, ...(g.extraRaiz || [])];
      const r = raizes.find((x) => casa(host, x));
      if (!r) continue;
      if (!g.aceitaRaiz && (host.startsWith('www.') || host === r)) return null; // site institucional
      // ClickBank identifica o produto pelo parâmetro "vendor" do hoplink.
      const vendor = u.searchParams.get('vendor');
      if (g.id === 'clickbank' && vendor) return { gateway: g.id, checkout: 'clickbank/' + vendor.toLowerCase() };
      const partes = u.pathname.split('/').filter(Boolean);
      if (!partes.length || ['preview', 'login', 'signup', 'cadastro'].includes(partes[0].toLowerCase())) return { gateway: g.id, checkout: null };
      const nPartes = ['checkout', 'p', 'c', 'pay', 'b', 'l', 'product', 'products', 'offers', 'buy'].includes(partes[0].toLowerCase()) && partes[1] ? 2 : 1;
      return { gateway: g.id, checkout: host + '/' + partes.slice(0, nPartes).join('/') };
    }
    return null;
  } catch { return null; }
}

export function gatewayPorTexto(txt) {
  const t = String(txt || '').toLowerCase().trim();
  if (!t) return null;
  const porId = GATEWAYS.find((g) => g.id === t.replace(/\s+/g, '') || g.nome.toLowerCase() === t);
  if (porId) return porId;
  const host = hostDe(t);
  return GATEWAYS.find((g) => host && [g.raiz, ...(g.extraRaiz || [])].some((r) => casa(host, r))) ||
    GATEWAYS.find((g) => t.includes(g.id));
}

// Atalhos para as ferramentas externas citadas nos vídeos de mineração.
export function linksExternos(dominio, nome = '') {
  const d = encodeURIComponent(dominio || '');
  return {
    'Biblioteca (domínio)': `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${d}&search_type=keyword_unordered`,
    'Similarweb': `https://www.similarweb.com/website/${dominio}/`,
    'Semrush Traffic': `https://www.semrush.com/analytics/traffic/overview/?q=${d}&searchType=domain`,
    'Google Ads Transparency': `https://adstransparency.google.com/?region=anywhere&domain=${d}`,
    'Reclame Aqui': `https://www.reclameaqui.com.br/busca/?q=${encodeURIComponent(nome || dominio)}`,
    'Sitemap.xml': `https://${dominio}/sitemap.xml`,
    'urlscan.io': `https://urlscan.io/search/#domain%3A${d}`,
    'Wayback Machine': `https://web.archive.org/web/2026*/${dominio}*`,
  };
}
