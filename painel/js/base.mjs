// Base da interface: estado global, API, rotas com link próprio e utilitários de formatação.
import { h } from 'preact';
import { useLayoutEffect as useEffect, useState } from 'preact/hooks'; // roda logo após renderizar, mesmo com a aba em segundo plano
import htm from 'htm';

export const html = htm.bind(h);

// ---------- estado global simples (assinatura + re-render) ----------
const ouvintes = new Set();
export const loja = {
  pais: localStorage.paisAtual || 'BR', config: null, paises: [], perfil: null, sb: null, usuario: null, toast: null, tarefa: null, comparar: [],
};
export function definir(patch) { Object.assign(loja, patch); ouvintes.forEach((f) => f()); }
export function useLoja() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((n) => n + 1); ouvintes.add(f); return () => ouvintes.delete(f); }, []);
  return loja;
}

// ---------- rotas (History API: /oferta/123 é um link de verdade) ----------
const ouvRota = new Set();
export function navegar(url, { trocar = false } = {}) {
  if (url === location.pathname + location.search) return;
  history[trocar ? 'replaceState' : 'pushState']({}, '', url);
  ouvRota.forEach((f) => f());
  window.scrollTo(0, 0);
}
window.addEventListener('popstate', () => ouvRota.forEach((f) => f()));
// Links internos (<a href="/...">) navegam sem recarregar a página.
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href]');
  if (!a || a.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
  const href = a.getAttribute('href');
  if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/api/')) return;
  e.preventDefault();
  navegar(href);
});
export function useRota() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((n) => n + 1); ouvRota.add(f); return () => ouvRota.delete(f); }, []);
  return { caminho: location.pathname, busca: new URLSearchParams(location.search) };
}
// Lê e grava filtros na URL (?tipo=low&preco=47): a tela pode ser compartilhada e o "voltar" funciona.
export function useParams(padrao) {
  const { busca } = useRota();
  const atual = { ...padrao };
  for (const k of Object.keys(padrao)) if (busca.has(k)) atual[k] = busca.get(k);
  const mudar = (patch) => {
    const n = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(patch)) { if (v === '' || v == null || String(v) === String(padrao[k])) n.delete(k); else n.set(k, v); }
    if (!('pagina' in patch)) n.delete('pagina');
    const qs = n.toString();
    navegar(location.pathname + (qs ? '?' + qs : ''), { trocar: true });
  };
  return [atual, mudar];
}

// ---------- API ----------
export async function token() {
  if (!loja.sb) return null;
  const { data } = await loja.sb.auth.getSession();
  return data.session?.access_token || null;
}
export async function api(url, opcoes) {
  if ((!opcoes?.method || opcoes.method === 'GET') && !/[?&]pais=/.test(url)) url += (url.includes('?') ? '&' : '?') + 'pais=' + loja.pais;
  const t = await token();
  const r = await fetch(url, { ...(opcoes || {}), headers: { ...(opcoes?.headers || {}), ...(t ? { Authorization: `Bearer ${t}` } : {}) } });
  const d = await r.json().catch(() => ({}));
  if (d?.precisaLogin) { definir({ usuario: null, precisaLogin: d.erro || true }); throw new Error(d.erro || 'login necessário'); }
  if (d?.erro) throw new Error(d.erro);
  return d;
}
export const post = (url, corpo) => api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });

// Busca de dados com estado de carregamento; recarrega quando as dependências mudam.
export function useDados(url, deps = []) {
  const [st, set] = useState({ carregando: true, dados: null, erro: null });
  useEffect(() => {
    if (!url) { set({ carregando: false, dados: null, erro: null }); return; }
    let vivo = true;
    set((s) => ({ ...s, carregando: true, erro: null }));
    api(url).then((d) => vivo && set({ carregando: false, dados: d, erro: null })).catch((e) => vivo && set({ carregando: false, dados: null, erro: e.message }));
    return () => { vivo = false; };
  }, [url, loja.pais, ...deps]);
  return st;
}

// ---------- avisos ----------
let tToast;
export function aviso(msg) { definir({ toast: msg }); clearTimeout(tToast); tToast = setTimeout(() => definir({ toast: null }), 2800); }
export function copiar(txt) { navigator.clipboard.writeText(txt).then(() => aviso('Copiado')); }

// ---------- tarefas do robô ----------
export async function rodarTarefa(corpo) {
  try {
    const r = await post('/api/tarefa', corpo);
    if (!r.iniciado) return aviso('Já existe uma coleta em andamento. Aguarde terminar.');
    aviso(r.aviso || 'Pedido enviado ao robô');
    acompanhar();
  } catch (e) { aviso('Erro: ' + e.message); }
}
let pollId = null;
export async function acompanhar() {
  let t; try { t = await api('/api/tarefa'); } catch { return; }
  definir({ tarefa: t });
  if (t.rodando && !pollId) pollId = setInterval(acompanhar, 4000);
  if (!t.rodando && pollId) { clearInterval(pollId); pollId = null; aviso('Coleta concluída'); }
}

// ---------- formatação ----------
export const fmt = (n) => (n == null || n === '' ? '—' : Number(n).toLocaleString('pt-BR'));
export const compacto = (n) => (n == null ? '—' : Math.abs(n) >= 1e6 ? (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi'
  : Math.abs(n) >= 1e4 ? (n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : fmt(n));
export const brl = (v) => (v == null ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
export const diasDesde = (t) => (t ? Math.max(0, Math.floor((Date.now() / 1000 - t) / 86400)) : null);
export function relativo(t) {
  if (!t) return '—';
  const s = Date.now() / 1000 - (t > 1e12 ? t / 1000 : t);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'ontem' : d < 30 ? `há ${d} dias` : d < 365 ? `há ${Math.floor(d / 30)} meses` : `há ${Math.floor(d / 365)} anos`;
}
export const dataCurta = (iso) => (iso ? new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—');

// ---------- domínio ----------
export const PAISES = [['BR', 'Brasil'], ['PT', 'Portugal'], ['MX', 'México'], ['ES', 'Espanha'], ['AR', 'Argentina'], ['CO', 'Colômbia'],
  ['CL', 'Chile'], ['PE', 'Peru'], ['EC', 'Equador'], ['BO', 'Bolívia'], ['UY', 'Uruguai'], ['PY', 'Paraguai'], ['GT', 'Guatemala'],
  ['DO', 'Rep. Dominicana'], ['CR', 'Costa Rica'], ['PA', 'Panamá'], ['US', 'Estados Unidos'], ['CA', 'Canadá'], ['GB', 'Reino Unido'],
  ['IE', 'Irlanda'], ['AU', 'Austrália'], ['NZ', 'Nova Zelândia'], ['ZA', 'África do Sul'], ['IN', 'Índia'], ['PH', 'Filipinas'],
  ['IT', 'Itália'], ['FR', 'França'], ['DE', 'Alemanha'], ['NL', 'Holanda'], ['BE', 'Bélgica'], ['CH', 'Suíça'], ['PL', 'Polônia']];
export const nomePais = (c) => PAISES.find(([k]) => k === c)?.[1] || c;
export const TIPOS_OFERTA = { low: 'Low ticket', info_alto: 'Infoproduto médio/alto', app: 'App / assinatura', fisico: 'Produto físico',
  lancamento: 'Lançamento / evento', local: 'Negócio local', conversa: 'Venda por conversa (WhatsApp/Direct)', marca: 'Marca grande', indefinido: 'Sem classificação' };
export const STATUS = { 'Nova acelerando': 'st-nova', 'Escalada forte': 'st-forte', 'Escalada': 'st-escalada', 'Escalando agora': 'st-agora',
  'Validando': 'st-validando', 'Saturando/caindo': 'st-caindo', 'Teste': '' };
export const ETAPAS = [['minerada', 'Minerada'], ['validando', 'Validando'], ['modelando', 'Modelando'], ['testando', 'Testando'], ['escalando', 'Escalando'], ['descartada', 'Descartada']];
export const bib = {
  pagina: (id) => `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${loja.pais}&view_all_page_id=${id}&search_type=page&media_type=all`,
  busca: (q) => `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${loja.pais}&q=${encodeURIComponent(q)}&search_type=keyword_unordered&media_type=all`,
  anuncio: (id) => `https://www.facebook.com/ads/library/?id=${id}`,
};
export const nomeGateway = (id) => loja.config?.gateways?.find((g) => g.id === id)?.nome || id;

// ---------- exportação ----------
export function exportarCSV(nome, linhas, colunas) {
  const cel = (v) => { const s = String(v ?? '').replace(/"/g, '""'); return /[;"\n]/.test(s) ? `"${s}"` : s; };
  const csv = [colunas.map((c) => cel(c[0])).join(';'), ...linhas.map((l) => colunas.map((c) => cel(c[1](l))).join(';'))].join('\n');
  baixar(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${nome}-${loja.pais}-${new Date().toISOString().slice(0, 10)}.csv`);
}
// XLSX com SheetJS, carregado só quando alguém exporta (não pesa no carregamento do painel).
export async function exportarXLSX(nome, linhas, colunas) {
  if (!window.XLSX) await new Promise((ok, erro) => { const s = document.createElement('script'); s.src = '/vendor/xlsx.mini.min.js'; s.onload = ok; s.onerror = erro; document.head.append(s); });
  const dados = linhas.map((l) => Object.fromEntries(colunas.map((c) => [c[0], c[1](l) ?? ''])));
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(dados), nome.slice(0, 30));
  window.XLSX.writeFile(wb, `${nome}-${loja.pais}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
function baixar(blob, arquivo) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = arquivo; a.click(); }

export async function favoritar(tipo, chave, nome, remover) {
  await post('/api/favoritos', { tipo, chave, nome, remover });
  aviso(remover ? 'Removido das suas listas' : 'Salvo em Minhas listas (etapa: Minerada)');
}
