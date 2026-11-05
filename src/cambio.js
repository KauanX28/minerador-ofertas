// Câmbio para reais (Frankfurter / Banco Central Europeu: grátis, sem chave), com cache diário no banco.
import { all, run } from './banco.js';

const MOEDAS = ['USD', 'EUR', 'GBP', 'MXN'];
const RESERVA = { USD: 5.4, EUR: 5.9, GBP: 6.9, MXN: 0.29 }; // usado só se a API estiver fora do ar
let memoria = null;

export async function cambioHoje() {
  if (memoria) return memoria;
  const hoje = new Date().toISOString().slice(0, 10);
  const salvo = await all('SELECT moeda, brl FROM cambio WHERE data = ?', [hoje]).catch(() => []);
  if (salvo.length >= MOEDAS.length) return (memoria = Object.fromEntries(salvo.map((r) => [r.moeda, r.brl])));
  const taxas = { ...RESERVA };
  try {
    const r = await fetch(`https://api.frankfurter.app/latest?from=BRL&to=${MOEDAS.join(',')}`, { signal: AbortSignal.timeout(10000) });
    const d = await r.json();
    for (const m of MOEDAS) if (d.rates?.[m]) taxas[m] = Math.round((1 / d.rates[m]) * 10000) / 10000;
    for (const m of MOEDAS) {
      await run('INSERT INTO cambio (moeda, data, brl) VALUES (?, ?, ?) ON CONFLICT(moeda, data) DO UPDATE SET brl = excluded.brl', [m, hoje, taxas[m]]).catch(() => {});
    }
  } catch { /* fica com a reserva */ }
  return (memoria = taxas);
}
