// Meta Marketing API com o app do próprio dono (grátis, modo de desenvolvimento, permissão ads_read).
// Traz CPA, ROAS, CTR e frequência por anúncio, sugere ação seguindo o plano das calculadoras e acusa fadiga.
const V = process.env.META_API_VERSION || 'v23.0';
const conta = () => { const c = String(process.env.META_AD_ACCOUNT_ID || ''); return c ? (c.startsWith('act_') ? c : 'act_' + c) : ''; };
export const metaConfigurada = () => !!(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID);

async function graph(caminho, params = {}) {
  const u = new URL(`https://graph.facebook.com/${V}/${caminho}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  u.searchParams.set('access_token', process.env.META_ACCESS_TOKEN);
  const r = await fetch(u, { signal: AbortSignal.timeout(25000) });
  const d = await r.json();
  if (d.error) throw new Error(`Meta: ${d.error.message}`);
  return d;
}

const STATUS_CONTA = { 1: 'Ativa', 2: 'Desativada', 3: 'Pagamento pendente', 7: 'Em análise de risco', 8: 'Pagamento pendente (liquidação)', 9: 'Em período de carência', 100: 'Encerramento pendente', 101: 'Encerrada', 201: 'Qualquer ativa', 202: 'Qualquer encerrada' };

export async function checkupConta() {
  const [c, rep] = await Promise.all([
    graph(conta(), { fields: 'name,account_status,disable_reason,spend_cap,amount_spent,currency,balance,timezone_name' }),
    graph(`${conta()}/ads`, { fields: 'name,effective_status,ad_review_feedback,adset{name}', filtering: [{ field: 'effective_status', operator: 'IN', value: ['DISAPPROVED', 'WITH_ISSUES'] }], limit: '50' }).catch(() => ({ data: [] })),
  ]);
  const cent = (v) => (v == null ? null : Number(v) / 100);
  return { nome: c.name, status: STATUS_CONTA[c.account_status] || String(c.account_status), ativa: c.account_status === 1, motivo: c.disable_reason || null,
    limiteGasto: cent(c.spend_cap) || null, gasto: cent(c.amount_spent), moeda: c.currency, saldo: cent(c.balance), fuso: c.timezone_name,
    reprovados: (rep.data || []).map((a) => ({ id: a.id, nome: a.name, status: a.effective_status, conjunto: a.adset?.name, motivo: Object.values(a.ad_review_feedback?.global || {}).join(' ') || null })) };
}

const COMPRA = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'];
const soma = (lista, tipos) => (lista || []).filter((a) => tipos.includes(a.action_type)).reduce((s, a) => Math.max(s, Number(a.value) || 0), 0);

// Desempenho por anúncio nos últimos N dias, com tendência (primeira metade x segunda metade do período).
export async function desempenho({ dias = 7, ticket = 0, cpaAlvo = 0, cpaMax = 0 } = {}) {
  const d = await graph(`${conta()}/insights`, { level: 'ad', time_increment: '1', date_preset: dias <= 7 ? 'last_7d' : dias <= 14 ? 'last_14d' : 'last_30d', limit: '500',
    fields: 'ad_id,ad_name,adset_name,campaign_name,spend,impressions,clicks,ctr,frequency,actions,action_values' });
  const porAd = new Map();
  for (const l of d.data || []) { if (!porAd.has(l.ad_id)) porAd.set(l.ad_id, []); porAd.get(l.ad_id).push(l); }
  const saida = [];
  for (const [id, linhas] of porAd) {
    linhas.sort((a, b) => a.date_start.localeCompare(b.date_start));
    const tot = (f) => linhas.reduce((s, l) => s + (Number(l[f]) || 0), 0);
    const gasto = tot('spend'), imp = tot('impressions'), cliques = tot('clicks');
    const compras = linhas.reduce((s, l) => s + soma(l.actions, COMPRA), 0), receita = linhas.reduce((s, l) => s + soma(l.action_values, COMPRA), 0);
    const meio = Math.floor(linhas.length / 2) || 1, a1 = linhas.slice(0, meio), a2 = linhas.slice(meio);
    const ctrDe = (ls) => { const i = ls.reduce((s, l) => s + (Number(l.impressions) || 0), 0); return i ? (100 * ls.reduce((s, l) => s + (Number(l.clicks) || 0), 0)) / i : 0; };
    const freqDe = (ls) => (ls.length ? ls.reduce((s, l) => s + (Number(l.frequency) || 0), 0) / ls.length : 0);
    const ctr1 = ctrDe(a1), ctr2 = ctrDe(a2), f2 = freqDe(a2);
    const cpa = compras ? gasto / compras : null, roas = gasto ? receita / gasto : null;
    const fadiga = a2.length && f2 >= 2.5 && ctr1 > 0 && ctr2 <= ctr1 * 0.7;
    // Mesma lógica do plano de campanha: até 1,5 ticket sem venda → cortar; CPA no alvo com 3+ vendas → escalar.
    let acao = 'Aguardar dados', motivo = 'gasto ainda baixo para decidir';
    if (fadiga) { acao = 'Trocar criativo'; motivo = `fadiga: frequência ${f2.toFixed(1)} e CTR caiu de ${ctr1.toFixed(2)}% para ${ctr2.toFixed(2)}%`; }
    else if (!compras && ticket && gasto >= 1.5 * ticket) { acao = 'Cortar'; motivo = `gastou ${gasto.toFixed(2)} (mais de 1,5 ticket) sem venda`; }
    else if (cpa != null && cpaMax && cpa > cpaMax) { acao = 'Cortar'; motivo = `CPA ${cpa.toFixed(2)} acima do máximo ${cpaMax.toFixed(2)}`; }
    else if (cpa != null && cpaAlvo && cpa <= cpaAlvo && compras >= 3) { acao = 'Escalar'; motivo = `CPA ${cpa.toFixed(2)} no alvo com ${compras} vendas: duplique e suba o orçamento 20 a 30%`; }
    else if (cpa != null) { acao = 'Manter'; motivo = `CPA ${cpa.toFixed(2)} entre o alvo e o máximo`; }
    saida.push({ id, nome: linhas[0].ad_name, conjunto: linhas[0].adset_name, campanha: linhas[0].campaign_name, gasto, impressoes: imp, cliques,
      ctr: imp ? (100 * cliques) / imp : 0, ctrTendencia: ctr2 - ctr1, frequencia: f2, compras, receita, cpa, roas, fadiga, acao, motivo,
      serie: linhas.map((l) => [l.date_start, Number(l.spend) || 0, soma(l.actions, COMPRA)]) });
  }
  return saida.sort((a, b) => b.gasto - a.gasto);
}
