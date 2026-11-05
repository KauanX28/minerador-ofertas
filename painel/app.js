// Minerador de Ofertas — interface (SPA sem framework).
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const js = (v) => esc(JSON.stringify(v));
const fmt = (n) => (n == null || n === '' ? '—' : Number(n).toLocaleString('pt-BR'));
const quando = (t) => (t ? new Date(t * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
const diasDesde = (t) => (t ? Math.max(0, Math.floor((Date.now() / 1000 - t) / 86400)) : null);

// ---------- ícones (traço) ----------
const ICONES = {
  uso: '<path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  painel: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  ofertas: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  anuncios: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  gateways: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  dominio: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>',
  minerar: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  listas: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="9" y2="11"/><line x1="12" y1="11" x2="13" y2="11"/><line x1="16" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="9" y2="15"/><line x1="12" y1="15" x2="13" y2="15"/><line x1="16" y1="15" x2="16" y2="18"/>',
  prompts: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  metodo: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  estrela: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  externo: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  baixar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  atualizar: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  fechar: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  lua: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  copiar: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  grade: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  lista: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
};
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24">${ICONES[n] || ''}</svg>`;

const MENU = [
  ['Análise', [['inicio', 'Painel', 'painel'], ['ofertas', 'Ofertas escaladas', 'ofertas'], ['anuncios', 'Biblioteca de anúncios', 'anuncios'],
    ['gateways', 'Gateways', 'gateways'], ['dominios', 'Análise de domínio', 'dominio']]],
  ['Coleta', [['minerar', 'Minerar', 'minerar'], ['listas', 'Minhas listas', 'listas']]],
  ['Recursos', [['ferramentas', 'Calculadoras e plano', 'calc'], ['prompts', 'Prompts de IA', 'prompts'], ['metodo', 'Método', 'metodo'], ['uso', 'Uso e limites', 'uso'], ['config', 'Configurações', 'config']]],
];

// ---------- países ----------
const PAISES = [['BR', 'Brasil'], ['PT', 'Portugal'], ['MX', 'México'], ['ES', 'Espanha'], ['AR', 'Argentina'], ['CO', 'Colômbia'],
  ['CL', 'Chile'], ['PE', 'Peru'], ['EC', 'Equador'], ['BO', 'Bolívia'], ['UY', 'Uruguai'], ['PY', 'Paraguai'], ['GT', 'Guatemala'],
  ['DO', 'Rep. Dominicana'], ['CR', 'Costa Rica'], ['PA', 'Panamá'], ['US', 'Estados Unidos'], ['CA', 'Canadá'], ['GB', 'Reino Unido'],
  ['IE', 'Irlanda'], ['AU', 'Austrália'], ['NZ', 'Nova Zelândia'], ['ZA', 'África do Sul'], ['IN', 'Índia'], ['PH', 'Filipinas'],
  ['IT', 'Itália'], ['FR', 'França'], ['DE', 'Alemanha'], ['NL', 'Holanda'], ['BE', 'Bélgica'], ['CH', 'Suíça'], ['PL', 'Polônia']];
const nomePais = (c) => PAISES.find(([k]) => k === c)?.[1] || c;
let PAIS = localStorage.paisAtual || 'BR';
let PAISES_COM_DADOS = [];
let CONFIG = null;
const opcoesPais = (sel = PAIS) => PAISES.map(([c, n]) => `<option value="${c}" ${c === sel ? 'selected' : ''}>${c} · ${n}</option>`).join('');

const STATUS = { 'Nova acelerando': 'st-nova', 'Escalada forte': 'st-forte', 'Escalada': 'st-escalada', 'Escalando agora': 'st-agora', 'Validando': 'st-validando', 'Saturando/caindo': 'st-caindo', 'Teste': '' };
const bib = {
  pagina: (id) => `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${PAIS}&view_all_page_id=${id}&search_type=page&media_type=all`,
  busca: (q) => `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${PAIS}&q=${encodeURIComponent(q)}&search_type=keyword_unordered&media_type=all`,
  anuncio: (id) => `https://www.facebook.com/ads/library/?id=${id}`,
};

// ---------- utilidades ----------
// ---------- login (Supabase Auth) ----------
let SB = null; // cliente do Supabase quando o login está ativo (nuvem)
async function tokenAtual() {
  if (!SB) return null;
  const { data } = await SB.auth.getSession();
  return data.session?.access_token || null;
}
function telaLogin(msg = '') {
  document.body.classList.add('sem-acesso');
  $('#conteudo').innerHTML = `<div class="login"><div class="painel-box"><div class="pb-corpo">
    <div class="marca-login"><span class="logo">M</span>Minerador</div>
    <h1>Entrar</h1><p class="mut">Use o e-mail autorizado para este painel.</p>
    ${msg ? `<div class="aviso-erro">${esc(msg)}</div>` : ''}
    <form id="fLogin" class="login-form">
      <label class="campo">E-mail<input id="lEmail" type="email" required autocomplete="email"></label>
      <label class="campo">Senha<input id="lSenha" type="password" autocomplete="current-password" placeholder="deixe vazio para receber um link por e-mail"></label>
      <button class="pri" type="submit">Entrar</button>
      <button class="fantasma" type="button" id="lCriar">Primeiro acesso: criar conta com este e-mail</button>
    </form></div></div></div>`;
  const email = () => $('#lEmail').value.trim(), senha = () => $('#lSenha').value;
  $('#fLogin').onsubmit = async (e) => {
    e.preventDefault();
    if (!senha()) {
      const { error } = await SB.auth.signInWithOtp({ email: email(), options: { emailRedirectTo: location.origin } });
      return error ? telaLogin(error.message) : toast('Enviamos um link de acesso para o seu e-mail.');
    }
    const { error } = await SB.auth.signInWithPassword({ email: email(), password: senha() });
    if (error) return telaLogin(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
    location.reload();
  };
  $('#lCriar').onclick = async () => {
    if (!email() || senha().length < 8) return toast('Informe o e-mail e uma senha com 8+ caracteres.');
    const { error } = await SB.auth.signUp({ email: email(), password: senha(), options: { emailRedirectTo: location.origin } });
    toast(error ? error.message : 'Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.');
  };
}
async function sair() { await SB?.auth.signOut(); location.reload(); }

async function api(url, opcoes) {
  if ((!opcoes || !opcoes.method || opcoes.method === 'GET') && url.startsWith('/api/') && !/[?&]pais=/.test(url)) url += (url.includes('?') ? '&' : '?') + 'pais=' + PAIS;
  const token = await tokenAtual();
  const headers = { ...(opcoes?.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const r = await fetch(url, { ...(opcoes || {}), headers });
  const d = await r.json().catch(() => ({}));
  if (d?.precisaLogin) { telaLogin(r.status === 403 ? d.erro : ''); throw new Error(d.erro || 'login necessário'); }
  if (d?.erro) throw new Error(d.erro);
  return d;
}
const post = (url, corpo) => api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2800); }
function copiar(txt) { navigator.clipboard.writeText(txt).then(() => toast('Copiado para a área de transferência')); }
function abrirGaveta(titulo, html) { $('#gavetaTitulo').innerHTML = titulo; $('#gavetaCorpo').innerHTML = html; $('#gaveta').classList.add('on'); $('#fundo').classList.add('on'); }
function fecharGaveta() { $('#gaveta').classList.remove('on'); $('#fundo').classList.remove('on'); $$('#gaveta video').forEach((v) => v.pause()); }
document.addEventListener('keydown', (e) => e.key === 'Escape' && fecharGaveta());

function exportarCSV(nome, linhas, colunas) {
  const cel = (v) => { const s = String(v ?? '').replace(/"/g, '""'); return /[;"\n]/.test(s) ? `"${s}"` : s; };
  const csv = [colunas.map((c) => cel(c[0])).join(';'), ...linhas.map((l) => colunas.map((c) => cel(c[1](l))).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${nome}-${PAIS}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// Tabela ordenável genérica: colunas = [titulo, render(l), chaveOrdenacao?, classe?]
function tabela(id, linhas, colunas, estado) {
  const { k, asc } = estado;
  if (k) {
    const col = colunas.find((c) => c[2] === k);
    const val = col?.[4] || ((l) => l[k]);
    linhas = [...linhas].sort((a, b) => { const x = val(a) ?? -Infinity, y = val(b) ?? -Infinity; return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1); });
  }
  return `<table class="tabela" id="${id}"><thead><tr>${colunas.map((c) => `<th ${c[2] ? `data-k="${c[2]}"` : ''} class="${c[3] || ''} ${c[2] && c[2] === k ? 'ord' + (asc ? ' asc' : '') : ''}">${c[0]}</th>`).join('')}</tr></thead>
    <tbody>${linhas.map((l, i) => `<tr>${colunas.map((c) => `<td class="${c[3] || ''}">${c[1](l, i)}</td>`).join('')}</tr>`).join('') ||
    `<tr><td colspan="${colunas.length}" class="vazio">Nenhum resultado.</td></tr>`}</tbody></table>`;
}
function ligarOrdenacao(el, estado, redesenhar) {
  $$('th[data-k]', el).forEach((th) => (th.onclick = () => {
    if (estado.k === th.dataset.k) estado.asc = !estado.asc; else { estado.k = th.dataset.k; estado.asc = false; }
    redesenhar();
  }));
}

const tagStatus = (s) => `<span class="tag ${STATUS[s] || ''}">${esc(s)}</span>`;
const tagsGw = (gws) => (gws || []).map((g) => `<span class="tag tg-gw">${esc(g)}</span>`).join(' ');
const explicarScore = (fatores) => (fatores || []).map((f) => `${f.nome}: ${f.pontos} de ${f.peso} (${f.detalhe})`).join('\n');
const barraScore = (n, fatores) => `<div class="score" title="${esc(fatores ? 'Como a nota foi calculada:\n' + explicarScore(fatores) : '')}"><b>${n}</b><i><span style="width:${Math.min(100, n)}%"></span></i></div>`;
// Bloco "Por que essa nota" na página do anunciante.
const blocoScore = (p) => !p.fatores ? '' : `
  <div class="painel-box" style="margin-bottom:14px"><div class="pb-cab"><h2>Por que essa nota</h2><span class="mut peq">score ${p.score} · oportunidade de modelagem ${p.oportunidade}</span></div>
    <div class="pb-corpo fatores">${p.fatores.map((f) => `
      <div class="fator"><div class="fator-cab"><span>${esc(f.nome)}</span><b class="num">${f.pontos}<span class="mut">/${f.peso}</span></b></div>
        <i><span style="width:${Math.round(100 * f.nota)}%"></span></i><small class="mut">${esc(f.detalhe)}</small></div>`).join('')}
      <p class="peq mut" style="margin:4px 0 0;grid-column:1/-1">Oportunidade: ${esc(p.motivoOport || '')}. Quanto menos contas usando a mesma estrutura, mais espaço para modelar.</p></div></div>`;
const cresc = (p) => (p.crescimento == null ? '<span class="mut">—</span>'
  : `<span class="${p.crescimento >= 0 ? 'cresce' : 'cai'}">${p.crescimento >= 0 ? '+' : ''}${p.crescimento}${p.crescimentoPct != null ? ` (${p.crescimentoPct}%)` : ''}</span>`);
const entidade = (img, t1, t2) => `<div class="ent">${img ? `<img src="${esc(img)}" loading="lazy">` : '<div class="av"></div>'}<div><div class="t1" title="${esc(t1)}">${esc(t1)}</div>${t2 ? `<div class="t2" title="${esc(t2)}">${esc(t2)}</div>` : ''}</div></div>`;
const btEstrela = (tipo, chave, nome, on) => `<button class="bt-ic ${on ? 'on' : ''}" title="Salvar em Minhas listas" onclick='favoritar(event, ${js(tipo)}, ${js(chave)}, ${js(nome)})'>${ic('estrela')}</button>`;

async function favoritar(ev, tipo, chave, nome) {
  ev?.stopPropagation();
  const btn = ev?.currentTarget;
  const remover = btn?.classList.contains('on');
  await post('/api/favoritos', { tipo, chave, nome, remover });
  btn?.classList.toggle('on', !remover);
  toast(remover ? 'Removido de Minhas listas' : 'Salvo em Minhas listas');
}

// ---------- tarefas de coleta ----------
let pollId = null;
async function rodarTarefa(corpo) {
  try {
    const r = await post('/api/tarefa', corpo);
    if (!r.iniciado) return toast('Já existe uma coleta em andamento. Aguarde terminar.');
    toast(r.aviso || 'Coleta iniciada');
    acompanhar();
  } catch (e) { toast('Erro: ' + e.message); }
}
async function acompanhar() {
  let t;
  try { t = await api('/api/tarefa'); } catch { return; }
  const box = $('#statusTarefa');
  const ultima = (t.log || []).filter(Boolean).slice(-1)[0] || '';
  if (t.rodando) {
    box.classList.add('on');
    box.innerHTML = `<span class="ponto vivo"></span><b>${esc(t.descricao || t.tipo)}</b> <span class="mut">${esc(ultima.trim().slice(0, 60))}</span>`;
    if (!pollId) pollId = setInterval(acompanhar, 3000);
  } else {
    const recente = t.fim && Date.now() - t.fim < 60000;
    box.classList.toggle('on', !!recente);
    box.innerHTML = recente ? `<span class="ponto"></span>Concluído: ${esc(t.descricao || '')}` : '';
    if (pollId) { clearInterval(pollId); pollId = null; carregarPaises().then(rota); toast('Coleta concluída'); }
  }
  const lg = $('#logTarefa');
  if (lg) { lg.textContent = (t.log || []).join('\n') || 'Nenhuma coleta em andamento.'; lg.scrollTop = lg.scrollHeight; }
}
$('#statusTarefa').onclick = () => (location.hash = '#/minerar');

// ---------- busca global ----------
function tipoDaBusca(termo, tipo) {
  if (tipo !== 'auto') return tipo;
  const t = termo.toLowerCase();
  if (CONFIG.gateways.some((g) => g.id === t.replace(/\s/g, '') || g.nome.toLowerCase() === t)) return 'gateway';
  if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) {
    const host = t.replace(/^https?:\/\//, '').split('/')[0];
    const g = CONFIG.gateways.find((x) => host === x.raiz || host.endsWith('.' + x.raiz));
    if (g && !/\/[\w-]{3,}/.test(t.replace(/^https?:\/\//, ''))) return 'gateway';
    return 'dominio';
  }
  return 'palavra';
}
$('#buscaGlobal').onsubmit = (e) => {
  e.preventDefault();
  const termo = $('#buscaTermo').value.trim();
  if (!termo) return;
  const tipo = tipoDaBusca(termo, $('#buscaTipo').value);
  if (tipo === 'gateway') {
    const t = termo.toLowerCase();
    const g = CONFIG.gateways.find((x) => t.includes(x.id) || t.includes(x.raiz) || x.nome.toLowerCase() === t);
    if (!g) return toast('Gateway não reconhecido');
    location.hash = '#/gateways/' + g.id;
  } else if (tipo === 'dominio') abrirDominio(termo);
  else { filtrosAnuncios.texto = termo; location.hash = '#/anuncios'; if (location.hash === '#/anuncios') rota(); }
};

// ---------- detalhe do anunciante ----------
async function abrirPagina(id) {
  abrirGaveta('<span class="mut">Carregando…</span>', '');
  const d = await api('/api/pagina/' + encodeURIComponent(id));
  const p = d.pagina || { nome: id };
  const maxH = Math.max(1, ...d.historico.map((h) => h.ativos));
  abrirGaveta(`<div class="linha">${entidade(p.foto, p.nome, `${nomePais(PAIS)} · ${p.categorias || ''}`)}${p.status ? tagStatus(p.status) : ''}</div>`, `
    <div class="kpis" style="margin-bottom:14px">
      <div class="kpi"><span>Anúncios ativos</span><b>${fmt(p.ativos)}</b><small>${p.dataContagem ? 'contados em ' + p.dataContagem : 'estimado'}</small></div>
      <div class="kpi"><span>Crescimento</span><b>${p.crescimento == null ? '—' : cresc(p)}</b><small>vs. contagem anterior</small></div>
      <div class="kpi"><span>Dias rodando</span><b>${p.dias ?? '—'}</b><small>anúncio ativo mais antigo</small></div>
      <div class="kpi"><span>Score</span><b>${p.score ?? '—'}</b><small>oportunidade ${p.oportunidade ?? '—'}</small></div>
    </div>
    ${blocoScore(p)}
    <div class="linha" style="margin-bottom:12px">
      <a class="bt-p" href="${bib.pagina(id)}" target="_blank">${ic('externo')} Abrir na Biblioteca</a>
      ${(p.dominios || []).map((dm) => `<button class="bt-p" onclick='abrirDominio(${js(dm.split('/')[0])})'>${ic('dominio')} ${esc(dm)}</button>`).join('')}
      ${tagsGw(p.gateways)} ${p.preco ? `<span class="preco">${esc(p.preco)}</span>` : ''}
      ${btEstrela('pagina', id, p.nome, p.favorito)}
    </div>
    ${d.historico.length > 1 ? `<div class="painel-box" style="margin-bottom:14px"><div class="pb-corpo"><div class="peq mut">Anúncios ativos por dia (${esc(d.historico[0].data)} → ${esc(d.historico.at(-1).data)})</div>
      <div class="hist">${d.historico.map((h) => `<div title="${h.data}: ${h.ativos}" style="height:${Math.max(3, 60 * h.ativos / maxH)}px"></div>`).join('')}</div></div></div>` : ''}
    <div class="secao-cab"><h2>Anúncios (${d.anuncios.length})</h2></div>
    <div class="ads">${d.anuncios.map(cartaoAnuncio).join('')}</div>`);
}

function cartaoAnuncio(a) {
  const dias = diasDesde(a.inicio);
  const midia = a.video ? `<video src="${esc(a.video)}" poster="${esc(a.thumb || '')}" controls preload="none"></video>`
    : a.thumb ? `<img src="${esc(a.thumb)}" loading="lazy">` : '<div style="height:80px"></div>';
  return `<div class="ad">
    <div class="ad-cab"><b title="${esc(a.page_name)}">${esc(a.page_name || '')}</b>${a.ativo === 0 ? '<span class="tag">inativo</span>' : ''}</div>
    <div class="ad-midia">${midia}${a.formato ? `<span class="selo">${esc(a.formato)}</span>` : ''}</div>
    <div class="ad-met"><div><b>${dias ?? '—'}</b><span>dias</span></div><div><b>${a.dup || 1}x</b><span>variações</span></div><div><b title="${esc(a.cta || '')}">${esc((a.cta || '—').slice(0, 12))}</b><span>CTA</span></div></div>
    <div class="ad-info">${a.titulo ? `<b>${esc(a.titulo)}</b>` : ''}<div class="txt">${esc(a.texto)}</div>
      ${a.gateway ? `<div>${tagsGw([CONFIG.gateways.find((g) => g.id === a.gateway)?.nome || a.gateway])}</div>` : ''}</div>
    <div class="rod">
      <button class="bt-p" title="Copiar texto" onclick='copiar(${js(a.texto || '')})'>${ic('copiar')}</button>
      <button class="bt-p" onclick='modelarCriativo(${js({ texto: a.texto || '', titulo: a.titulo || '' })})'>Modelar</button>
      ${a.video ? `<a class="bt-p" href="${esc(a.video)}" target="_blank" download title="Baixar vídeo">${ic('baixar')}</a>` : a.thumb ? `<a class="bt-p" href="${esc(a.thumb)}" target="_blank" title="Abrir imagem">${ic('baixar')}</a>` : ''}
      <a class="bt-p" href="${bib.anuncio(a.ad_id)}" target="_blank" title="Ver na Biblioteca">${ic('externo')}</a>
      ${a.link ? `<a class="bt-p" href="${esc(a.link)}" target="_blank">Destino</a>` : ''}
    </div></div>`;
}

function modelarCriativo(ad) {
  const base = `${ad.titulo ? 'Título: ' + ad.titulo + '\n' : ''}${ad.texto}`;
  abrirGaveta('<b>Modelar criativo</b>', `<p class="mut">Copie um prompt e use no ChatGPT, Claude ou Gemini. Para vídeo, transcreva antes (TurboScribe) e cole a transcrição.</p>
    ${window.PROMPTS.filter((p) => p.criativo).map((p) => { const t = p.texto.replace('{{CRIATIVO}}', base).replaceAll('{{NICHO}}', '[SEU PRODUTO]');
      return `<div class="painel-box" style="margin-bottom:10px"><div class="pb-corpo"><div class="linha" style="justify-content:space-between"><b>${esc(p.titulo)}</b>
      <button class="bt-p" onclick='copiar(${js(t)})'>${ic('copiar')} Copiar</button></div><pre class="prompt">${esc(t)}</pre></div></div>`; }).join('')}`);
}

// ---------- detalhe de domínio (raio-x) ----------
async function abrirDominio(entrada) {
  abrirGaveta('<span class="mut">Carregando…</span>', '');
  const { dados: a, links } = await api('/api/analise?url=' + encodeURIComponent(entrada));
  const dominio = a?.dominio || entrada.replace(/^https?:\/\//, '').split('/')[0];
  const atalhos = `<div class="linha" style="margin:4px 0 14px">${Object.entries(links || {}).map(([n, u]) => `<a class="bt-p" href="${esc(u)}" target="_blank">${esc(n)} ${ic('externo')}</a>`).join('')}</div>`;
  if (!a) {
    return abrirGaveta(`<b>${esc(dominio)}</b>`, `<div class="painel-box"><div class="pb-corpo"><p>Este domínio ainda não foi analisado.</p>
      <p class="mut peq">A análise abre a página, identifica gateway, checkout, preço, VSL, quiz e rastreadores, lê o sitemap.xml e conta os anúncios que levam para o domínio no país selecionado (${PAIS}).</p>
      <button class="pri" onclick='rodarTarefa({tipo:"analisar",url:${js(entrada)},pais:PAIS});fecharGaveta()'>Analisar agora</button></div></div>
      <div class="secao"><div class="secao-cab"><h2>Ferramentas externas</h2></div>${atalhos}</div>`);
  }
  const t = a.tecnologia || {};
  const sn = (v, txt) => `<div class="check"><span class="${v ? 'sim' : 'nao'}">${v ? '✓' : '–'}</span>${txt}</div>`;
  abrirGaveta(`<div class="linha"><b>${esc(a.dominio)}</b><span class="mut peq">analisado em ${quando(a.quando)}</span></div>`, `
    <div class="kpis" style="margin-bottom:14px">
      <div class="kpi"><span>Anúncios para o domínio</span><b>${fmt(a.biblioteca?.total)}</b><small>na Biblioteca</small></div>
      <div class="kpi"><span>Páginas anunciando</span><b>${fmt(a.biblioteca?.paginas?.length)}</b><small>${(a.biblioteca?.paginas?.length || 0) > 1 ? 'várias contas: sinal de escala' : ''}</small></div>
      <div class="kpi"><span>Gateway</span><b style="font-size:16px">${esc((a.gateways || []).join(', ') || '—')}</b></div>
      <div class="kpi"><span>Preço principal</span><b style="font-size:18px">${esc(a.checkouts?.[0]?.preco || a.precos?.[0] || '—')}</b></div>
    </div>
    ${atalhos}
    <div class="grade-2">
      <div class="painel-box"><div class="pb-cab"><h2>Página</h2>${a.urlFinal ? `<a class="bt-p" href="${esc(a.urlFinal)}" target="_blank">Abrir ${ic('externo')}</a>` : ''}</div><div class="pb-corpo">
        ${a.imagem ? `<img src="${esc(a.imagem)}" style="width:100%;max-height:180px;object-fit:cover;border-radius:6px;margin-bottom:8px">` : ''}
        <b>${esc(a.titulo || '')}</b><div class="mut peq">${esc(a.descricao || '')}</div>
        ${(a.manchetes || []).length ? `<div class="peq" style="margin-top:8px">${a.manchetes.map((m) => `<div>· ${esc(m)}</div>`).join('')}</div>` : ''}
        ${(a.precos || []).length ? `<div class="peq" style="margin-top:8px"><span class="mut">Preços na página:</span> ${a.precos.slice(0, 6).map(esc).join(' · ')}</div>` : ''}</div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Checkout</h2></div><div class="pb-corpo">
        ${(a.checkouts || []).map((c) => `<div style="margin-bottom:8px"><div class="linha"><b>${esc(c.produto || c.checkout)}</b>${c.preco ? `<span class="preco">${esc(c.preco)}</span>` : ''}</div>
          <a class="peq" href="${esc(c.url)}" target="_blank">${esc(c.checkout)}</a></div>`).join('') || '<span class="mut">Nenhum link de checkout visível (pode estar dentro do quiz ou do vídeo).</span>'}</div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Estrutura do funil</h2></div><div class="pb-corpo"><dl class="lista-def">
        <dt>VSL</dt><dd>${esc((t.vsl || []).join(', ') || '—')}</dd><dt>Quiz</dt><dd>${esc((t.quiz || []).join(', ') || '—')}</dd>
        <dt>Rastreamento</dt><dd>${esc((t.rastreio || []).join(', ') || '—')}</dd><dt>Construtor</dt><dd>${esc((t.construtor || []).join(', ') || '—')}</dd>
        <dt>Palavras</dt><dd>${fmt(a.palavras)}</dd></dl></div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Gatilhos</h2></div><div class="pb-corpo">
        ${sn(a.temGarantia, 'Garantia')}${sn(a.temBonus, 'Bônus')}${sn(a.temDepoimentos, 'Depoimentos / prova social')}${sn(a.temEscassez, 'Escassez / urgência')}</div></div>
    </div>
    ${a.biblioteca?.paginas?.length ? `<div class="secao"><div class="secao-cab"><h2>Páginas que anunciam o domínio</h2></div><div class="painel-box rolar">
      ${tabela('tbRota', a.biblioteca.paginas, [['Página', (p) => `<a href="#" onclick='abrirPagina(${js(p.page_id)});return false'>${esc(p.nome)}</a>`],
        ['Anúncios vistos', (p) => fmt(p.anuncios), null, 'dir'], ['Desde', (p) => (p.inicio ? new Date(p.inicio * 1000).toLocaleDateString('pt-BR') : '—'), null, 'dir']], {})}</div></div>` : ''}
    ${(a.sitemap || []).length ? `<div class="secao"><div class="secao-cab"><h2>sitemap.xml</h2><span class="mut peq">${a.sitemap.length} páginas, mais recentes primeiro</span></div>
      <div class="painel-box rolar" style="max-height:280px">${tabela('tbSm', a.sitemap, [['Atualizada', (s) => esc((s.lastmod || '').slice(0, 10)) || '—'], ['URL', (s) => `<a href="${esc(s.url)}" target="_blank">${esc(s.url)}</a>`]], {})}</div></div>` : ''}
    <div class="linha secao"><button onclick='rodarTarefa({tipo:"analisar",url:${js(a.dominio)},pais:PAIS})'>${ic('atualizar')} Refazer análise</button>
      ${btEstrela('oferta', a.dominio, a.dominio, false)}</div>`);
}

// ---------- telas ----------
const TELAS = {};
const TIPOS_OFERTA = { low: 'Low ticket (infoproduto)', info_alto: 'Infoproduto médio/alto', app: 'App / assinatura', fisico: 'Produto físico',
  lancamento: 'Lançamento / evento', local: 'Negócio local', marca: 'Marca grande', indefinido: 'Ainda sem classificação' };
const brl = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');
const celPreco = (preco, precoBrl, origem) => {
  if (!preco && precoBrl == null) return '<span class="mut">—</span>';
  const conv = precoBrl != null && preco && !/^R\$/.test(preco) ? `<br><span class="mut peq">≈ ${brl(precoBrl)}</span>` : '';
  return `<span class="preco" title="${origem ? 'Preço lido no ' + esc(origem) : ''}">${esc(preco || brl(precoBrl))}</span>${conv}`;
};

const colsAnunciantes = (comNicho) => [
  ['#', (p, i) => `<span class="mut num">${i + 1}</span>`],
  ['Anunciante', (p) => `<a href="#" onclick='abrirPagina(${js(p.page_id)});return false' style="color:inherit;text-decoration:none">${entidade(p.foto || p.thumb, p.nome, p.produto || p.dominios?.[0] || p.titulo)}</a>`, 'nome'],
  ['Status', (p) => tagStatus(p.status), 'status'],
  ['Anúncios ativos', (p) => `<b class="num">${fmt(p.ativos)}</b>${p.ativosConfirmado === false ? ' <span class="mut peq" title="Estimado pelos anúncios vistos na busca">est.</span>' : ''}`, 'ativos', 'dir'],
  ['Crescimento', cresc, 'crescimento', 'dir'],
  ['Dias', (p) => `<span class="num">${p.dias}</span>`, 'dias', 'dir'],
  ['Variações', (p) => `<span class="num">${p.dupMax}x</span>`, 'dupMax', 'dir'],
  ['Gateway', (p) => tagsGw(p.gateways) || '<span class="mut">—</span>'],
  ['Preço', (p) => celPreco(p.preco, p.precoBrl, p.precoOrigem), 'precoBrl'],
  ['Funil', (p) => esc(p.funil || '—')],

  ['Score', (p) => barraScore(p.score, p.fatores), 'score'],
  ['Oportunidade', (p) => `<span class="num" title="${esc(p.motivoOport || '')}">${p.oportunidade ?? '—'}</span>`, 'oportunidade', 'dir'],
  ['', (p) => `${btEstrela('pagina', p.page_id, p.nome, p.favorito)}<a class="bt-ic" href="${bib.pagina(p.page_id)}" target="_blank" title="Abrir na Biblioteca">${ic('externo')}</a>`, null, 'acoes'],
];
const csvAnunciantes = [['Anunciante', (p) => p.nome], ['País', () => PAIS], ['Status', (p) => p.status], ['Anúncios ativos', (p) => p.ativos], ['Crescimento', (p) => p.crescimento],
  ['Dias', (p) => p.dias], ['Variações', (p) => p.dupMax], ['Gateways', (p) => (p.gateways || []).join(', ')], ['Preço', (p) => p.preco], ['Produto', (p) => p.produto],
  ['Funil', (p) => p.funil], ['Site', (p) => p.dominios?.[0]], ['Nichos', (p) => (p.nichos || []).join(', ')], ['Score', (p) => p.score], ['Oportunidade', (p) => p.oportunidade],
  ['Var. 7 dias', (p) => p.var7], ['Var. 30 dias', (p) => p.var30], ['Criativos novos (7d)', (p) => p.novos7], ['Biblioteca', (p) => bib.pagina(p.page_id)]];

TELAS.inicio = async (el) => {
  const d = await api('/api/painel');
  const est = {};
  const c = colsAnunciantes();
  const mini = (id, lista) => `<div class="painel-box rolar">${tabela(id, lista, [c[1], c[3], c[4], c[5], c.find((x) => x[0] === 'Score')], est)}</div>`;
  el.innerHTML = `
  <div class="cab"><div><h1>Painel</h1><p>${esc(nomePais(PAIS))} · ofertas e anunciantes mapeados na Biblioteca de Anúncios</p></div>
    <div class="linha"><button onclick="rodarTarefa({tipo:'atualizar'})">${ic('atualizar')} Atualizar contagens</button><button class="pri" onclick="location.hash='#/minerar'">Nova mineração</button></div></div>
  <div class="kpis">
    <div class="kpi"><span>Anunciantes</span><b>${fmt(d.paginas)}</b><small>${fmt(d.escaladas)} escalados</small></div>
    <div class="kpi"><span>Anúncios ativos salvos</span><b>${fmt(d.anuncios)}</b></div>
    <div class="kpi"><span>Escalando agora</span><b>${fmt(d.escalandoAgora.length)}</b><small>novas acelerando ou crescendo rápido</small></div>
    <div class="kpi"><span>Domínios analisados</span><b>${fmt(d.analises)}</b></div>
    <div class="kpi"><span>Última coleta</span><b style="font-size:16px">${quando(d.ultimaBusca)}</b><small>${d.buscas7d} buscas em 7 dias</small></div>
  </div>
  ${d.paginas ? `
  <div class="grade-2 secao">
    <div><div class="secao-cab"><h2>Mais escaladas</h2><a href="#/ofertas" class="peq">Ver ranking completo</a></div>${mini('tbTop', d.top)}</div>
    <div><div class="secao-cab"><h2>Escalando agora</h2><span class="mut peq">novas acelerando e crescimento forte entre contagens</span></div>
      ${d.escalandoAgora.length ? mini('tbAgora', d.escalandoAgora) : '<div class="painel-box vazio">Rode "Atualizar contagens" em dias diferentes para medir crescimento.</div>'}</div>
    <div><div class="secao-cab"><h2>Novas e fortes</h2><span class="mut peq">até 14 dias e 10+ anúncios</span></div>
      ${d.novas.length ? mini('tbNovas', d.novas) : '<div class="painel-box vazio">Nenhuma oferta nova forte ainda.</div>'}</div>
    <div><div class="secao-cab"><h2>Melhores para modelar</h2><span class="mut peq">escaladas e com poucas contas usando o mesmo criativo</span></div>
      ${d.oportunidades?.length ? `<div class="painel-box rolar">${tabela('tbOport', d.oportunidades, [c[1], c[2], c[3], c.find((x) => x[0] === 'Oportunidade')], est)}</div>` : '<div class="painel-box vazio">Aparece quando houver anunciantes escalados.</div>'}</div>
    <div><div class="secao-cab"><h2>Gateways</h2><a href="#/gateways" class="peq">Ver todos</a></div>
      <div class="painel-box rolar">${tabela('tbGw', d.gateways, [['Gateway', (g) => `<a href="#/gateways/${g.id}"><b>${esc(g.nome)}</b></a>`],
        ['Na Biblioteca', (g) => fmt(g.totalBiblioteca), null, 'dir'], ['Checkouts', (g) => fmt(g.checkouts), null, 'dir'], ['Anunciantes', (g) => fmt(g.paginas), null, 'dir']], {})}</div></div>
  </div>` : `<div class="painel-box vazio secao">Nenhum dado de ${esc(nomePais(PAIS))} ainda. <a href="#/minerar">Comece uma mineração</a> ou pesquise um gateway na barra de busca.</div>`}`;
};

let filtrosOfertas = { aba: 'paginas', nicho: '', status: '', min: '', dias: '', busca: '', gateway: '', funil: '', tipo: 'low', precoMax: null, semPreco: true, idioma: '' };
const ordOfertas = { k: 'score', asc: false };
TELAS.ofertas = async (el) => {
  const f = filtrosOfertas;
  if (f.precoMax == null) f.precoMax = String(CONFIG.precoMaxFiltro ?? 47);
  el.innerHTML = `
  <div class="cab"><div><h1>Ofertas escaladas</h1><p>${esc(nomePais(PAIS))} · ranking por anúncios ativos, tempo rodando, variações de criativo e crescimento</p></div>
    <div class="seg"><button data-a="paginas">Por anunciante</button><button data-a="agrupadas">Por checkout</button><button data-a="ofertas">Por site / funil</button></div></div>
  <div class="com-filtros">
    <aside class="filtros"><h3>Filtros</h3>
      <label class="campo">Tipo de oferta<select id="fTipo"><option value="">Todos os tipos</option>${Object.entries(TIPOS_OFERTA).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
      <label class="campo">Preço até<select id="fPreco"><option value="27">R$ 27</option><option value="47">R$ 47</option><option value="97">R$ 97</option><option value="197">R$ 197</option><option value="0">Qualquer preço</option></select></label>
      <label class="peq mut" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="fSemPreco"> incluir quem ainda não tem preço lido</label>
      <label class="campo">Idioma dos anúncios<select id="fIdioma"><option value="">Qualquer</option><option value="pt">Português</option><option value="es">Espanhol</option><option value="en">Inglês</option><option value="fr">Francês</option><option value="it">Italiano</option><option value="de">Alemão</option></select></label>
      <label class="campo">Buscar<input id="fBusca" placeholder="nome, produto ou site"></label>
      <label class="campo">Nicho<select id="fNicho"><option value="">Todos</option>${Object.keys(CONFIG.nichos).map((n) => `<option>${esc(n)}</option>`).join('')}<option>Avulso</option></select></label>
      <label class="campo">Status<select id="fStatus"><option value="">Todos</option>${Object.keys(STATUS).map((s) => `<option>${s}</option>`).join('')}</select></label>
      <label class="campo">Gateway<select id="fGateway"><option value="">Qualquer</option>${CONFIG.gateways.map((g) => `<option value="${g.id}">${g.nome}</option>`).join('')}</select></label>
      <label class="campo">Funil<select id="fFunil"><option value="">Qualquer</option><option>Quiz</option><option>VSL</option><option>Página</option><option>Direto p/ checkout</option></select></label>
      <label class="campo">Mínimo de anúncios ativos<input id="fMin" type="number" min="0" placeholder="ex.: 15"></label>
      <label class="campo">Ativo há pelo menos (dias)<input id="fDias" type="number" min="0" placeholder="ex.: 14"></label>
      <button class="fantasma" id="fLimpar">Limpar filtros</button>
    </aside>
    <section><div class="barra-res"><span id="fTotal" class="mut"></span><button class="bt-p" id="fCsv">${ic('baixar')} Exportar CSV</button></div>
      <div class="painel-box rolar" id="lista"></div></section>
  </div>`;
  $$('.seg button', el).forEach((b) => { b.classList.toggle('ativo', b.dataset.a === f.aba); b.onclick = () => { f.aba = b.dataset.a; TELAS.ofertas(el); }; });
  const campos = { fTipo: 'tipo', fPreco: 'precoMax', fIdioma: 'idioma', fNicho: 'nicho', fStatus: 'status', fGateway: 'gateway', fFunil: 'funil', fMin: 'min', fDias: 'dias', fBusca: 'busca' };
  let t;
  for (const [id, k] of Object.entries(campos)) { $('#' + id).value = f[k]; $('#' + id).oninput = () => { f[k] = $('#' + id).value; clearTimeout(t); t = setTimeout(carregar, 250); }; }
  $('#fSemPreco').checked = f.semPreco; $('#fSemPreco').onchange = () => { f.semPreco = $('#fSemPreco').checked; carregar(); };
  // Os filtros que não se aplicam à aba ficam escondidos para não confundir.
  const soAnunciante = ['fNicho', 'fStatus', 'fFunil'];
  if (f.aba === 'agrupadas') soAnunciante.forEach((id) => ($('#' + id).closest('label').style.display = 'none'));
  if (f.aba === 'ofertas') ['fTipo', 'fPreco', 'fSemPreco', 'fIdioma'].forEach((id) => ($('#' + id).closest('label').style.display = 'none'));
  $('#fLimpar').onclick = () => {
    Object.keys(campos).forEach((id) => (f[campos[id]] = ''));
    Object.assign(f, { tipo: 'low', precoMax: String(CONFIG.precoMaxFiltro ?? 47), semPreco: true });
    TELAS.ofertas(el);
  };
  let itens = [], seq = 0;
  const desenhar = () => {
    const colsCheckout = [
      ['#', (o, i) => `<span class="mut num">${i + 1}</span>`],
      ['Oferta', (o) => `<a href="#" onclick='${o.dominios[0] ? `abrirDominio(${js(o.dominios[0].split('/')[0])})` : `abrirPagina(${js(o.membros[0]?.page_id || '')})`};return false' style="color:inherit;text-decoration:none">${entidade(o.thumb, o.produto || o.dominios[0] || o.chave.slice(4), o.tipo_chave === 'ck' ? 'mesmo checkout' : o.tipo_chave === 'dom' ? 'mesmo site' : 'página única')}</a>`, 'nome'],
      ['Anúncios ativos', (o) => `<b class="num">${fmt(o.ativos)}</b>`, 'ativos', 'dir'],
      ['Páginas', (o) => `<span class="num" title="${esc(o.membros.map((m) => m.nome).join(', '))}">${o.membros.length || o.paginas}</span>`, 'npags', 'dir', (o) => o.membros.length || o.paginas],
      ['Dias', (o) => `<span class="num">${o.dias}</span>`, 'dias', 'dir'],
      ['Gateway', (o) => tagsGw(o.gateways) || '<span class="mut">—</span>'],
      ['Preço', (o) => celPreco(o.preco, o.preco_brl), 'preco_brl'],
      ['Tipo', (o) => `<span class="peq">${esc(TIPOS_OFERTA[o.tipo] || '—')}</span>`],
      ['', (o) => o.dominios[0] ? `${btEstrela('oferta', o.dominios[0], o.produto || o.dominios[0], false)}<a class="bt-ic" href="https://${esc(o.dominios[0])}" target="_blank" title="Abrir site">${ic('externo')}</a>` : '', null, 'acoes'],
    ];
    const cols = f.aba === 'paginas' ? colsAnunciantes(!f.nicho) : f.aba === 'agrupadas' ? colsCheckout : [
      ['#', (o, i) => `<span class="mut num">${i + 1}</span>`],
      ['Site / funil', (o) => `<a href="#" onclick='abrirDominio(${js(o.dominio.split('/')[0])});return false' style="color:inherit;text-decoration:none">${entidade(o.thumb, o.dominio, o.produto || o.titulo || '')}</a>`, 'dominio'],
      ['Status', (o) => tagStatus(o.status), 'status'],
      ['Anúncios (somando páginas)', (o) => `<b class="num">${fmt(o.ativos)}</b>`, 'ativos', 'dir'],
      ['Páginas', (o) => `<span class="num" title="${esc(o.paginas.map((p) => p.nome).join(', '))}">${o.paginas.length}</span>`, 'npags', 'dir', (o) => o.paginas.length],
      ['Dias', (o) => o.dias, 'dias', 'dir'],
      ['Gateway', (o) => tagsGw(o.gateways) || '<span class="mut">—</span>'],
      ['Preço', (o) => (o.preco ? `<span class="preco">${esc(o.preco)}</span>` : '<span class="mut">—</span>')],
      ['Score', (o) => barraScore(o.score), 'score'],
      ['', (o) => `${btEstrela('oferta', o.dominio, o.dominio, o.favorito)}<a class="bt-ic" href="${esc(o.link || 'https://' + o.dominio)}" target="_blank" title="Abrir site">${ic('externo')}</a>`, null, 'acoes'],
    ];
    $('#lista').innerHTML = tabela('tbOfertas', itens.slice(0, 500), cols, ordOfertas);
    ligarOrdenacao($('#lista'), ordOfertas, desenhar);
  };
  async function carregar() {
    const minha = ++seq;
    const qs = new URLSearchParams({ nicho: f.nicho, min: f.min || 0, dias: f.dias || 0, busca: f.busca, gateway: f.gateway,
      tipo: f.tipo, precoMax: f.precoMax || 0, semPreco: f.semPreco ? 1 : 0, idioma: f.idioma });
    let r = await api(`/api/${f.aba === 'agrupadas' ? 'ofertas-agrupadas' : f.aba}?${qs}`);
    if (minha !== seq) return;
    const g = CONFIG.gateways.find((x) => x.id === f.gateway)?.nome;
    if (f.aba === 'agrupadas') {
      const hoje = Date.now() / 1000;
      r = r.map((o) => ({ ...o, ativos: o.ativos_paginas, dias: o.inicio ? Math.max(0, Math.floor((hoje - o.inicio) / 86400)) : 0, nome: o.produto || o.dominios[0] || '',
        gateways: o.gateway ? [CONFIG.gateways.find((x) => x.id === o.gateway)?.nome || o.gateway] : [] }));
    }
    r = r.filter((x) => (!f.status || x.status === f.status) && (!f.min || x.ativos >= Number(f.min)) && (!f.dias || x.dias >= Number(f.dias)) &&
      (!f.funil || x.funil === f.funil) && (!g || (x.gateways || []).includes(g)) &&
      (!f.busca || [x.nome, x.dominio, x.produto, ...(x.dominios || [])].join(' ').toLowerCase().includes(f.busca.toLowerCase())));
    itens = r;
    $('#fTotal').textContent = `${fmt(r.length)} ${f.aba === 'paginas' ? 'anunciantes' : f.aba === 'agrupadas' ? 'ofertas (páginas no mesmo checkout contam juntas)' : 'sites'}` +
      (r.length || !f.tipo ? '' : ' · tente "Todos os tipos" ou um preço maior');
    desenhar();
  }
  $('#fCsv').onclick = () => (f.aba === 'paginas' ? exportarCSV('anunciantes', itens, csvAnunciantes)
    : f.aba === 'agrupadas' ? exportarCSV('ofertas-por-checkout', itens, [['Oferta', (o) => o.nome], ['Agrupado por', (o) => o.tipo_chave], ['Anúncios ativos', (o) => o.ativos],
      ['Páginas', (o) => o.membros.map((m) => m.nome).join(' | ')], ['Dias', (o) => o.dias], ['Gateway', (o) => o.gateways.join(', ')], ['Preço', (o) => o.preco], ['Preço em R$', (o) => o.preco_brl],
      ['Tipo', (o) => TIPOS_OFERTA[o.tipo] || ''], ['Sites', (o) => o.dominios.join(' | ')]])
    : exportarCSV('ofertas', itens, [['Site', (o) => o.dominio], ['Status', (o) => o.status], ['Anúncios', (o) => o.ativos], ['Páginas', (o) => o.paginas.map((p) => p.nome).join(' | ')],
      ['Dias', (o) => o.dias], ['Gateways', (o) => (o.gateways || []).join(', ')], ['Preço', (o) => o.preco], ['Produto', (o) => o.produto], ['Score', (o) => o.score]]));
  carregar();
};

let filtrosAnuncios = { texto: '', formato: '', dup: '', ordem: 'dup', cta: '', plataforma: '', gateway: '', dias: '' };
TELAS.anuncios = async (el) => {
  const f = filtrosAnuncios;
  el.innerHTML = `
  <div class="cab"><div><h1>Biblioteca de anúncios</h1><p>${esc(nomePais(PAIS))} · todos os anúncios ativos coletados. Os mais duplicados são os criativos campeões.</p></div></div>
  <div class="com-filtros">
    <aside class="filtros"><h3>Filtros</h3>
      <label class="campo">Texto<input id="aTexto" placeholder="palavra no texto, título ou página"></label>
      <label class="campo">Ordenar por<select id="aOrdem"><option value="dup">Mais variações</option><option value="antigos">Rodando há mais tempo</option><option value="novos">Mais recentes</option></select></label>
      <label class="campo">Formato<select id="aFormato"><option value="">Todos</option><option value="VIDEO">Vídeo</option><option value="IMAGE">Imagem</option><option value="DCO">Dinâmico</option><option value="CAROUSEL">Carrossel</option></select></label>
      <label class="campo">Chamada (CTA)<select id="aCta"><option value="">Todas</option><option value="Saiba mais">Saiba mais</option><option value="Comprar">Comprar agora</option><option value="WhatsApp">WhatsApp</option><option value="Inscreva">Inscreva-se</option><option value="Baixar">Baixar</option><option value="Instalar">Instalar app</option></select></label>
      <label class="campo">Plataforma<select id="aPlataforma"><option value="">Todas</option><option value="FACEBOOK">Facebook</option><option value="INSTAGRAM">Instagram</option><option value="MESSENGER">Messenger</option><option value="AUDIENCE_NETWORK">Audience Network</option></select></label>
      <label class="campo">Gateway do link<select id="aGateway"><option value="">Qualquer</option>${CONFIG.gateways.map((g) => `<option value="${g.id}">${g.nome}</option>`).join('')}</select></label>
      <label class="campo">Mínimo de variações<input id="aDup" type="number" min="1" placeholder="ex.: 5"></label>
      <label class="campo">Ativo há pelo menos (dias)<input id="aDias" type="number" min="0" placeholder="ex.: 7"></label>
      <button class="fantasma" id="aLimpar">Limpar filtros</button>
    </aside>
    <section><div class="barra-res"><span id="aTotal" class="mut"></span>
      <div class="linha"><button class="bt-p" id="aMinerar" style="display:none"></button><button class="bt-p" id="aCsv">${ic('baixar')} Exportar CSV</button></div></div>
      <div id="aLista" class="ads"></div></section>
  </div>`;
  const ids = { aTexto: 'texto', aFormato: 'formato', aDup: 'dup', aOrdem: 'ordem', aCta: 'cta', aPlataforma: 'plataforma', aGateway: 'gateway', aDias: 'dias' };
  let lista = [], h;
  const carregar = async () => {
    lista = await api('/api/anuncios?' + new URLSearchParams({ ...f, limite: 240 }));
    $('#aTotal').textContent = `${fmt(lista.length)} anúncios${lista.length >= 240 ? ' (mostrando os 240 primeiros)' : ''}`;
    $('#aLista').innerHTML = lista.map(cartaoAnuncio).join('') || '<div class="painel-box vazio" style="grid-column:1/-1">Nenhum anúncio com esses filtros.</div>';
    const bt = $('#aMinerar');
    if (f.texto) { bt.style.display = ''; bt.innerHTML = `${ic('minerar')} Minerar "${esc(f.texto)}" na Biblioteca (${PAIS})`; bt.onclick = () => rodarTarefa({ tipo: 'minerar', palavras: f.texto, nicho: 'Avulso', pais: PAIS }); }
    else bt.style.display = 'none';
  };
  for (const [id, k] of Object.entries(ids)) { $('#' + id).value = f[k]; $('#' + id).oninput = () => { f[k] = $('#' + id).value; clearTimeout(h); h = setTimeout(carregar, 300); }; }
  $('#aLimpar').onclick = () => { Object.keys(f).forEach((k) => (f[k] = k === 'ordem' ? 'dup' : '')); TELAS.anuncios(el); };
  $('#aCsv').onclick = () => exportarCSV('anuncios', lista, [['Página', (a) => a.page_name], ['Dias', (a) => diasDesde(a.inicio)], ['Variações', (a) => a.dup], ['Formato', (a) => a.formato],
    ['CTA', (a) => a.cta], ['Título', (a) => a.titulo], ['Texto', (a) => a.texto], ['Destino', (a) => a.link], ['Gateway', (a) => a.gateway], ['Biblioteca', (a) => bib.anuncio(a.ad_id)]]);
  carregar();
};

TELAS.gateways = async (el, id) => {
  if (id) return telaGateway(el, id);
  const gws = await api('/api/gateways');
  const est = {};
  const regiao = (r) => CONFIG.gateways.filter((g) => g.regiao === r).map((g) => g.id);
  const tab = (lista) => tabela('tbG', lista, [
    ['Gateway', (g) => `<a href="#/gateways/${g.id}"><b>${esc(g.nome)}</b></a><div class="peq mut">${g.busca.map(esc).join(', ')}</div>`],
    ['Anúncios na Biblioteca', (g) => (g.totalBiblioteca != null ? `<b class="num">${fmt(g.totalBiblioteca)}</b>` : '<span class="mut">não pesquisado</span>'), null, 'dir'],
    ['Checkouts mapeados', (g) => fmt(g.checkouts), null, 'dir'], ['Anunciantes', (g) => fmt(g.paginas), null, 'dir'],
    ['Atualizado', (g) => `<span class="peq mut">${quando(g.consultado)}</span>`, null, 'dir'],
    ['', (g) => `<button class="bt-p" onclick="rodarTarefa({tipo:'gateway',gateway:'${g.id}',pais:PAIS})">${ic('atualizar')} Pesquisar</button>`, null, 'acoes'],
  ], est);
  el.innerHTML = `
  <div class="cab"><div><h1>Gateways</h1><p>${esc(nomePais(PAIS))} · checkouts com mais anúncios ativos em cada plataforma de pagamento (equivalente ao "Top pages" do Semrush, medido por anúncios)</p></div></div>
  <div class="secao-cab"><h2>Brasil e América Latina</h2></div><div class="painel-box rolar">${tab(gws.filter((g) => regiao('BR').includes(g.id)))}</div>
  <div class="secao"><div class="secao-cab"><h2>Internacional</h2><span class="mut peq">use com países como US, GB, CA, AU</span></div><div class="painel-box rolar">${tab(gws.filter((g) => regiao('INT').includes(g.id)))}</div></div>`;
};

const ordCk = { k: 'variacoes', asc: false };
async function telaGateway(el, id) {
  const d = await api('/api/gateway/' + id);
  const g = d.gateway;
  if (!g) { el.innerHTML = '<div class="painel-box vazio">Gateway não encontrado.</div>'; return; }
  let aba = 'ck';
  el.innerHTML = `
  <div class="cab"><div><div class="migalha"><a href="#/gateways">Gateways</a> / ${esc(g.nome)}</div><h1>${esc(g.nome)}</h1>
    <p>${esc(nomePais(PAIS))} · busca na Biblioteca por ${g.busca.map((b) => `<code>${esc(b)}</code>`).join(' ')}</p></div>
    <div class="linha"><button class="bt-p" id="gCsv">${ic('baixar')} Exportar CSV</button><button class="pri" onclick="rodarTarefa({tipo:'gateway',gateway:'${id}',pais:PAIS})">${ic('atualizar')} Pesquisar agora</button></div></div>
  <div class="kpis"><div class="kpi"><span>Anúncios na Biblioteca</span><b>${fmt(d.buscas[0]?.total)}</b><small>${d.buscas[0] ? 'em ' + quando(d.buscas[0].quando) : 'não pesquisado'}</small></div>
    <div class="kpi"><span>Checkouts mapeados</span><b>${fmt(d.checkouts.length)}</b></div>
    <div class="kpi"><span>Anúncios coletados</span><b>${fmt(d.checkouts.reduce((s, c) => s + c.anuncios, 0))}</b></div>
    <div class="kpi"><span>Páginas de vendas</span><b>${fmt(d.paginasVendas.length)}</b><small>sites que levam ao gateway</small></div></div>
  <div class="secao"><div class="seg" style="margin-bottom:10px"><button data-a="ck" class="ativo">Checkouts mais anunciados</button><button data-a="lp">Páginas de vendas</button></div>
  <div class="painel-box rolar" id="gConteudo"></div></div>`;
  const desenhar = () => {
    $$('.seg button', el).forEach((b) => b.classList.toggle('ativo', b.dataset.a === aba));
    if (aba === 'lp') {
      $('#gConteudo').innerHTML = tabela('tbLp', d.paginasVendas, [['Site', (p) => `<a href="#" onclick='abrirDominio(${js(p.dominio)});return false'>${entidade(p.imagem, p.dominio, p.produto || p.titulo)}</a>`],
        ['Preço', (p) => (p.preco ? `<span class="preco">${esc(p.preco)}</span>` : '—')], ['Anúncios', (p) => fmt(p.anuncios), null, 'dir'], ['Páginas', (p) => fmt(p.paginas), null, 'dir']], {});
      if (!d.paginasVendas.length) $('#gConteudo').innerHTML = '<div class="vazio">As páginas de vendas aparecem aqui depois da análise de domínio dos sites (automática na mineração).</div>';
      return;
    }
    $('#gConteudo').innerHTML = d.checkouts.length ? tabela('tbCk', d.checkouts, [
      ['#', (c, i) => `<span class="mut num">${i + 1}</span>`],
      ['Produto / checkout', (c) => `${entidade(c.thumb, c.produto || c.titulo || c.checkout, c.checkout)}${c.disponivel === false ? '<span class="tag">indisponível</span>' : ''}`, 'produto'],
      ['Preço', (c) => (c.preco ? `<span class="preco">${esc(c.preco)}</span>` : '<span class="mut">—</span>')],
      ['Anúncios (variações)', (c) => `<b class="num">${fmt(c.variacoes)}</b>`, 'variacoes', 'dir'],
      ['Criativos', (c) => fmt(c.anuncios), 'anuncios', 'dir'],
      ['Dias', (c) => c.dias, 'dias', 'dir'],
      ['Anunciantes', (c) => `<span class="peq">${c.paginas.slice(0, 2).map((p) => `<a href="#" onclick='abrirPagina(${js(p.page_id)});return false'>${esc(p.nome)}</a>${p.ativos != null ? ` (${p.ativos})` : ''}`).join('<br>')}${c.paginas.length > 2 ? `<br><span class="mut">+${c.paginas.length - 2}</span>` : ''}</span>`, 'npags', null, (c) => c.paginas.length],
      ['Score', (c) => barraScore(c.score), 'score'],
      ['', (c) => `${btEstrela('checkout', c.checkout, c.produto || c.checkout, c.favorito)}<a class="bt-ic" href="${esc(c.url)}" target="_blank" title="Abrir checkout">${ic('externo')}</a><a class="bt-ic" href="${bib.busca(c.checkout)}" target="_blank" title="Anúncios na Biblioteca">${ic('anuncios')}</a>`, null, 'acoes'],
    ], ordCk) : `<div class="vazio">Ainda não pesquisado em ${esc(nomePais(PAIS))}. Clique em "Pesquisar agora" (leva de 3 a 5 minutos).</div>`;
    ligarOrdenacao($('#gConteudo'), ordCk, desenhar);
  };
  $$('.seg button', el).forEach((b) => (b.onclick = () => { aba = b.dataset.a; desenhar(); }));
  $('#gCsv').onclick = () => exportarCSV('checkouts-' + id, d.checkouts, [['Produto', (c) => c.produto], ['Checkout', (c) => c.url], ['Preço', (c) => c.preco], ['Variações', (c) => c.variacoes],
    ['Criativos', (c) => c.anuncios], ['Dias', (c) => c.dias], ['Anunciantes', (c) => c.paginas.map((p) => p.nome).join(' | ')], ['Score', (c) => c.score]]);
  desenhar();
}

TELAS.dominios = async (el) => {
  const lista = await api('/api/analises');
  el.innerHTML = `
  <div class="cab"><div><h1>Análise de domínio</h1><p>Gateway, checkout, preço, VSL, quiz, rastreadores, sitemap.xml e conferência de rota na Biblioteca</p></div></div>
  <form class="painel-box pb-corpo linha" id="dForm" style="padding:14px 16px">
    <input id="dUrl" placeholder="https://pagina-de-vendas.com ou link de checkout" style="flex:1;min-width:280px">
    <button class="pri" type="submit">Analisar em ${PAIS}</button></form>
  <div class="secao"><div class="secao-cab"><h2>Domínios analisados</h2><span class="mut peq">${lista.length}</span></div>
  <div class="painel-box rolar">${tabela('tbDom', lista, [
    ['Domínio', (a) => `<a href="#" onclick='abrirDominio(${js(a.dominio)});return false'>${entidade(a.imagem, a.dominio, a.titulo)}</a>`],
    ['Funil', (a) => esc(a.funil)], ['Gateway', (a) => tagsGw(a.gateways) || '—'], ['Preço', (a) => (a.preco ? `<span class="preco">${esc(a.preco)}</span>` : '—')],
    ['Anúncios', (a) => fmt(a.anuncios), null, 'dir'], ['Páginas', (a) => fmt(a.paginas), null, 'dir'], ['Analisado', (a) => `<span class="peq mut">${quando(a.quando)}</span>`, null, 'dir']], {})}</div></div>`;
  $('#dForm').onsubmit = (e) => { e.preventDefault(); const u = $('#dUrl').value.trim(); if (u) rodarTarefa({ tipo: 'analisar', url: u, pais: PAIS }); };
};

TELAS.minerar = async (el) => {
  const nichos = Object.keys(CONFIG.nichos);
  el.innerHTML = `
  <div class="cab"><div><h1>Minerar</h1><p>Busca na Biblioteca, conta os anúncios das páginas mais promissoras e analisa os sites. Cada país é coletado e exibido separadamente.</p></div></div>
  <div class="grade-2">
    <div class="painel-box"><div class="pb-cab"><h2>Nova mineração</h2></div><div class="pb-corpo" style="display:flex;flex-direction:column;gap:12px">
      <div class="form-grade">
        <label class="campo">Nicho<select id="mNicho"><option value="">Todos os nichos</option>${nichos.map((n) => `<option>${esc(n)}</option>`).join('')}</select></label>
        <label class="campo">Anúncios lidos por palavra<input id="mMax" type="number" placeholder="${CONFIG.maxAnunciosPorPalavra || 150}"></label>
      </div>
      <label class="campo">Palavras-chave avulsas (opcional, separadas por vírgula)<textarea id="mPalavras" style="min-height:70px" placeholder="Se vazio, usa as palavras do nicho escolhido. Clique nas sugestões ao lado para adicionar."></textarea></label>
      <div><div class="campo" style="margin-bottom:6px">Países</div><div class="chips" id="mPaises">${PAISES.map(([c, n]) => `<span class="chip ${c === PAIS ? 'on' : ''}" data-c="${c}" title="${n}">${c}</span>`).join('')}</div></div>
      <div class="linha">${CONFIG.nuvem ? '' : '<label class="peq mut"><input type="checkbox" id="mVisivel"> mostrar o navegador</label>'}
        <span style="flex:1"></span><button onclick="rodarTarefa({tipo:'atualizar'})">${ic('atualizar')} Atualizar contagens</button><button class="pri" id="mIr">Iniciar mineração</button></div>
    </div></div>
    <div class="painel-box"><div class="pb-cab"><h2>Sugestões de palavras-chave</h2><span class="mut peq">métodos dos mineradores</span></div><div class="pb-corpo" style="max-height:390px;overflow:auto">
      ${window.PALAVRAS.map((g) => `<div style="margin-bottom:12px"><b class="peq">${esc(g.grupo)}</b><div class="peq mut" style="margin:2px 0 6px">${esc(g.dica)}</div>
        <div class="chips">${g.itens.map((p) => `<span class="chip" data-p="${esc(p)}">${esc(p)}</span>`).join('')}</div></div>`).join('')}</div></div>
  </div>
  <div class="secao"><div class="secao-cab"><h2>Andamento</h2></div><div class="log" id="logTarefa">…</div></div>
  <div class="secao"><div class="secao-cab"><h2>Critérios de oferta escalada</h2></div><div class="painel-box rolar">
    ${tabela('tbCrit', window.CRITERIOS, [['Sinal', (c) => `<b>${esc(c[0])}</b>`], ['Referência', (c) => `<span class="mut">${esc(c[1])}</span>`]], {})}</div></div>`;
  $$('.chip[data-p]', el).forEach((c) => (c.onclick = () => {
    const ta = $('#mPalavras'); const atual = ta.value.split(',').map((s) => s.trim()).filter(Boolean);
    const i = atual.indexOf(c.dataset.p);
    if (i >= 0) atual.splice(i, 1); else atual.push(c.dataset.p);
    ta.value = atual.join(', '); c.classList.toggle('on', i < 0);
  }));
  $$('#mPaises .chip', el).forEach((c) => (c.onclick = () => c.classList.toggle('on')));
  $('#mIr').onclick = () => {
    const palavras = $('#mPalavras').value.trim();
    const paises = $$('#mPaises .chip.on').map((c) => c.dataset.c);
    if (!paises.length) return toast('Escolha pelo menos um país');
    rodarTarefa({ tipo: 'minerar', nicho: $('#mNicho').value || (palavras ? 'Avulso' : ''), palavras, pais: paises.join(','), max: $('#mMax').value || undefined, visivel: $('#mVisivel')?.checked });
  };
  acompanhar();
};

TELAS.listas = async (el) => {
  const favs = await api('/api/favoritos');
  const grupos = [['pagina', 'Anunciantes'], ['oferta', 'Sites / funis'], ['checkout', 'Checkouts']];
  const salvarNota = async (f, nota) => { await post('/api/favoritos', { tipo: f.tipo, chave: f.chave, nome: f.nome, nota }); toast('Anotação salva'); };
  el.innerHTML = `
  <div class="cab"><div><h1>Minhas listas</h1><p>Ofertas salvas com anotações. Anunciantes salvos são recontados em toda atualização e na rotina automática.</p></div>
    <button onclick="rodarTarefa({tipo:'atualizar'})">${ic('atualizar')} Atualizar contagens</button></div>
  ${grupos.map(([tipo, titulo]) => { const l = favs.filter((f) => f.tipo === tipo); return `<div class="secao"><div class="secao-cab"><h2>${titulo}</h2><span class="mut peq">${l.length}</span></div>
    <div class="painel-box rolar">${tabela('tbL' + tipo, l, [
      ['Item', (f) => tipo === 'pagina' ? `<a href="#" onclick='abrirPagina(${js(f.chave)});return false'>${entidade(f.pagina?.foto, f.nome || f.chave, f.pagina ? `${fmt(f.pagina.ativos)} anúncios · ${f.pagina.status}` : 'sem dados neste país')}</a>`
        : tipo === 'oferta' ? `<a href="#" onclick='abrirDominio(${js(f.chave.split('/')[0])});return false'><b>${esc(f.chave)}</b></a>` : `<b>${esc(f.nome || f.chave)}</b><div class="peq mut">${esc(f.chave)}</div>`],
      ...(tipo === 'pagina' ? [['Crescimento', (f) => (f.pagina ? cresc(f.pagina) : '—'), null, 'dir'], ['Score', (f) => (f.pagina ? barraScore(f.pagina.score) : '—')]] : []),
      ['Anotação', (f) => `<input class="nota" data-t="${esc(f.tipo)}" data-c="${esc(f.chave)}" value="${esc(f.nota || '')}" placeholder="ex.: modelar com outro ângulo">`],
      ['Salvo em', (f) => `<span class="peq mut">${quando(f.criado)}</span>`, null, 'dir'],
      ['', (f) => `${tipo === 'checkout' ? `<a class="bt-ic" href="https://${esc(f.chave)}" target="_blank">${ic('externo')}</a>` : ''}<button class="bt-ic" title="Remover" data-rm-t="${esc(f.tipo)}" data-rm-c="${esc(f.chave)}">${ic('fechar')}</button>`, null, 'acoes'],
    ], {})}</div></div>`; }).join('')}`;
  $$('input.nota', el).forEach((i) => (i.onchange = () => salvarNota(favs.find((f) => f.tipo === i.dataset.t && f.chave === i.dataset.c), i.value)));
  $$('[data-rm-t]', el).forEach((b) => (b.onclick = async () => { await post('/api/favoritos', { tipo: b.dataset.rmT, chave: b.dataset.rmC, remover: true }); rota(); }));
};

TELAS.ferramentas = async (el) => {
  el.innerHTML = `
  <div class="cab"><div><h1>Calculadoras e plano</h1><p>Confira se a oferta para em pé antes de investir em tráfego</p></div></div>
  <div class="grade-2">
    <div class="painel-box"><div class="pb-cab"><h2>CPA máximo e ROAS de equilíbrio</h2></div><div class="pb-corpo">
      <div class="form-grade">
        <label class="campo">Preço do produto<input id="cPreco" type="number" value="19.90" step="0.01"></label>
        <label class="campo">Taxa do gateway (%)<input id="cTaxa" type="number" value="6.99" step="0.01"></label>
        <label class="campo">Taxa fixa por venda<input id="cFixa" type="number" value="1.00" step="0.01"></label>
        <label class="campo">Impostos (%)<input id="cImp" type="number" value="0" step="0.1"></label>
        <label class="campo">Order bump (preço)<input id="cBump" type="number" value="9.90" step="0.01"></label>
        <label class="campo">Conversão do bump (%)<input id="cBumpTx" type="number" value="30"></label>
        <label class="campo">Upsell (preço)<input id="cUp" type="number" value="27" step="0.01"></label>
        <label class="campo">Conversão do upsell (%)<input id="cUpTx" type="number" value="10"></label>
        <label class="campo">Margem desejada (%)<input id="cMargem" type="number" value="30"></label>
      </div><div class="grade-3" style="margin-top:12px" id="cRes"></div>
      <p class="peq mut">As taxas variam por plataforma, plano e forma de pagamento: confira na sua. Order bumps (4 a 6) e upsell aumentam o ticket médio e permitem pagar um CPA maior.</p></div></div>
    <div class="painel-box"><div class="pb-cab"><h2>Plano de campanha</h2><span class="mut peq">teste → pré-escala → escala</span></div><div class="pb-corpo">
      <div class="form-grade">
        <label class="campo">Estrutura<select id="pEst">${Object.entries(window.ESTRUTURAS).map(([k, e]) => `<option value="${k}">${esc(e.nome)}</option>`).join('')}</select></label>
        <label class="campo">Ticket<input id="pTicket" type="number" value="19.90" step="0.01"></label>
        <label class="campo">Criativos<input id="pCri" type="number" value="5"></label>
      </div><div id="pRes" style="margin-top:12px;display:flex;flex-direction:column;gap:8px"></div></div></div>
    <div class="painel-box"><div class="pb-cab"><h2>Orçamento de teste</h2></div><div class="pb-corpo">
      <div class="form-grade">
        <label class="campo">Ticket<input id="tTicket" type="number" value="19.90" step="0.01"></label>
        <label class="campo">Criativos<input id="tCriativos" type="number" value="5"></label>
        <label class="campo">Dias de teste<input id="tDias" type="number" value="3"></label>
        <label class="campo">Tickets por criativo/dia<input id="tMult" type="number" value="1" step="0.5"></label>
      </div><div class="grade-3" style="margin-top:12px" id="tRes"></div>
      <p class="peq mut">Regras citadas: cada criativo gasta pelo menos 1 ticket e roda 2 a 3 dias antes de decidir; corte o que passar de 1 a 1,5 ticket sem venda.</p></div></div>
    <div class="painel-box"><div class="pb-cab"><h2>Projeção de escala</h2></div><div class="pb-corpo">
      <div class="form-grade">
        <label class="campo">Investimento por dia<input id="eInv" type="number" value="300"></label>
        <label class="campo">CPA atual<input id="eCpa" type="number" value="12" step="0.01"></label>
        <label class="campo">Ticket médio líquido<input id="eTm" type="number" value="22" step="0.01"></label>
      </div><div class="grade-3" style="margin-top:12px" id="eRes"></div></div></div>
  </div>
  <div class="secao"><div class="secao-cab"><h2>Checklist de lançamento</h2><span class="mut peq" id="ckProg"></span></div>
    <div class="grade-3">${window.CHECKLIST.map(([sec, itens], si) => `<div class="painel-box"><div class="pb-cab"><h2>${esc(sec)}</h2></div><div class="pb-corpo">
      ${itens.map((it, ii) => `<label class="check" style="cursor:pointer"><input type="checkbox" data-ck="${si}-${ii}" ${localStorage['ck' + si + '-' + ii] ? 'checked' : ''}> <span>${esc(it)}</span></label>`).join('')}</div></div>`).join('')}</div></div>
  <div class="secao"><div class="secao-cab"><h2>Ferramentas citadas pelos mineradores</h2></div><div class="painel-box rolar">
    ${tabela('tbFer', window.FERRAMENTAS, [['Ferramenta', (f) => (f.url ? `<a href="${esc(f.url)}" target="_blank"><b>${esc(f.nome)}</b></a>` : `<b>${esc(f.nome)}</b>`)],
      ['Para que serve', (f) => esc(f.uso)], ['Grátis?', (f) => esc(f.gratis)], ['Equivalente aqui', (f) => `<span class="mut">${esc(f.aqui)}</span>`]], {})}</div></div>`;
  const v = (id) => Number($('#' + id).value) || 0;
  const R = (n) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const caixa = (rot, val, sub, cor) => `<div class="res-box"><span class="peq mut">${rot}</span><div class="res" ${cor ? `style="color:${cor}"` : ''}>${val}</div>${sub ? `<span class="peq mut">${sub}</span>` : ''}</div>`;
  const calc = () => {
    const liq = (p) => (p > 0 ? p - p * (v('cTaxa') + v('cImp')) / 100 - v('cFixa') : 0);
    const ticket = liq(v('cPreco')) + liq(v('cBump')) * v('cBumpTx') / 100 + liq(v('cUp')) * v('cUpTx') / 100;
    const bruto = v('cPreco') + v('cBump') * v('cBumpTx') / 100 + v('cUp') * v('cUpTx') / 100;
    const alvo = ticket * (1 - v('cMargem') / 100);
    $('#cRes').innerHTML = caixa('Ticket médio líquido', R(ticket), 'bruto ' + R(bruto)) + caixa('CPA máximo (empate)', R(ticket), 'ROAS de empate ' + (bruto / Math.max(ticket, 0.01)).toFixed(2))
      + caixa(`CPA alvo (${v('cMargem')}% de margem)`, R(alvo), 'ROAS alvo ' + (bruto / Math.max(alvo, 0.01)).toFixed(2), 'var(--ok)');
    const porCri = v('tTicket') * Math.max(v('tMult'), 0.5);
    $('#tRes').innerHTML = caixa('Por criativo / dia', R(porCri)) + caixa('Por dia (todos)', R(porCri * v('tCriativos'))) + caixa('Teste completo', R(porCri * v('tCriativos') * v('tDias')), `${v('tCriativos')} criativos × ${v('tDias')} dias`);
    const vendas = v('eInv') / Math.max(v('eCpa'), 0.01), lucro = vendas * v('eTm') - v('eInv');
    $('#eRes').innerHTML = caixa('Vendas por dia', vendas.toFixed(1)) + caixa('Lucro por dia', R(lucro), null, lucro >= 0 ? 'var(--ok)' : 'var(--erro)') + caixa('Lucro em 30 dias', R(lucro * 30));
    const e = window.ESTRUTURAS[$('#pEst').value];
    $('#pRes').innerHTML = e.fases(v('pTicket'), v('pCri')).map(([fase, fazer, decidir], i) => `<div class="res-box"><b>${i + 1}. ${esc(fase)}</b>
      <div class="peq" style="margin-top:4px">${esc(fazer)}</div><div class="peq mut" style="margin-top:4px">Decisão: ${esc(decidir)}</div></div>`).join('');
  };
  const prog = () => { const c = $$('input[data-ck]', el); $('#ckProg').textContent = `${c.filter((x) => x.checked).length} de ${c.length} concluídos`; };
  $$('input:not([data-ck]), select', el).forEach((i) => (i.oninput = calc));
  $$('input[data-ck]', el).forEach((c) => (c.onchange = () => { if (c.checked) localStorage['ck' + c.dataset.ck] = 1; else delete localStorage['ck' + c.dataset.ck]; prog(); }));
  calc(); prog();
};

TELAS.prompts = async (el) => {
  const cats = [...new Set(window.PROMPTS.map((p) => p.cat))];
  el.innerHTML = `
  <div class="cab"><div><h1>Prompts de IA</h1><p>Prompts baseados nos métodos dos mineradores. Funcionam no ChatGPT, Claude, Gemini (planos grátis) e Lovable.</p></div></div>
  <div class="painel-box pb-corpo linha" style="padding:12px 16px"><label class="campo" style="flex:1">Seu produto ou nicho (preenche os prompts)
    <input id="pNicho" placeholder="ex.: curso de inglês para iniciantes, pack de atividades bíblicas, receitas sem glúten"></label></div>
  ${cats.map((c) => `<div class="secao"><div class="secao-cab"><h2>${esc(c)}</h2></div><div class="grade-2">${window.PROMPTS.map((p, i) => p.cat === c ? `<div class="painel-box"><div class="pb-cab"><div><b>${esc(p.titulo)}</b><div class="peq mut">${esc(p.fonte || '')}</div></div>
    <button class="bt-p" data-i="${i}">${ic('copiar')} Copiar</button></div><div class="pb-corpo" style="padding-top:4px"><pre class="prompt" data-i="${i}"></pre></div></div>` : '').join('')}</div></div>`).join('')}`;
  const preencher = () => {
    const n = $('#pNicho').value.trim() || '[SEU PRODUTO]';
    $$('pre[data-i]', el).forEach((pre) => (pre.textContent = window.PROMPTS[pre.dataset.i].texto.replaceAll('{{NICHO}}', n).replace('{{CRIATIVO}}', '[COLE AQUI O TEXTO OU A TRANSCRIÇÃO DO CRIATIVO]')));
  };
  $('#pNicho').value = localStorage.nichoPrompt || '';
  $('#pNicho').oninput = () => { localStorage.nichoPrompt = $('#pNicho').value; preencher(); };
  $$('button[data-i]', el).forEach((b) => (b.onclick = () => copiar($(`pre[data-i="${b.dataset.i}"]`, el).textContent)));
  preencher();
};

TELAS.metodo = async (el) => {
  const md = await fetch('/METODO.md').then((r) => r.text());
  el.innerHTML = `<div class="md">${marked.parse(md)}</div>`;
  $$('.md a', el).forEach((a) => (a.target = '_blank'));
};

TELAS.config = async (el) => {
  const c = CONFIG, rot = c.rotina || {};
  const gwPadrao = CONFIG.gateways.filter((g) => g.regiao === 'BR').map((g) => g.id);
  el.innerHTML = `
  <div class="cab"><div><h1>Configurações</h1><p>Nichos, palavras-chave, coleta e rotina automática</p></div><button class="pri" id="cfgSalvar">Salvar alterações</button></div>
  <div class="grade-2">
    <div class="painel-box"><div class="pb-cab"><h2>Nichos e palavras-chave</h2></div><div class="pb-corpo">
      <p class="peq mut" style="margin-top:0">Uma linha por nicho e idioma: <code>Nicho (pt): palavra 1, palavra 2</code>. Use <code>(es)</code> e <code>(en)</code> para as palavras em espanhol e inglês: cada país é buscado no idioma dele. Sem idioma, vale português.</p>
      <textarea id="cfgNichos" style="min-height:380px">${esc(Object.entries(c.nichos).flatMap(([n, ps]) => Array.isArray(ps) ? [`${n}: ${ps.join(', ')}`]
        : Object.entries(ps).map(([l, lista]) => `${n} (${l}): ${lista.join(', ')}`)).join('\n'))}</textarea></div></div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="painel-box"><div class="pb-cab"><h2>Coleta</h2></div><div class="pb-corpo"><div class="form-grade">
        <label class="campo">País padrão<select id="cfgPais">${opcoesPais(c.pais || 'BR')}</select></label>
        <label class="campo">Anúncios lidos por palavra<input id="cfgMax" type="number" value="${c.maxAnunciosPorPalavra || 150}"></label>
        <label class="campo">Páginas contadas por nicho<input id="cfgTop" type="number" value="${c.paginasParaAprofundar || 25}"></label>
        <label class="campo">Domínios analisados por nicho<input id="cfgSites" type="number" value="${c.sitesParaAnalisar ?? 8}"></label>
        <label class="campo">Analisar site a partir de (anúncios)<input id="cfgMinAn" type="number" value="${c.minAnunciosParaAnalisar ?? 8}"></label></div></div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Low ticket</h2></div><div class="pb-corpo"><div class="form-grade">
        <label class="campo">Preço máximo para ser low ticket (R$)<input id="cfgLowMax" type="number" value="${c.precoMaxLowTicket ?? 97}"></label>
        <label class="campo">Filtro de preço padrão nas listas (R$)<input id="cfgFiltro" type="number" value="${c.precoMaxFiltro ?? 47}"></label></div>
        <label class="campo" style="margin-top:12px">Anunciantes ignorados (um por linha: nome ou site)<textarea id="cfgBloqueio" style="min-height:110px" placeholder="ex.: betterme">${esc((c.bloqueio || []).join('\n'))}</textarea></label>
        <p class="peq mut" style="margin:6px 0 0">Marcas grandes e apps que aparecem em toda busca e não são ofertas para modelar.</p></div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Rotina automática</h2><span class="mut peq">${c.nuvem ? 'rodando na nuvem' : 'modo local'}</span></div><div class="pb-corpo">
        <p class="peq mut" style="margin-top:0">A cada rodada: processa os pedidos, reconta os anunciantes acompanhados, minera o próximo nicho e país do rodízio e atualiza um gateway.</p>
        <div class="form-grade"><label class="campo">Anunciantes recontados por rodada<input id="cfgRotPag" type="number" value="${rot.paginasParaAtualizar || 80}"></label>
          <label class="campo">Anúncios por gateway<input id="cfgRotGw" type="number" value="${rot.maxPorGateway || 200}"></label></div>
        <div class="campo" style="margin:12px 0 6px">Países no rodízio</div>
        <div class="chips" id="cfgPaises">${PAISES.map(([k, n]) => `<span class="chip ${(rot.paises || [c.pais || 'BR']).includes(k) ? 'on' : ''}" data-c="${k}" title="${n}">${k}</span>`).join('')}</div>
        <div class="campo" style="margin:12px 0 6px">Gateways no rodízio</div>
        <div class="chips" id="cfgGws">${c.gateways.map((g) => `<span class="chip ${(rot.gateways || gwPadrao).includes(g.id) ? 'on' : ''}" data-g="${g.id}">${g.nome}</span>`).join('')}</div>
        <p class="peq mut">${c.nuvem ? 'A rotina roda pelo GitHub Actions nos horários agendados.' : 'Para rodar 24 horas, veja "Hospedagem grátis" no README.'}</p></div></div>
    </div></div>`;
  $$('#cfgGws .chip, #cfgPaises .chip', el).forEach((ch) => (ch.onclick = () => ch.classList.toggle('on')));
  $('#cfgSalvar').onclick = async () => {
    const nichos = {};
    for (const l of $('#cfgNichos').value.split('\n')) {
      const i = l.indexOf(':'); if (i < 1) continue;
      const ps = l.slice(i + 1).split(',').map((s) => s.trim()).filter(Boolean);
      const m = l.slice(0, i).trim().match(/^(.*?)\s*\((pt|es|en|fr|it|de)\)$/i);
      const nome = (m ? m[1] : l.slice(0, i)).trim(), lang = m ? m[2].toLowerCase() : 'pt';
      if (!nome || !ps.length) continue;
      nichos[nome] = { ...(nichos[nome] || {}), [lang]: ps };
    }
    if (!Object.keys(nichos).length) return toast('Informe pelo menos um nicho');
    const { gateways, nuvem, ...atual } = CONFIG;
    const nova = { ...atual, pais: $('#cfgPais').value, maxAnunciosPorPalavra: Number($('#cfgMax').value), paginasParaAprofundar: Number($('#cfgTop').value),
      sitesParaAnalisar: Number($('#cfgSites').value), minAnunciosParaAnalisar: Number($('#cfgMinAn').value), nichos,
      precoMaxLowTicket: Number($('#cfgLowMax').value), precoMaxFiltro: Number($('#cfgFiltro').value),
      bloqueio: $('#cfgBloqueio').value.split('\n').map((x) => x.trim()).filter(Boolean),
      rotina: { ...rot, paginasParaAtualizar: Number($('#cfgRotPag').value), maxPorGateway: Number($('#cfgRotGw').value),
        gateways: $$('#cfgGws .chip.on').map((x) => x.dataset.g), paises: $$('#cfgPaises .chip.on').map((x) => x.dataset.c) } };
    await post('/api/config', nova);
    CONFIG = { ...CONFIG, ...nova };
    toast('Configurações salvas');
  };
};

TELAS.uso = async (el) => {
  const u = await api('/api/uso');
  const fmtBytes = (b) => (b == null ? '—' : b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GB' : b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB');
  const val = (i) => (i.unidade === 'bytes' ? fmtBytes(i.usado) : i.usado == null ? '—' : fmt(i.usado) + ' ' + i.unidade);
  const lim = (i) => (i.limite == null ? 'sem limite' : i.unidade === 'bytes' ? fmtBytes(i.limite) : fmt(i.limite) + ' ' + i.unidade);
  const c = u.raspador.coletas24h;
  el.innerHTML = `
  <div class="cab"><div><h1>Uso e limites</h1><p>Tudo roda nos planos grátis. Aqui você acompanha o consumo e recebe alerta a partir de 80%.</p></div></div>
  <div class="grade-3">${u.itens.map((i) => `<div class="painel-box"><div class="pb-corpo">
    <div class="linha" style="justify-content:space-between"><b>${esc(i.nome)}</b>${i.alerta ? '<span class="tag st-forte">acima de 80%</span>' : ''}</div>
    <div class="res" style="margin-top:6px">${val(i)} <span class="mut peq">de ${lim(i)}</span></div>
    ${i.pct != null ? `<div class="score" style="margin:8px 0"><i style="height:7px"><span style="width:${Math.min(100, i.pct)}%;${i.alerta ? 'background:var(--erro)' : ''}"></span></i><b style="width:auto">${i.pct}%</b></div>` : ''}
    <div class="peq mut">${esc(i.obs || '')}</div></div></div>`).join('')}</div>
  <div class="grade-2 secao">
    <div><div class="secao-cab"><h2>Saúde do raspador (24 h)</h2></div><div class="painel-box pb-corpo" style="padding:14px 16px">
      <div class="linha"><span class="tag st-validando">${fmt(c.ok || 0)} ok</span><span class="tag">${fmt(c.vazio || 0)} sem resultado</span><span class="tag st-forte">${fmt(c.erro || 0)} com erro</span></div>
      ${u.raspador.ultimoErro ? `<p class="peq" style="margin-bottom:0">Último erro (${quando(u.raspador.ultimoErro.quando)}, ${esc(u.raspador.ultimoErro.pais || '')} "${esc(u.raspador.ultimoErro.termo || '')}"): <span class="mut">${esc(u.raspador.ultimoErro.erro || '')}</span></p>` : '<p class="peq mut" style="margin-bottom:0">Nenhum erro registrado.</p>'}</div></div>
    <div><div class="secao-cab"><h2>Últimas execuções do robô</h2></div><div class="painel-box rolar">${tabela('tbExec', u.raspador.execucoes, [
      ['Onde', (e) => esc(e.origem)], ['Tarefa', (e) => esc(e.tipo)], ['Início', (e) => quando(e.inicio)],
      ['Duração', (e) => (e.fim ? Math.max(1, Math.round((e.fim - e.inicio) / 60)) + ' min' : 'rodando'), null, 'dir'],
      ['Páginas', (e) => fmt(e.coletas), null, 'dir'], ['Status', (e) => `<span class="tag ${e.status === 'ok' ? 'st-validando' : e.status === 'erro' ? 'st-forte' : ''}">${esc(e.status)}</span>`]], {})}</div></div>
  </div>
  <div class="grade-2 secao">
    <div><div class="secao-cab"><h2>Maiores tabelas</h2></div><div class="painel-box rolar">${u.tabelas.length ? tabela('tbTab', u.tabelas, [['Tabela', (t) => esc(t.tabela)], ['Tamanho', (t) => fmtBytes(t.bytes), null, 'dir']], {}) : '<div class="vazio">Disponível com o banco na nuvem.</div>'}</div></div>
    <div><div class="secao-cab"><h2>Cotas de IA (hoje)</h2></div><div class="painel-box pb-corpo" style="padding:14px 16px">${u.ia.length ? u.ia.map((x) => `<div>${esc(x.chave)}: ${fmt(x.hoje)}</div>`).join('') : '<span class="mut">As funções de IA chegam na Fase 5. Sem chave, elas mostram o prompt pronto para copiar.</span>'}</div></div>
  </div>`;
};

// ---------- navegação ----------
async function carregarPaises() {
  try { PAISES_COM_DADOS = await api('/api/paises'); } catch { PAISES_COM_DADOS = []; }
  const com = new Map(PAISES_COM_DADOS.map((p) => [p.pais, p]));
  const sel = $('#paisGlobal');
  sel.innerHTML = `${com.size ? `<optgroup label="Com dados">${[...com.values()].map((p) => `<option value="${p.pais}">${p.pais} · ${esc(nomePais(p.pais))} (${fmt(p.paginas)})</option>`).join('')}</optgroup>` : ''}
    <optgroup label="Outros países">${PAISES.filter(([c]) => !com.has(c)).map(([c, n]) => `<option value="${c}">${c} · ${n}</option>`).join('')}</optgroup>`;
  sel.value = PAIS;
}
$('#paisGlobal').onchange = (e) => { PAIS = e.target.value; localStorage.paisAtual = PAIS; rota(); };

function desenharMenu(ativa) {
  $('#nav').innerHTML = MENU.map(([sec, itens]) => `<div class="sep">${sec}</div>${itens.map(([v, nome, i]) =>
    `<a href="#/${v === 'inicio' ? '' : v}" class="${v === ativa ? 'ativo' : ''}">${ic(i)}${nome}</a>`).join('')}`).join('');
}
function desenharTema() { $('#btTema').innerHTML = ic(document.documentElement.dataset.tema === 'escuro' ? 'sol' : 'lua'); }
$('#btTema').onclick = () => { const t = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro'; document.documentElement.dataset.tema = t; localStorage.tema = t; desenharTema(); };

async function rota() {
  const [, nome = '', arg] = (location.hash || '#/').match(/^#\/([^/]*)\/?(.*)$/) || [];
  const apelidos = { raiox: 'dominios', criativos: 'anuncios', acompanhando: 'listas' };
  const v = apelidos[nome] || nome || 'inicio';
  desenharMenu(v);
  const el = $('#conteudo');
  if (!TELAS[v]) { el.innerHTML = '<div class="painel-box vazio">Página não encontrada.</div>'; return; }
  try { await TELAS[v](el, arg ? decodeURIComponent(arg) : undefined); }
  catch (e) { el.innerHTML = `<div class="painel-box vazio">Erro ao carregar: ${esc(e.message)}</div>`; }
}
window.addEventListener('hashchange', () => { rota(); window.scrollTo(0, 0); });
(async () => {
  $('#btFechar').innerHTML = ic('fechar');
  $('#btSair').innerHTML = ic('sair');
  $('#btSair').onclick = sair;
  desenharTema();
  const pub = await fetch('/api/publico/config').then((r) => r.json()).catch(() => ({ auth: false }));
  if (pub.auth && window.supabase) {
    SB = window.supabase.createClient(pub.supabaseUrl, pub.anonKey, { auth: { persistSession: true, detectSessionInUrl: true } });
    const { data } = await SB.auth.getSession();
    if (!data.session) return telaLogin();
    $('#btSair').hidden = false;
    $('#btSair').title = 'Sair (' + (data.session.user.email || '') + ')';
  }
  CONFIG = await api('/api/config');
  await carregarPaises();
  rota();
  acompanhar();
})();
