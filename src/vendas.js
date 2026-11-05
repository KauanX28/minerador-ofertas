// Webhooks dos gateways (função da Vercel): registra cada venda aprovada SEM dados pessoais do comprador
// e calcula ticket médio e conversão real de order bump e upsell para as calculadoras.
import { all, run, agora } from './db.js';

// Procura um campo em qualquer profundidade do JSON (cada gateway manda num formato).
function achar(obj, chaves, prof = 0) {
  if (!obj || typeof obj !== 'object' || prof > 6) return undefined;
  for (const k of Object.keys(obj)) if (chaves.includes(k.toLowerCase()) && obj[k] != null && typeof obj[k] !== 'object') return obj[k];
  for (const v of Object.values(obj)) { const r = achar(v, chaves, prof + 1); if (r !== undefined) return r; }
  return undefined;
}
const valorNum = (v) => { if (v == null) return null; const n = Number(String(v).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

export function lerVenda(gateway, corpo) {
  const status = String(achar(corpo, ['status', 'order_status', 'event', 'webhook_event_type', 'sale_status']) || '').toLowerCase();
  const aprovada = /approved|aprovad|paid|pago|complete|order_approved|purchase_approved|compra_aprovada/.test(status);
  const reembolso = /refund|reembols|chargeback|cancel/.test(status);
  let valor = valorNum(achar(corpo, ['amount', 'value', 'price', 'valor', 'total', 'charge_amount', 'product_price', 'full_price', 'sale_amount']));
  if (valor != null && Number.isInteger(valor) && /kiwify/.test(gateway)) valor = valor / 100; // a Kiwify manda os valores em centavos
  const produto = String(achar(corpo, ['product_name', 'produto', 'name', 'offer_name']) || '').slice(0, 140);
  const pedido = String(achar(corpo, ['order_id', 'transaction', 'id', 'sale_id', 'code', 'refId']) || '').slice(0, 80);
  const txt = JSON.stringify(corpo).toLowerCase();
  const tipo = /"is_order_bump":\s*true|order_bump|orderbump/.test(txt) ? 'bump' : /upsell|one_click|"is_upsell":\s*true/.test(txt) ? 'upsell' : 'principal';
  return { aprovada, reembolso, valor, produto, pedido, tipo, status };
}

export async function registrarVenda(gateway, corpo) {
  const v = lerVenda(gateway, corpo);
  if (!v.aprovada && !v.reembolso) return { ignorado: v.status || 'sem status' };
  await run(`INSERT INTO vendas (gateway, pedido, produto, valor, tipo, status, quando) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(gateway, pedido, tipo) DO UPDATE SET status = excluded.status, valor = excluded.valor`,
    [gateway, v.pedido || `sem-id-${Date.now()}`, v.produto, v.valor, v.tipo, v.reembolso ? 'reembolso' : 'aprovada', agora()]);
  return { ok: true, tipo: v.tipo };
}

export async function resumoVendas(dias = 30) {
  const desde = agora() - dias * 86400;
  const l = await all("SELECT tipo, COUNT(*) n, SUM(valor) total FROM vendas WHERE status = 'aprovada' AND quando >= ? GROUP BY tipo", [desde]);
  const reemb = (await all("SELECT COUNT(*) n FROM vendas WHERE status = 'reembolso' AND quando >= ?", [desde]))[0]?.n || 0;
  const g = Object.fromEntries(l.map((r) => [r.tipo, r]));
  const principais = Number(g.principal?.n || 0), receita = l.reduce((s, r) => s + Number(r.total || 0), 0);
  return { dias, pedidos: principais, receita, ticketMedio: principais ? receita / principais : null,
    taxaBump: principais ? Number(g.bump?.n || 0) / principais : null, taxaUpsell: principais ? Number(g.upsell?.n || 0) / principais : null,
    precoPrincipal: principais ? Number(g.principal.total || 0) / principais : null, reembolsos: Number(reemb),
    porDia: Object.entries((await all("SELECT quando FROM vendas WHERE status = 'aprovada' AND tipo = 'principal' AND quando >= ?", [desde]))
      .reduce((m, r) => { const d = new Date(r.quando * 1000).toISOString().slice(0, 10); m[d] = (m[d] || 0) + 1; return m; }, {})).sort() };
}
