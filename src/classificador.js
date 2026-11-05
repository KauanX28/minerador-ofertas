// Classificador de tipo de oferta por regras (sem custo), idioma, preço e hashes de criativo.
import crypto from 'node:crypto';
import { franc } from 'franc';
import { hostDe } from './util.js';

export const TIPOS = {
  low: 'Infoproduto low ticket',
  info_alto: 'Infoproduto médio/alto',
  app: 'App / assinatura',
  fisico: 'E-commerce físico',
  lancamento: 'Lançamento / evento',
  local: 'Negócio local',
  conversa: 'Venda por conversa (WhatsApp/Direct)',
  marca: 'Marca grande',
  indefinido: 'Indefinido',
};

// ---------- idioma ----------
const IDIOMAS = { por: 'pt', spa: 'es', eng: 'en', fra: 'fr', ita: 'it', deu: 'de' };
export function idiomaDe(texto) {
  const t = String(texto || '').replace(/https?:\/\/\S+/g, ' ').replace(/[\p{Extended_Pictographic}#@]/gu, ' ').trim();
  if (t.length < 25) return null;
  const c = franc(t, { only: Object.keys(IDIOMAS), minLength: 25 });
  return IDIOMAS[c] || null;
}
export const idiomaDoPais = (pais) => (['BR', 'PT', 'AO', 'MZ'].includes(pais) ? 'pt'
  : ['US', 'GB', 'CA', 'AU', 'IE', 'NZ', 'ZA', 'IN', 'PH', 'NG'].includes(pais) ? 'en'
  : ['FR', 'BE'].includes(pais) ? 'fr' : ['IT'].includes(pais) ? 'it' : ['DE', 'CH', 'AT'].includes(pais) ? 'de' : 'es');

// ---------- preço ----------
// "R$ 1.234,56" | "R$19,90" | "$7.00" | "US$ 7,00" | "€9,90" -> { valor, moeda }
export function lerPreco(txt) {
  const m = String(txt || '').match(/(R\$|US\$|USD|\$|€|EUR|MX\$|£)\s?(\d{1,6}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/i);
  if (!m) return null;
  const simb = m[1].toUpperCase();
  let n = m[2];
  const ultSep = Math.max(n.lastIndexOf(','), n.lastIndexOf('.'));
  if (ultSep >= 0 && n.length - ultSep - 1 <= 2) n = n.slice(0, ultSep).replace(/[.,]/g, '') + '.' + n.slice(ultSep + 1);
  else n = n.replace(/[.,]/g, '');
  const valor = Number(n);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  const moeda = simb === 'R$' ? 'BRL' : simb === '€' || simb === 'EUR' ? 'EUR' : simb === '£' ? 'GBP' : simb === 'MX$' ? 'MXN' : 'USD';
  return { valor, moeda };
}
export const paraBRL = (p, cambio = {}) => (!p ? null : p.moeda === 'BRL' ? p.valor : cambio[p.moeda] ? Math.round(p.valor * cambio[p.moeda] * 100) / 100 : null);

// Menor preço mencionado nos textos dos anúncios ("por apenas R$ 19,90").
export function precoDosTextos(textos, cambio) {
  let menor = null;
  for (const t of textos) {
    for (const m of String(t || '').matchAll(/(R\$|US\$|\$|€)\s?\d{1,5}(?:[.,]\d{1,3})*/g)) {
      const antes = String(t).slice(Math.max(0, m.index - 12), m.index).toLowerCase();
      if (/\d+\s*x\s*(de)?\s*$|parcela|economi|desconto de|ganh|fatur|lucr|renda de/.test(antes)) continue;
      const brl = paraBRL(lerPreco(m[0]), cambio);
      if (brl && brl >= 3 && (menor == null || brl < menor)) menor = brl;
    }
  }
  return menor;
}

// ---------- hashes ----------
export function normalizarTexto(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/https?:\/\/\S+/g, ' ').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
export const hashTexto = (t) => { const n = normalizarTexto(t).slice(0, 400); return n.length < 20 ? null : crypto.createHash('sha1').update(n).digest('hex').slice(0, 16); };

// Hash perceptual (blockhash 8x8 = 64 bits): a mesma imagem reenviada por outra conta gera o mesmo hash.
export async function hashImagem(buf) {
  const { default: sharp } = await import('sharp');
  const { bmvbhash } = await import('blockhash-core');
  const { data, info } = await sharp(buf).resize(64, 64, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return bmvbhash({ width: info.width, height: info.height, data }, 8);
}

// ---------- tipo de oferta ----------
const tem = (texto, lista) => lista.filter((p) => texto.includes(p));
const DOM_FISICO = ['mercadolivre', 'mercadolibre', 'shopee', 'amazon.', 'magazineluiza', 'magalu', 'americanas', 'aliexpress', 'myshopify', 'casasbahia', 'kabum', 'netshoes', 'shein', 'temu', 'nuvemshop', 'lojaintegrada', 'tray.com', 'yampi'];
const DOM_APP = ['play.google.com', 'apps.apple.com', 'itunes.apple.com', 'onelink.me', 'app.link', 'adj.st'];
const P_INFO = ['acesso imediato', 'pdf', 'e-book', 'ebook', 'curso', 'aulas', 'videoaula', 'método', 'metodo', 'desafio', 'pack ', 'pacote', 'apostila', 'planilha', 'mentoria',
  'treinamento', 'area de membros', 'área de membros', 'baixe agora', 'garantia de 7 dias', 'garantia incondicional', 'guia completo', 'material digital', 'templates', 'moldes', 'receitas',
  'acceso inmediato', 'curso online', 'garantía', 'instant access', 'online course', 'digital download', 'protocolo', 'passo a passo'];
const P_FISICO = ['frete grátis', 'frete gratis', 'entrega', 'envio imediato', 'pague na entrega', 'pagamento na entrega', 'unidades', 'estoque', 'compre já', 'envío gratis', 'free shipping', 'pedido', 'produto físico', 'cor:', 'tamanho'];
const P_LANCAMENTO = ['aula ao vivo', 'aulão', 'masterclass', 'webinar', 'evento', 'inscreva-se', 'inscrições', 'grupo vip', 'lista de espera', 'imersão', 'ao vivo e gratuito', 'semana do', 'workshop gratuito', 'live gratuita', 'clase en vivo', 'free webinar'];
const P_LOCAL = ['agende', 'agendar', 'agendamento', 'consulta', 'clínica', 'clinica', 'consultório', 'nosso estúdio', 'nossa loja', 'endereço', 'bairro', 'atendimento presencial', 'venha nos visitar', 'unidade de', 'na cidade', 'avaliação gratuita', 'delivery', 'cardápio', 'imobiliária', 'apartamento', 'aluguel'];
const P_APP = ['baixe o app', 'baixe o aplicativo', 'no app', 'aplicativo', 'download the app', 'descarga la app', 'assinatura mensal', 'teste grátis de', 'free trial', 'subscription', '7-day free', 'plano personalizado', 'personalized plan', '1-minute quiz', 'plan personalizado'];
const CAT_LOCAL = ['local', 'clínica', 'clinica', 'dentist', 'salão', 'salon', 'academia', 'gym', 'restaurante', 'restaurant', 'imobili', 'real estate', 'escola de', 'beauty, cosmetic', 'médico', 'doctor', 'hospital', 'hotel', 'loja', 'store'];

/**
 * Classifica um anunciante. Entrada: nome, categorias, curtidas, anúncios [{texto,titulo,cta,link,gateway,formato}],
 * análise do domínio (opcional), preço em reais (opcional), lista de bloqueio, limite de low ticket.
 * Saída: { tipo, motivo, bloqueado }.
 */
const CAT_MARCA = ['restaurant', 'restaurante', 'fast food', 'bank', 'banco', 'telecom', 'retail company', 'varejo', 'supermarket', 'supermercado', 'airline', 'automotive', 'software', 'internet company', 'insurance', 'seguro', 'beverage', 'bebida', 'brand', 'marca', 'consumer products', 'clothing (brand)', 'shopping & retail', 'e-commerce website', 'pharmacy', 'farmácia', 'hotel', 'university', 'universidade'];

export function classificar({ nome = '', categorias = '', curtidas = 0, anuncios = [], analise = null, precoBrl = null, bloqueio = [], limiteLow = 97, marca = null, paginasNoSite = 1 }) {
  const textos = anuncios.map((a) => `${a.titulo || ''} ${a.texto || ''}`.toLowerCase()).join(' \n ');
  const links = anuncios.map((a) => String(a.link || '').toLowerCase());
  const ctas = anuncios.map((a) => String(a.cta || '').toLowerCase()).join(' | ');
  const hosts = [...new Set(links.map((l) => hostDe(l) || '').filter(Boolean)), analise?.dominio].filter(Boolean);
  const cat = String(categorias || '').toLowerCase();
  const nomeL = nome.toLowerCase();

  const palavra = (b) => new RegExp('(^|[^a-z0-9à-ú])' + b.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9à-ú])');
  const bloq = bloqueio.find((b) => b && (palavra(b).test(nomeL) || hosts.some((h) => h.split('.').some((parte) => parte.replace(/-/g, '') === b.toLowerCase().replace(/[\s-]/g, '')))));
  if (bloq) return { tipo: 'marca', motivo: `lista de bloqueio: ${bloq}`, bloqueado: true };

  const pts = { low: 0, info_alto: 0, app: 0, fisico: 0, lancamento: 0, local: 0, marca: 0, conversa: 0 };
  const porque = { low: [], app: [], fisico: [], lancamento: [], local: [], marca: [], conversa: [] };
  const soma = (t, n, m) => { pts[t] += n; if (m && porque[t].length < 3) porque[t].push(m); };

  const comGateway = anuncios.some((a) => a.gateway) || (analise?.checkouts || []).length > 0;
  if (comGateway) soma('low', 6, 'checkout de gateway de infoproduto');
  // Anúncios que só levam para conversa (WhatsApp, Messenger, Direct) ou para o perfil: venda feita no chat, sem página nem checkout.
  const RE_CONVERSA = /(wa\.me|whatsapp\.com|api\.whatsapp|m\.me\/|messenger\.com|instagram\.com|ig\.me|facebook\.com\/(?!ads))/;
  const comDestino = anuncios.filter((a) => a.link || a.cta);
  const paraConversa = comDestino.filter((a) => RE_CONVERSA.test(String(a.link || '').toLowerCase()) || /whatsapp|mensagem|message|conversa|direct|perfil do instagram|instagram profile/.test(String(a.cta || '').toLowerCase()));
  if (!comGateway && comDestino.length && paraConversa.length / comDestino.length >= 0.6) soma('conversa', 8, `${paraConversa.length} de ${comDestino.length} anúncios levam para conversa ou perfil, sem página de vendas`);
  const info = tem(textos, P_INFO); if (info.length) soma('low', Math.min(info.length, 4), `texto: ${info.slice(0, 2).join(', ')}`);
  // Programas digitais com prazo ("desafio 21 dias", "método de 7 dias", "21d") e funis em rastreadores/quiz.
  if (/\b(desafio|m[eé]todo|programa|plano|protocolo|reto|challenge)\b[^.\n]{0,40}\b\d{1,3}\s?(d\b|dias|days|d[ií]as|semanas|weeks)/.test(textos) || /\b\d{1,3}d\b/.test(textos)) soma('low', 3, 'programa digital com prazo');
  if (links.some((l) => /quiz|inlead|xquiz|typebot|wvltrack|\/q\//.test(l))) soma('low', 2, 'link para quiz/funil');
  if (/aulas? (ao vivo|online|gravadas)|pelo celular|no seu celular|clases? (en vivo|online)/.test(textos)) soma('low', 2, 'aulas online');
  if (analise?.tecnologia?.quiz?.length) soma('low', 2, 'funil com quiz');
  if (analise?.tecnologia?.vsl?.length) soma('low', 1, 'VSL');

  if (hosts.some((h) => DOM_APP.some((d) => h.includes(d))) || /instalar|install|usar app|download/.test(ctas)) soma('app', 6, 'link para loja de apps');
  const app = tem(textos, P_APP); if (app.length) soma('app', Math.min(app.length * 2, 5), `texto: ${app[0]}`);

  if (hosts.some((h) => DOM_FISICO.some((d) => h.includes(d)))) soma('fisico', 6, 'loja de e-commerce');
  const fis = tem(textos, P_FISICO); if (fis.length) soma('fisico', Math.min(fis.length * 2, 5), `texto: ${fis[0]}`);
  if ((analise?.tecnologia?.construtor || []).some((c) => /shopify|nuvemshop|yampi/i.test(c))) soma('fisico', 4, 'loja Shopify/Nuvemshop');

  const lan = tem(textos, P_LANCAMENTO); if (lan.length) soma('lancamento', Math.min(lan.length * 2, 6), `texto: ${lan[0]}`);
  if (/inscreva|cadastr|sign up|regist/.test(ctas)) soma('lancamento', 2, 'botão de inscrição');

  const loc = tem(textos, P_LOCAL); if (loc.length) soma('local', Math.min(loc.length * 2, 6), `texto: ${loc[0]}`);
  if (CAT_LOCAL.some((c) => cat.includes(c))) soma('local', 3, `categoria: ${categorias}`);

  // Marca grande: site muito acessado (Tranco), empresa cadastrada na Wikidata, página gigante, várias páginas no mesmo site.
  if (marca?.tranco) { const t = marca.tranco; if (t <= 50000) soma('marca', 9, `site entre os 50 mil mais acessados do mundo (nº ${t})`); else if (t <= 150000) soma('marca', 7, `site entre os 150 mil mais acessados (nº ${t})`); else if (t <= 300000) soma('marca', 3, `site no top 300 mil (nº ${t})`); }
  if (marca?.wikidata) soma('marca', 7, `empresa cadastrada na Wikidata (${marca.wikidata})`);
  if (curtidas >= 1_000_000) soma('marca', comGateway ? 3 : 6, `${(curtidas / 1e6).toFixed(1)} mi de curtidas`); else if (curtidas >= 200_000 && !comGateway) soma('marca', 3, `${Math.round(curtidas / 1000)} mil curtidas`);
  if (paginasNoSite >= 4 && !comGateway) soma('marca', 3, `${paginasNoSite} páginas anunciando o mesmo site`);
  if (CAT_MARCA.some((c) => cat.includes(c)) && pts.marca > 0) soma('marca', 2, `categoria: ${categorias}`);
  if (hosts.some((h) => /\.(gov|edu)(\.[a-z]{2})?$/.test(h)) || /\b(universidade|faculdade|seguradora)\b/.test(nomeL)) soma('marca', 4, 'instituição/marca');

  if (pts.marca < 6) pts.marca = 0; // marca grande exige sinal forte: site muito acessado, Wikidata ou 1 mi+ de curtidas
  const [melhor, valor] = Object.entries(pts).sort((a, b) => b[1] - a[1])[0];
  if (valor < 3) return { tipo: 'indefinido', motivo: 'poucos sinais', bloqueado: false };
  if (melhor === 'low') {
    const preco = precoBrl ?? precoDosTextos(anuncios.map((a) => a.texto), {});
    if (preco != null && preco > limiteLow) return { tipo: 'info_alto', motivo: `infoproduto de R$ ${preco.toFixed(2)}`, bloqueado: false };
    return { tipo: 'low', motivo: [...porque.low, preco != null ? `preço R$ ${preco.toFixed(2)}` : 'preço ainda não identificado'].join(' · '), bloqueado: false };
  }
  return { tipo: melhor, motivo: porque[melhor].join(' · ') || melhor, bloqueado: false };
}
