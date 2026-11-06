// Casca do painel: entrada pública, login, boas-vindas, menu de 7 itens, busca global, conta, ajuda e rotas.
import { render } from 'preact';
import { useEffect, useRef, useState, useErrorBoundary } from 'preact/hooks';
import { html, loja, definir, useLoja, useRota, navegar, api, post, aviso, acompanhar, PAISES, nomePais, fmt } from './base.mjs';
import { Ic, Folha } from './ui.mjs';
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
import { TelaEntregaveis, TelaEntregavel } from './telas/entregavel.mjs';
import { TelaPaginas, TelaPagina } from './telas/paginas.mjs';
import { TelaEscalar } from './telas/escalar.mjs';
import { TelaRelatorio } from './telas/alertas.mjs';

// Sete lugares, na ordem do trabalho: encontrar → validar → modelar (Estúdio) → acompanhar (listas) → escalar.
const MENU = [
  ['/', 'Início', 'inicio', (c) => c === '/'],
  ['/ofertas', 'Ofertas', 'ofertas', (c) => /^\/(ofertas|oferta\/|comparar)/.test(c)],
  ['/criativos', 'Criativos', 'anuncios', (c) => /^\/(criativos|referencias)/.test(c)],
  ['/sites', 'Validar', 'validar', (c) => /^\/(sites|site\/|gateways)/.test(c)],
  ['/prompts', 'Estúdio', 'estudio', (c) => /^\/(prompts|editor|video|paginas|entregavel)/.test(c)],
  ['/listas', 'Minhas listas', 'listas', (c) => c.startsWith('/listas')],
  ['/calculadoras', 'Escalar', 'raio', (c) => /^\/(calculadoras|escalar)/.test(c)],
];
// Telas de cada seção que viram abas no topo da seção.
const SECOES = [
  { teste: /^\/(criativos|referencias)$/, nome: 'Criativos', itens: [['/criativos', 'Biblioteca'], ['/criativos?modo=significado', 'Por significado'], ['/criativos?modo=padroes', 'Padrões vencedores'], ['/referencias', 'Salvos']] },
  { teste: /^\/(sites|gateways)$/, nome: 'Validar', itens: [['/sites', 'Análise de site'], ['/gateways', 'Gateways']] },
  { teste: /^\/(prompts|editor|video|paginas|entregavel)$/, nome: 'Estúdio', itens: [['/prompts', 'Prompts'], ['/editor', 'Criativo'], ['/video', 'Vídeo'], ['/paginas', 'Página e quiz'], ['/entregavel', 'Entregável']] },
  { teste: /^\/(calculadoras|escalar)$/, nome: 'Escalar', itens: [['/calculadoras', 'Calculadoras e plano'], ['/escalar', 'Anúncios e vendas']] },
];
// Endereços curtos que levam à tela certa (e nomes antigos que mudaram).
const ATALHOS = { '/validar': '/sites', '/estudio': '/prompts', '/criar': '/prompts', '/escala': '/calculadoras' };
// Trecho do Método que explica cada parte do painel.
const AJUDA = [[/^\/(sites|site\/|gateways)/, '## 2. Validar'], [/^\/(prompts|editor|video|paginas|entregavel)/, '## 3. Modelar'],
  [/^\/(calculadoras|escalar)/, '## 4. Escalar'], [/^\/listas/, '## 4. Escalar'], [/./, '## 1. Encontrar']];

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
  [/^\/entregavel$/, () => html`<${TelaEntregaveis} />`],
  [/^\/paginas$/, () => html`<${TelaPaginas} />`],
  [/^\/escalar$/, () => html`<${TelaEscalar} />`],
  [/^\/relatorio$/, () => html`<${TelaRelatorio} />`],
  [/^\/paginas\/(\d+)$/, (m) => html`<${TelaPagina} id=${m[1]} />`],
  [/^\/entregavel\/(\d+)$/, (m) => html`<${TelaEntregavel} id=${m[1]} />`],
];

const Marca = ({ onClick }) => html`<a href="/" class="marca" onClick=${onClick}><span class="logo"><${Ic} n="alvo" t=${15} /></span>Minerador</a>`;

function Menu({ caminho }) {
  return html`<aside id="menu">
    <${Marca} />
    <nav class="principal" aria-label="Principal">${MENU.map(([href, nome, i, ativo]) => {
      const on = ativo(caminho);
      return html`<a href=${href} class=${on ? 'ativo' : ''} aria-current=${on ? 'page' : null}><${Ic} n=${i} />${nome}</a>`;
    })}</nav>
  </aside>`;
}

// Celular: as quatro telas mais usadas + "Mais" (o resto do menu e a conta numa folha).
function BarraInferior({ caminho, onMais }) {
  const itens = [MENU[0], MENU[1], MENU[2], MENU[5]];
  const noMais = !itens.some(([, , , ativo]) => ativo(caminho));
  return html`<nav class="barra-inf" aria-label="Principal">
    ${itens.map(([href, nome, i, ativo]) => html`<a href=${href} class=${ativo(caminho) ? 'ativo' : ''} aria-current=${ativo(caminho) ? 'page' : null}><${Ic} n=${i} />${nome === 'Minhas listas' ? 'Listas' : nome}</a>`)}
    <button type="button" class=${noMais ? 'ativo' : ''} onClick=${onMais} aria-haspopup="dialog"><${Ic} n="menu" />Mais</button>
  </nav>`;
}

function trocarTema() {
  const n = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro';
  document.documentElement.dataset.tema = n; localStorage.tema = n;
  definir({ tema: n });
}
const sair = async () => { await loja.sb?.auth.signOut(); location.href = '/'; };

// Lista de links da conta, usada no menu do topo (desktop) e na folha "Mais" (celular).
function ItensConta({ onFechar, onAjuda, comSecoes }) {
  const l = useLoja();
  const escuro = (l.tema || document.documentElement.dataset.tema) === 'escuro';
  return html`
    ${comSecoes ? html`${[MENU[3], MENU[4], MENU[6]].map(([href, nome, i]) => html`<a href=${href} onClick=${onFechar}><${Ic} n=${i} />${nome}</a>`)}<hr />` : null}
    <a href="/minerar" onClick=${onFechar}><${Ic} n="minerar" />Minerar agora</a>
    <a href="/relatorio" onClick=${onFechar}><${Ic} n="uso" />Relatório da semana</a>
    <button type="button" onClick=${() => { onFechar(); onAjuda(); }}><${Ic} n="ajuda" />Como usar esta tela</button>
    <a href="/metodo" onClick=${onFechar}><${Ic} n="metodo" />Método completo</a>
    <hr />
    <a href="/boas-vindas" onClick=${onFechar}><${Ic} n="conta" />Ajustar meu perfil</a>
    <a href="/uso" onClick=${onFechar}><${Ic} n="uso" />Uso e limites</a>
    <a href="/config" onClick=${onFechar}><${Ic} n="config" />Configurações</a>
    <button type="button" onClick=${trocarTema}><${Ic} n=${escuro ? 'sol' : 'lua'} />${escuro ? 'Usar tema claro' : 'Usar tema escuro'}</button>
    ${l.sb ? html`<hr /><button type="button" onClick=${sair}><${Ic} n="sair" />Sair</button>` : null}`;
}

function Conta({ onAjuda }) {
  const l = useLoja();
  const [aberto, setAberto] = useState(false);
  const ref = useRef();
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => { if (!ref.current?.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);
  return html`<div class="conta" ref=${ref}>
    <button class="bt-ic" aria-label="Conta e configurações" aria-expanded=${aberto} title="Conta e configurações" onClick=${() => setAberto(!aberto)}><${Ic} n="conta" t=${18} /></button>
    ${aberto ? html`<div class="conta-menu" role="menu">${l.usuario?.email ? html`<div class="quem">${l.usuario.email}</div>` : null}
      <${ItensConta} onFechar=${() => setAberto(false)} onAjuda=${onAjuda} /></div>` : null}
  </div>`;
}

// Busca única com autocompletar: anunciantes, sites, checkouts e gateways; sem resultado, oferece minerar o termo.
function BuscaGlobal() {
  const [q, setQ] = useState(''), [res, setRes] = useState(null), [foco, setFoco] = useState(false);
  const t = useRef(), entrada = useRef();
  useEffect(() => {
    const atalho = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); entrada.current?.focus(); } };
    document.addEventListener('keydown', atalho);
    return () => document.removeEventListener('keydown', atalho);
  }, []);
  useEffect(() => {
    clearTimeout(t.current);
    if (q.trim().length < 2) { setRes(null); return; }
    t.current = setTimeout(() => api('/api/busca?q=' + encodeURIComponent(q.trim())).then(setRes).catch(() => setRes(null)), 220);
  }, [q]);
  const ir = (url) => { setQ(''); setRes(null); setFoco(false); entrada.current?.blur(); navegar(url); };
  const enviar = (e) => {
    e.preventDefault();
    const termo = q.trim(); if (!termo) return;
    const gw = loja.config?.gateways?.find((g) => termo.toLowerCase().includes(g.raiz) || g.nome.toLowerCase() === termo.toLowerCase() || g.id === termo.toLowerCase());
    if (gw && !/\/[\w-]{4,}/.test(termo.replace(/^https?:\/\//, ''))) return ir('/gateways/' + gw.id);
    if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(termo)) return ir('/site/' + encodeURIComponent(termo.replace(/^https?:\/\//, '').split('/')[0]));
    ir('/ofertas?busca=' + encodeURIComponent(termo) + '&tipo=');
  };
  const vazio = res && !res.anunciantes.length && !res.dominios.length && !res.checkouts.length && !res.gateways.length;
  const op = (url, conteudo) => html`<button type="button" onMouseDown=${(e) => e.preventDefault()} onClick=${() => ir(url)}>${conteudo}</button>`;
  return html`<form class="busca" role="search" onSubmit=${enviar}>
    <${Ic} n="busca" />
    <input ref=${entrada} value=${q} onInput=${(e) => setQ(e.target.value)} onFocus=${() => setFoco(true)} onBlur=${() => setTimeout(() => setFoco(false), 150)}
      onKeyDown=${(e) => { if (e.key === 'Escape') { setQ(''); e.target.blur(); } }}
      placeholder="Buscar oferta, site, checkout ou gateway" aria-label="Buscar oferta, site, checkout ou gateway" autocomplete="off" />
    <kbd aria-hidden="true">Ctrl K</kbd>
    ${foco && res ? html`<div class="auto" role="listbox">
      ${res.anunciantes.length ? html`<div class="auto-sec">Anunciantes</div>${res.anunciantes.map((a) => op('/oferta/' + a.page_id, html`
        ${a.foto ? html`<img src=${a.foto} alt="" />` : html`<span class="av"></span>`}<span>${a.nome}</span><small class="mut">${a.ativos != null ? fmt(a.ativos) + ' anúncios' : ''}</small>`))}` : null}
      ${res.dominios.length ? html`<div class="auto-sec">Sites</div>${res.dominios.map((d) => op('/site/' + encodeURIComponent(d.dominio.split('/')[0]), html`
        <${Ic} n="dominio" /><span>${d.dominio}</span><small class="mut">${fmt(d.n)} anúncios</small>`))}` : null}
      ${res.checkouts.length ? html`<div class="auto-sec">Checkouts</div>${res.checkouts.map((c) => op('/gateways/' + c.gateway, html`
        <${Ic} n="gateways" /><span>${c.produto || c.checkout}</span><small class="mut">${c.preco || ''}</small>`))}` : null}
      ${res.gateways.length ? html`<div class="auto-sec">Gateways</div>${res.gateways.map((g) => op('/gateways/' + g.id, html`<${Ic} n="gateways" /><span>${g.nome}</span>`))}` : null}
      ${vazio ? html`<div class="auto-vazio mut">Nada coletado com "${q}" ainda.</div>` : null}
      <div class=${vazio ? '' : 'auto-acao'}>${op('/minerar?palavras=' + encodeURIComponent(q.trim()), html`<${Ic} n="minerar" /><span>Pedir ao robô para minerar "${q.trim()}"</span>`)}</div>
    </div>` : null}
  </form>`;
}

function SeletorPais() {
  const l = useLoja();
  const com = new Map(l.paises.map((p) => [p.pais, p]));
  return html`<select class="pais" value=${l.pais} title="País dos dados: cada país tem os seus" aria-label="País dos dados"
    onChange=${(e) => { localStorage.paisAtual = e.target.value; definir({ pais: e.target.value }); }}>
    ${com.size ? html`<optgroup label="Com dados">${[...com.values()].map((p) => html`<option value=${p.pais}>${p.pais} · ${nomePais(p.pais)} (${fmt(p.paginas)})</option>`)}</optgroup>` : null}
    <optgroup label="Ainda sem dados (o robô busca quando você escolher)">${PAISES.filter(([c]) => !com.has(c)).map(([c, n]) => html`<option value=${c}>${c} · ${n}</option>`)}</optgroup>
  </select>`;
}

// No lugar do "Minerar agora", mostra o robô trabalhando quando há uma coleta em andamento.
function AcaoRobo() {
  const { tarefa } = useLoja();
  if (tarefa?.rodando) {
    const ultima = (tarefa.log || []).filter(Boolean).slice(-1)[0] || '';
    return html`<a href="/minerar" class="status-tarefa" title=${ultima} aria-label=${'Robô trabalhando: ' + (tarefa.descricao || tarefa.tipo)}><span class="ponto vivo"></span><b>${tarefa.descricao || tarefa.tipo}</b></a>`;
  }
  return html`<a href="/minerar" class="botao so-desktop"><${Ic} n="minerar" />Minerar agora</a>`;
}

function BotaoTema() {
  const l = useLoja();
  const escuro = (l.tema || document.documentElement.dataset.tema) === 'escuro';
  return html`<button class="bt-ic so-desktop" title=${escuro ? 'Usar tema claro' : 'Usar tema escuro'} aria-label=${escuro ? 'Usar tema claro' : 'Usar tema escuro'} onClick=${trocarTema}><${Ic} n=${escuro ? 'sol' : 'lua'} /></button>`;
}

// Abas de uma seção (Validar, Estúdio, Escalar): cada aba é um endereço próprio.
function AbasSecao({ caminho, busca }) {
  const s = SECOES.find((x) => x.teste.test(caminho));
  if (!s) return null;
  const atual = caminho + (busca.get('modo') ? '?modo=' + busca.get('modo') : '');
  return html`<nav class="subnav" aria-label=${s.nome}>${s.itens.map(([href, nome]) => html`<a href=${href} class=${atual === href ? 'ativo' : ''} aria-current=${atual === href ? 'page' : null}>${nome}</a>`)}</nav>`;
}

// "Como usar": só o trecho do Método que vale para a tela aberta.
function Ajuda({ caminho, onFechar }) {
  const [md, setMd] = useState('');
  useEffect(() => { fetch('/METODO.md').then((r) => r.text()).then(setMd).catch(() => setMd('')); }, []);
  const titulo = AJUDA.find(([re]) => re.test(caminho))[1];
  const ini = md.indexOf(titulo), fim = ini < 0 ? -1 : md.indexOf('\n## ', ini + 4);
  const trecho = ini < 0 ? '' : md.slice(ini, fim < 0 ? undefined : fim).replace(/^## \d\. /, '## ');
  return html`<${Folha} titulo="Como usar" onFechar=${onFechar} rodape=${html`<a class="botao" href="/metodo" onClick=${onFechar}>Ler o método completo</a><button class="pri" onClick=${onFechar}>Entendi</button>`}>
    ${md ? html`<div class="md md-folha" dangerouslySetInnerHTML=${{ __html: window.marked ? window.marked.parse(trecho) : trecho }}></div>` : html`<p class="mut">Carregando…</p>`}
  </${Folha}>`;
}

function BarraComparar() {
  const { comparar } = useLoja();
  if (!comparar.length) return null;
  return html`<div class="barra-comparar" role="region" aria-label="Comparar ofertas"><span>${comparar.length} de 3 para comparar</span>
    <button class="fantasma" onClick=${() => definir({ comparar: [] })}>Limpar</button>
    <a class=${'botao' + (comparar.length > 1 ? ' pri' : '')} href=${'/comparar?ids=' + comparar.join(',')}>Comparar lado a lado</a></div>`;
}

// Um erro numa tela fica nela: o menu e as outras telas continuam funcionando.
function Limite({ children }) {
  const [erro, limpar] = useErrorBoundary((e) => console.error(e));
  if (erro) return html`<div class="painel-box vazio-acao"><b>Esta tela parou de funcionar</b><p class="mut">${String(erro.message || erro)}. As outras telas continuam normais.</p><button onClick=${limpar}>Abrir a tela de novo</button></div>`;
  return children;
}

function Painel() {
  const l = useLoja();
  const { caminho, busca } = useRota();
  const [mais, setMais] = useState(false), [ajuda, setAjuda] = useState(false);
  useEffect(() => { if (l.perfil && !l.perfil.concluido && caminho !== '/boas-vindas') navegar('/boas-vindas', { trocar: true }); }, [l.perfil, caminho]);
  useEffect(() => { if (ATALHOS[caminho]) navegar(ATALHOS[caminho] + location.search, { trocar: true }); }, [caminho]);
  let tela = html`<div class="painel-box vazio-acao"><b>Esta página não existe</b><p class="mut">O endereço pode ter mudado. As ofertas continuam no mesmo lugar.</p><a class="botao pri" href="/">Ir para o início</a></div>`;
  for (const [re, f] of ROTAS) { const m = caminho.match(re); if (m) { tela = f(m); break; } }
  return html`<${Menu} caminho=${caminho} />
    <div class="area">
      <header id="topo">
        <a href="/" class="marca-celular so-celular" aria-label="Início"><span class="logo"><${Ic} n="alvo" t=${15} /></span></a>
        <${BuscaGlobal} />
        <div class="direita">
          <button class="fantasma so-desktop" onClick=${() => setAjuda(true)}><${Ic} n="ajuda" />Como usar</button>
          <${AcaoRobo} /><${SeletorPais} /><${BotaoTema} /><span class="so-desktop"><${Conta} onAjuda=${() => setAjuda(true)} /></span>
        </div>
      </header>
      <main id="conteudo" key=${l.pais}><${AbasSecao} caminho=${caminho} busca=${busca} /><${Limite} key=${caminho.split('/').slice(0, 3).join('/')}>${tela}</${Limite}></main>
    </div>
    <${BarraInferior} caminho=${caminho} onMais=${() => setMais(true)} />
    ${mais ? html`<${Folha} titulo="Mais" onFechar=${() => setMais(false)}><nav class="conta-menu em-folha" aria-label="Mais opções">
      <${ItensConta} comSecoes onFechar=${() => setMais(false)} onAjuda=${() => setAjuda(true)} /></nav></${Folha}>` : null}
    ${ajuda ? html`<${Ajuda} caminho=${caminho} onFechar=${() => setAjuda(false)} />` : null}
    <${BarraComparar} />
    ${l.toast ? html`<div class="toast" role="status">${l.toast}</div>` : null}`;
}

// Página pública (sem login): o que a ferramenta faz + entrar.
function Entrada({ msg }) {
  const [email, setEmail] = useState(''), [senha, setSenha] = useState(''), [erro, setErro] = useState(typeof msg === 'string' ? msg : ''), [ok, setOk] = useState('');
  const sb = loja.sb;
  const entrar = async (e) => {
    e.preventDefault(); setErro(''); setOk('');
    if (!senha) { const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } }); return error ? setErro(error.message) : setOk('Enviamos um link de acesso para o seu e-mail. Abra por este aparelho.'); }
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) return setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos. Confira e tente de novo, ou deixe a senha vazia para receber um link.' : error.message);
    location.reload();
  };
  const passos = [['Encontrar', 'Ofertas low ticket já escaladas, separadas por país, com preço, gateway e checkout.'],
    ['Validar', 'Ritmo de anúncios em 7, 14 e 30 dias, contas no mesmo checkout e o criativo campeão.'],
    ['Modelar', 'Prompts e editores para criar a sua versão: criativo, página, quiz e entregável.'],
    ['Escalar', 'CPA máximo, ROAS, plano de campanha e o funil das ofertas que você está testando.']];
  return html`<div class="entrada">
    <header class="entrada-topo"><span class="marca"><span class="logo"><${Ic} n="alvo" t=${15} /></span>Minerador</span></header>
    <section class="entrada-hero">
      <div><h1>Ache ofertas low ticket que já estão vendendo e modele a sua.</h1>
        <p class="mut">Um robô lê a Biblioteca de Anúncios várias vezes por dia, conta os anúncios de cada anunciante e mostra quem está escalando agora, com o checkout e o preço.</p>
        <div class="passos-entrada">${passos.map(([t, d], n) => html`<div><span class="num-passo">${n + 1}</span><b>${t}</b><p class="mut peq">${d}</p></div>`)}</div></div>
      <form class="painel-box login" onSubmit=${entrar}><div class="pb-corpo">
        <h2>Entrar</h2><p class="mut peq" style="margin:0">Use o e-mail autorizado para este painel.</p>
        ${erro ? html`<div class="aviso-erro" role="alert">${erro}</div>` : null}${ok ? html`<div class="aviso-ok" role="status">${ok}</div>` : null}
        <label class="campo">E-mail<input type="email" required autocomplete="email" value=${email} onInput=${(e) => setEmail(e.target.value)} /></label>
        <label class="campo">Senha<input type="password" autocomplete="current-password" value=${senha} onInput=${(e) => setSenha(e.target.value)} placeholder="Vazia: enviamos um link por e-mail" /></label>
        <button class="pri" type="submit">Entrar</button>
        <button class="fantasma" type="button" onClick=${async () => {
          if (!email || senha.length < 8) return setErro('Para criar a conta, informe o e-mail e uma senha com pelo menos 8 caracteres.');
          const { error } = await sb.auth.signUp({ email, password: senha, options: { emailRedirectTo: location.origin } });
          error ? setErro(error.message) : setOk('Conta criada. Confirme pelo link que enviamos ao seu e-mail.');
        }}>Primeiro acesso: criar conta</button></div></form>
    </section>
    <footer class="entrada-rod mut peq">Ferramenta pessoal e gratuita. Dados públicos da Biblioteca de Anúncios da Meta.</footer>
  </div>`;
}

function App() {
  const l = useLoja();
  if (l.precisaLogin || (l.sb && !l.usuario)) return html`<${Entrada} msg=${l.precisaLogin} />`;
  if (!l.config) return html`<div class="carregando-app" role="status" aria-label="Carregando"><span class="logo"><${Ic} n="alvo" /></span></div>`;
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
  } catch (e) { if (!loja.precisaLogin) aviso('O painel não carregou: ' + e.message + '. Recarregue a página.'); }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
})();

export { post };
