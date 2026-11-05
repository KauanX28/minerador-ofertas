// Casca do painel: entrada pública, login, boas-vindas, menu guiado, busca global e rotas.
import { render } from 'preact';
import { useEffect, useRef, useState, useErrorBoundary } from 'preact/hooks';
import { html, loja, definir, useLoja, useRota, navegar, api, post, aviso, acompanhar, PAISES, nomePais, fmt } from './base.mjs';
import { Ic } from './ui.mjs';
import { TelaInicio } from './telas/inicio.mjs';
import { TelaOfertas, TelaComparar } from './telas/ofertas.mjs';
import { TelaOferta } from './telas/oferta.mjs';
import { TelaCriativos } from './telas/criativos.mjs';
import { TelaGateways, TelaGateway } from './telas/gateways.mjs';
import { TelaSites, TelaSite } from './telas/sites.mjs';
import { TelaListas } from './telas/listas.mjs';
import { TelaCalculadoras } from './telas/calculadoras.mjs';
import { TelaPrompts, TelaMetodo } from './telas/conteudo.mjs';
import { TelaMinerar } from './telas/minerar.mjs';
import { TelaConfig } from './telas/config.mjs';
import { TelaUso } from './telas/uso.mjs';
import { BoasVindas } from './telas/boasvindas.mjs';
import { TelaEditor } from './telas/editor.mjs';
import { TelaVideo } from './telas/video.mjs';
import { TelaReferencias } from './telas/referencias.mjs';

// O menu segue o caminho de trabalho: encontrar → validar → modelar → escalar.
const MENU = [
  [null, [['/', 'Início', 'inicio']]],
  ['1 · Encontrar', [['/ofertas', 'Ofertas escaladas', 'ofertas'], ['/criativos', 'Criativos', 'anuncios'], ['/gateways', 'Gateways', 'gateways']]],
  ['2 · Validar', [['/sites', 'Análise de site', 'dominio']]],
  ['3 · Modelar', [['/prompts', 'Prompts de modelagem', 'prompts'], ['/editor', 'Editor de criativo', 'anuncios'], ['/video', 'Vídeo simples', 'raio'], ['/referencias', 'Referências salvas', 'estrela']]],
  ['4 · Escalar', [['/calculadoras', 'Calculadoras e plano', 'calc']]],
  ['Trabalho', [['/listas', 'Minhas listas', 'listas']]],
];
const MENU_RODAPE = [['/minerar', 'Minerar agora', 'minerar'], ['/metodo', 'Método', 'metodo'], ['/uso', 'Uso e limites', 'uso'], ['/config', 'Configurações', 'config']];

const ROTAS = [
  [/^\/$/, () => html`<${TelaInicio} />`],
  [/^\/ofertas$/, () => html`<${TelaOfertas} />`],
  [/^\/oferta\/([^/]+)(?:\/(\w+))?$/, (m) => html`<${TelaOferta} id=${decodeURIComponent(m[1])} aba=${m[2] || 'geral'} />`],
  [/^\/comparar$/, () => html`<${TelaComparar} />`],
  [/^\/criativos$/, () => html`<${TelaCriativos} />`],
  [/^\/gateways$/, () => html`<${TelaGateways} />`],
  [/^\/gateways\/([^/]+)$/, (m) => html`<${TelaGateway} id=${m[1]} />`],
  [/^\/sites$/, () => html`<${TelaSites} />`],
  [/^\/site\/(.+)$/, (m) => html`<${TelaSite} dominio=${decodeURIComponent(m[1])} />`],
  [/^\/listas$/, () => html`<${TelaListas} />`],
  [/^\/calculadoras$/, () => html`<${TelaCalculadoras} />`],
  [/^\/prompts$/, () => html`<${TelaPrompts} />`],
  [/^\/metodo$/, () => html`<${TelaMetodo} />`],
  [/^\/minerar$/, () => html`<${TelaMinerar} />`],
  [/^\/config$/, () => html`<${TelaConfig} />`],
  [/^\/uso$/, () => html`<${TelaUso} />`],
  [/^\/boas-vindas$/, () => html`<${BoasVindas} />`],
  [/^\/editor$/, () => html`<${TelaEditor} />`],
  [/^\/video$/, () => html`<${TelaVideo} />`],
  [/^\/referencias$/, () => html`<${TelaReferencias} />`],
];

function Menu({ caminho, aberto, onFechar }) {
  const ativo = (href) => (href === '/' ? caminho === '/' : caminho.startsWith(href) || (href === '/ofertas' && caminho.startsWith('/oferta')) || (href === '/sites' && caminho.startsWith('/site')));
  const item = ([href, nome, i]) => html`<a href=${href} class=${ativo(href) ? 'ativo' : ''} aria-current=${ativo(href) ? 'page' : null} onClick=${onFechar}><${Ic} n=${i} />${nome}</a>`;
  return html`<aside id="menu" class=${aberto ? 'aberto' : ''}>
    <a href="/" class="marca" onClick=${onFechar}><span class="logo"><${Ic} n="alvo" t=${15} /></span>Minerador</a>
    <nav aria-label="Principal">${MENU.map(([sec, itens]) => html`${sec ? html`<div class="sep">${sec}</div>` : null}${itens.map(item)}`)}</nav>
    <nav class="nav-rodape" aria-label="Ferramentas">${MENU_RODAPE.map(item)}</nav>
  </aside>${aberto ? html`<div class="fundo on menu-fundo" onClick=${onFechar}></div>` : null}`;
}

// Busca única com autocompletar: anunciantes, sites, checkouts e gateways.
function BuscaGlobal() {
  const [q, setQ] = useState(''), [res, setRes] = useState(null), [foco, setFoco] = useState(false);
  const t = useRef();
  useEffect(() => {
    clearTimeout(t.current);
    if (q.trim().length < 2) { setRes(null); return; }
    t.current = setTimeout(() => api('/api/busca?q=' + encodeURIComponent(q.trim())).then(setRes).catch(() => setRes(null)), 220);
  }, [q]);
  const ir = (url) => { setQ(''); setRes(null); setFoco(false); navegar(url); };
  const enviar = (e) => {
    e.preventDefault();
    const termo = q.trim(); if (!termo) return;
    const gw = loja.config?.gateways?.find((g) => termo.toLowerCase().includes(g.raiz) || g.nome.toLowerCase() === termo.toLowerCase() || g.id === termo.toLowerCase());
    if (gw && !/\/[\w-]{4,}/.test(termo.replace(/^https?:\/\//, ''))) return ir('/gateways/' + gw.id);
    if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(termo)) return ir('/site/' + encodeURIComponent(termo.replace(/^https?:\/\//, '').split('/')[0]));
    ir('/ofertas?busca=' + encodeURIComponent(termo) + '&tipo=');
  };
  const vazio = res && !res.anunciantes.length && !res.dominios.length && !res.checkouts.length && !res.gateways.length;
  return html`<form class="busca" role="search" onSubmit=${enviar}>
    <${Ic} n="busca" />
    <input value=${q} onInput=${(e) => setQ(e.target.value)} onFocus=${() => setFoco(true)} onBlur=${() => setTimeout(() => setFoco(false), 180)}
      placeholder="Buscar anunciante, site, link de checkout ou gateway (ex.: kiwify)" aria-label="Busca" autocomplete="off" />
    ${foco && res ? html`<div class="auto" role="listbox">
      ${res.anunciantes.length ? html`<div class="auto-sec">Anunciantes</div>${res.anunciantes.map((a) => html`<button type="button" onMouseDown=${() => ir('/oferta/' + a.page_id)}>
        ${a.foto ? html`<img src=${a.foto} alt="" />` : html`<span class="av"></span>`}<span>${a.nome}</span><small class="mut">${a.ativos != null ? fmt(a.ativos) + ' anúncios' : ''}</small></button>`)}` : null}
      ${res.dominios.length ? html`<div class="auto-sec">Sites</div>${res.dominios.map((d) => html`<button type="button" onMouseDown=${() => ir('/site/' + encodeURIComponent(d.dominio.split('/')[0]))}>
        <${Ic} n="dominio" /><span>${d.dominio}</span><small class="mut">${fmt(d.n)} anúncios</small></button>`)}` : null}
      ${res.checkouts.length ? html`<div class="auto-sec">Checkouts</div>${res.checkouts.map((c) => html`<button type="button" onMouseDown=${() => ir('/gateways/' + c.gateway)}>
        <${Ic} n="gateways" /><span>${c.produto || c.checkout}</span><small class="mut">${c.preco || ''}</small></button>`)}` : null}
      ${res.gateways.length ? html`<div class="auto-sec">Gateways</div>${res.gateways.map((g) => html`<button type="button" onMouseDown=${() => ir('/gateways/' + g.id)}><${Ic} n="gateways" /><span>${g.nome}</span></button>`)}` : null}
      ${vazio ? html`<div class="auto-vazio mut">Nada salvo com "${q}". Pressione Enter para procurar nas ofertas ou <a href=${'/minerar?palavras=' + encodeURIComponent(q)} onMouseDown=${() => ir('/minerar?palavras=' + encodeURIComponent(q))}>minerar na Biblioteca</a>.</div>` : null}
    </div>` : null}
  </form>`;
}

function SeletorPais() {
  const l = useLoja();
  const com = new Map(l.paises.map((p) => [p.pais, p]));
  return html`<select class="pais" value=${l.pais} title="País dos dados (cada país fica separado)" aria-label="País"
    onChange=${(e) => { localStorage.paisAtual = e.target.value; definir({ pais: e.target.value }); }}>
    ${com.size ? html`<optgroup label="Com dados">${[...com.values()].map((p) => html`<option value=${p.pais}>${p.pais} · ${nomePais(p.pais)} (${fmt(p.paginas)})</option>`)}</optgroup>` : null}
    <optgroup label="Sem dados ainda (minere para preencher)">${PAISES.filter(([c]) => !com.has(c)).map(([c, n]) => html`<option value=${c}>${c} · ${n} — vazio</option>`)}</optgroup>
  </select>`;
}

function StatusRobo() {
  const { tarefa } = useLoja();
  if (!tarefa?.rodando) return null;
  const ultima = (tarefa.log || []).filter(Boolean).slice(-1)[0] || '';
  return html`<a href="/minerar" class="status-tarefa on" title=${ultima}><span class="ponto vivo"></span><b>${tarefa.descricao || tarefa.tipo}</b></a>`;
}

function Tema() {
  const [t, set] = useState(document.documentElement.dataset.tema);
  return html`<button class="bt-ic" title="Tema claro/escuro" aria-label="Alternar tema" onClick=${() => { const n = t === 'escuro' ? 'claro' : 'escuro'; document.documentElement.dataset.tema = n; localStorage.tema = n; set(n); }}><${Ic} n=${t === 'escuro' ? 'sol' : 'lua'} /></button>`;
}

function BarraComparar() {
  const { comparar } = useLoja();
  if (!comparar.length) return null;
  return html`<div class="barra-comparar"><span>${comparar.length} selecionada${comparar.length > 1 ? 's' : ''} para comparar (até 3)</span>
    <button onClick=${() => definir({ comparar: [] })}>Limpar</button>
    <a class="botao pri" href=${'/comparar?ids=' + comparar.join(',')}>Comparar lado a lado</a></div>`;
}

// Um erro numa tela fica nela: o menu e as outras telas continuam funcionando.
function Limite({ children }) {
  const [erro, limpar] = useErrorBoundary((e) => console.error(e));
  if (erro) return html`<div class="painel-box vazio-acao"><b>Esta tela teve um erro</b><p class="mut">${String(erro.message || erro)}</p><button onClick=${limpar}>Tentar de novo</button></div>`;
  return children;
}

function Painel() {
  const l = useLoja();
  const { caminho } = useRota();
  const [menu, setMenu] = useState(false);
  useEffect(() => { if (l.perfil && !l.perfil.concluido && caminho !== '/boas-vindas') navegar('/boas-vindas', { trocar: true }); }, [l.perfil, caminho]);
  let tela = html`<div class="painel-box vazio">Página não encontrada. <a href="/">Voltar ao início</a></div>`;
  for (const [re, f] of ROTAS) { const m = caminho.match(re); if (m) { tela = f(m); break; } }
  return html`<${Menu} caminho=${caminho} aberto=${menu} onFechar=${() => setMenu(false)} />
    <div class="area">
      <header id="topo">
        <button class="bt-ic so-celular" aria-label="Abrir menu" onClick=${() => setMenu(true)}><${Ic} n="menu" /></button>
        <${BuscaGlobal} />
        <div class="direita"><${StatusRobo} /><${SeletorPais} /><${Tema} />
          ${l.sb ? html`<button class="bt-ic" title=${'Sair (' + (l.usuario?.email || '') + ')'} aria-label="Sair" onClick=${async () => { await l.sb.auth.signOut(); location.href = '/'; }}><${Ic} n="sair" /></button>` : null}</div>
      </header>
      <main id="conteudo" key=${l.pais}><${Limite} key=${caminho.split('/').slice(0, 3).join('/')}>${tela}</${Limite}></main>
    </div>
    <${BarraComparar} />
    ${l.toast ? html`<div class="toast on" role="status">${l.toast}</div>` : null}`;
}

// Página pública (sem login): o que a ferramenta faz + entrar.
function Entrada({ msg }) {
  const [email, setEmail] = useState(''), [senha, setSenha] = useState(''), [erro, setErro] = useState(typeof msg === 'string' ? msg : ''), [ok, setOk] = useState('');
  const sb = loja.sb;
  const entrar = async (e) => {
    e.preventDefault(); setErro(''); setOk('');
    if (!senha) { const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } }); return error ? setErro(error.message) : setOk('Enviamos um link de acesso para o seu e-mail.'); }
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) return setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
    location.reload();
  };
  const passos = [['alvo', 'Encontrar', 'Ofertas low ticket já escaladas, separadas por país, com preço, gateway e checkout.'],
    ['check', 'Validar', 'Ritmo de anúncios em 7, 14 e 30 dias, contas no mesmo checkout e criativo campeão.'],
    ['copiar', 'Modelar', 'Prompts prontos para criar criativos, página e quiz novos a partir da referência.'],
    ['raio', 'Escalar', 'Calculadoras de CPA e ROAS, plano de campanha e funil de trabalho.']];
  return html`<div class="entrada">
    <header class="entrada-topo"><span class="marca"><span class="logo"><${Ic} n="alvo" t=${15} /></span>Minerador</span></header>
    <section class="entrada-hero">
      <div><h1>Ache ofertas low ticket que já estão vendendo, e modele as suas.</h1>
        <p class="mut">Um robô lê a Biblioteca de Anúncios todo dia, conta os anúncios de cada anunciante e mostra quem está escalando agora, com o checkout e o preço.</p>
        <div class="passos-entrada">${passos.map(([i, t, d], n) => html`<div><span class="num-passo">${n + 1}</span><b>${t}</b><p class="mut peq">${d}</p></div>`)}</div></div>
      <form class="painel-box login" onSubmit=${entrar}><div class="pb-corpo">
        <h2>Entrar</h2><p class="mut peq">Use o e-mail autorizado para este painel.</p>
        ${erro ? html`<div class="aviso-erro">${erro}</div>` : null}${ok ? html`<div class="aviso-ok">${ok}</div>` : null}
        <label class="campo">E-mail<input type="email" required autocomplete="email" value=${email} onInput=${(e) => setEmail(e.target.value)} /></label>
        <label class="campo">Senha<input type="password" autocomplete="current-password" value=${senha} onInput=${(e) => setSenha(e.target.value)} placeholder="ou deixe vazio para receber um link" /></label>
        <button class="pri" type="submit">Entrar</button>
        <button class="fantasma" type="button" onClick=${async () => {
          if (!email || senha.length < 8) return setErro('Informe o e-mail e uma senha com 8+ caracteres.');
          const { error } = await sb.auth.signUp({ email, password: senha, options: { emailRedirectTo: location.origin } });
          error ? setErro(error.message) : setOk('Conta criada. Confirme pelo link enviado ao seu e-mail.');
        }}>Primeiro acesso: criar conta</button></div></form>
    </section>
    <footer class="entrada-rod mut peq">Ferramenta pessoal e gratuita. Dados públicos da Biblioteca de Anúncios da Meta.</footer>
  </div>`;
}

function App() {
  const l = useLoja();
  if (l.precisaLogin || (l.sb && !l.usuario)) return html`<${Entrada} msg=${l.precisaLogin} />`;
  if (!l.config) return html`<div class="carregando-app"><span class="logo"><${Ic} n="alvo" /></span></div>`;
  return html`<${Painel} />`;
}

(async () => {
  render(html`<${App} />`, document.getElementById('app'));
  const pub = await fetch('/api/publico/config').then((r) => r.json()).catch(() => ({ auth: false }));
  if (pub.auth && window.supabase) {
    const sb = window.supabase.createClient(pub.supabaseUrl, pub.anonKey, { auth: { persistSession: true, detectSessionInUrl: true } });
    const { data } = await sb.auth.getSession();
    definir({ sb, usuario: data.session?.user || null });
    if (!data.session) return;
  }
  try {
    const [config, paises, perfil] = await Promise.all([api('/api/config'), api('/api/paises').catch(() => []), api('/api/prefs').catch(() => ({}))]);
    if (perfil.pais && !localStorage.paisAtual) { loja.pais = perfil.pais; }
    definir({ config, paises, perfil });
    acompanhar();
  } catch (e) { if (!loja.precisaLogin) aviso('Erro ao carregar: ' + e.message); }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
})();

export { post };
