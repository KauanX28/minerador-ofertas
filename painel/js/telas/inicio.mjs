// Início guiado: os 4 passos (encontrar → validar → modelar → escalar) e as ofertas do dia para o perfil do usuário.
import { html, useLoja, useDados, nomePais, fmt, relativo } from '../base.mjs';
import { Ic, CartaoOferta, Esqueleto, Vazio, Erro } from '../ui.mjs';

export function TelaInicio() {
  const l = useLoja();
  const nichos = (l.perfil?.nichos || []).join('|');
  const painel = useDados('/api/painel');
  const doPerfil = useDados(`/api/paginas?ordem=oportunidade&por=6&nichos=${encodeURIComponent(nichos)}`, [nichos]);
  // Se os nichos escolhidos ainda não têm dados neste país, mostra os melhores de todos os nichos (com aviso).
  const semNicho = !doPerfil.carregando && nichos && !doPerfil.dados?.itens?.length;
  const todos = useDados(semNicho ? '/api/paginas?ordem=oportunidade&por=6' : null, [semNicho]);
  const paraVoce = semNicho ? todos : doPerfil;
  const acelerando = useDados('/api/paginas?acelerando=1&por=6&tipo=low', []);
  const listas = useDados('/api/favoritos');
  const d = painel.dados;
  const etapa = (e) => (listas.dados || []).filter((f) => (f.etapa || 'minerada') === e).length;
  const iniciante = (l.perfil?.nivel || 'iniciante') === 'iniciante';
  const passos = [
    ['1', 'Encontrar', d ? `${fmt(d.escaladas)} ofertas low ticket escaladas` : '…', 'Ver ofertas', '/ofertas', 'alvo'],
    ['2', 'Validar', listas.dados ? `${etapa('validando')} em validação na sua lista` : '…', 'Abrir lista', '/listas', 'check'],
    ['3', 'Modelar', d ? `${fmt(d.oportunidades?.length || 0)}+ boas para modelar` : '…', 'Ver oportunidades', '/ofertas?ordem=oportunidade', 'copiar'],
    ['4', 'Escalar', 'CPA máximo, ROAS e plano de campanha', 'Calcular', '/calculadoras', 'raio'],
  ];
  if (painel.erro) return html`<${Erro} msg=${painel.erro} />`;
  return html`
    <div class="cab"><div><h1>Início</h1><p>${nomePais(l.pais)}${l.perfil?.nichos?.length ? ' · ' + l.perfil.nichos.slice(0, 3).join(', ') + (l.perfil.nichos.length > 3 ? '…' : '') : ''}
      ${d?.ultimaBusca ? html` · robô coletou ${relativo(d.ultimaBusca)}` : null}</p></div>
      <a class="botao" href="/boas-vindas">Ajustar meu perfil</a></div>
    <div class="passos">${passos.map(([n, t, sub, acao, href, i]) => html`<a class="passo" href=${href}>
      <span class="num-passo">${n}</span><div><b>${t}</b><span class="mut peq">${sub}</span></div><span class="passo-acao">${acao} <${Ic} n="seta" t=${14} /></span></a>`)}</div>
    ${iniciante ? html`<div class="dica"><b>Como usar:</b> abra uma oferta da lista abaixo, veja os criativos que mais se repetem (são os campeões), salve na sua lista e use "Modelar" para criar a sua versão. A nota de cada oferta explica o porquê ao passar o mouse.</div>` : null}
    <section class="secao"><div class="secao-cab"><h2>Melhores para modelar hoje</h2><a class="peq" href="/ofertas?ordem=oportunidade">Ver todas</a></div>
      ${semNicho && todos.dados?.itens?.length ? html`<p class="mut peq" style="margin-top:-4px">Seus nichos ainda não têm ofertas coletadas em ${nomePais(l.pais)}; mostrando todos. O robô inclui seus nichos no rodízio.</p>` : null}
      ${paraVoce.carregando ? html`<${Esqueleto} cards=${6} />` : paraVoce.dados?.itens?.length ? html`<div class="feed">${paraVoce.dados.itens.map((p) => html`<${CartaoOferta} p=${p} />`)}</div>`
        : html`<${Vazio} titulo="Ainda sem ofertas neste país" texto="O robô coleta 4 vezes por dia. Você também pode pedir uma coleta agora." acao="Minerar agora" href="/minerar" />`}</section>
    <section class="secao"><div class="secao-cab"><h2>Novas acelerando</h2><a class="peq" href="/ofertas?acelerando=1">Ver todas</a></div>
      ${acelerando.carregando ? html`<${Esqueleto} cards=${3} />` : acelerando.dados?.itens?.length ? html`<div class="feed">${acelerando.dados.itens.map((p) => html`<${CartaoOferta} p=${p} />`)}</div>`
        : html`<div class="painel-box vazio peq">Nenhuma oferta nova acelerando agora. Esta lista se preenche sozinha conforme o robô reconta os anunciantes todo dia.</div>`}</section>`;
}
