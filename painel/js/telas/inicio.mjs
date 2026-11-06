// Início: a ação de hoje, o progresso no método e as ofertas para o perfil do usuário.
import { html, useLoja, useDados, nomePais, fmt, relativo, compacto } from '../base.mjs';
import { Ic, CartaoOferta, Esqueleto, Vazio, Erro, Status } from '../ui.mjs';
import { FocoBusca } from '../foco.mjs';
import { useState } from 'preact/hooks';

// A ação principal do dia: depende do que já está na lista de trabalho.
function AcaoDoDia({ top, listas, iniciante }) {
  const em = (e) => listas.filter((f) => (f.etapa || 'minerada') === e);
  const testando = em('testando').length + em('escalando').length, validando = em('validando'), modelando = em('modelando');
  if (testando) return html`<div class="hoje-acao"><span class="mut peq">Em teste</span>
    <h2>${testando === 1 ? 'Você tem 1 oferta em teste' : `Você tem ${testando} ofertas em teste`}. Confira os números de hoje antes de mexer no orçamento.</h2>
    <p>Corte o criativo que passou de 1 a 1,5 ticket sem venda e duplique o que vende abaixo do CPA alvo.</p>
    <div class="linha"><a class="botao pri" href="/escalar">Ver anúncios e vendas</a><a class="botao" href="/calculadoras">Calcular o CPA alvo</a></div></div>`;
  if (modelando.length) return html`<div class="hoje-acao"><span class="mut peq">Modelando</span>
    <h2>Continue a sua versão de ${modelando[0].nome || 'uma oferta salva'}.</h2>
    <p>No Estúdio há prompts prontos para criar o criativo, a página, o quiz e o entregável a partir da referência.</p>
    <div class="linha"><a class="botao pri" href="/prompts">Abrir o Estúdio</a><a class="botao" href="/listas">Ver minhas listas</a></div></div>`;
  if (validando.length) return html`<div class="hoje-acao"><span class="mut peq">Validando</span>
    <h2>${validando.length === 1 ? `${validando[0].nome || 'Uma oferta'} está em validação` : `${validando.length} ofertas em validação`}. Veja se continuam subindo.</h2>
    <p>Volume estável ou subindo há 2 semanas e várias contas no mesmo checkout indicam que vende.</p>
    <div class="linha"><a class="botao pri" href="/listas">Abrir minhas listas</a></div></div>`;
  if (top) return html`<div class="hoje-acao"><${Status} s=${top.status} />
    <h2>Comece por ${top.nome}: ${compacto(top.ativos)} anúncios ativos há ${top.dias} dias.</h2>
    <p>${iniciante ? 'Abra a oferta, veja os criativos que mais se repetem (são os campeões) e salve na sua lista com a estrela.' : top.motivoOport || 'É a melhor para modelar no seu perfil agora.'}</p>
    <div class="linha"><a class="botao pri" href=${'/oferta/' + encodeURIComponent(top.page_id)}>Abrir esta oferta</a><a class="botao" href="/ofertas?ordem=oportunidade">Ver outras opções</a></div></div>`;
  return html`<div class="hoje-acao"><h2>O robô ainda está juntando ofertas para o seu perfil.</h2>
    <p>Enquanto isso, veja todas as ofertas escaladas do país.</p><a class="botao pri" href="/ofertas">Ver ofertas escaladas</a></div>`;
}

// O método em 4 passos, com a contagem de cada etapa da lista.
function Trilha({ escaladas, listas }) {
  const n = (...es) => listas.filter((f) => es.includes(f.etapa || 'minerada')).length;
  const passos = [['/ofertas', 'Encontrar', 'ofertas escaladas', escaladas, escaladas > 0],
    ['/listas', 'Validar', 'na sua lista', n('minerada', 'validando'), n('validando') > 0],
    ['/prompts', 'Modelar', 'modelando', n('modelando'), n('modelando') > 0],
    ['/escalar', 'Escalar', 'testando ou escalando', n('testando', 'escalando'), n('testando', 'escalando') > 0]];
  return html`<div class="trilha"><h2>Seu caminho</h2>
    ${passos.map(([href, t, sub, v, feito], i) => html`<a href=${href} class=${feito ? 'feito' : ''}><span class="n">${feito ? html`<${Ic} n="check" t=${12} />` : i + 1}</span>
      <span><b>${t}</b><small>${sub}</small></span><span class="v">${v == null ? '…' : fmt(v)}</span></a>`)}</div>`;
}

export function TelaInicio() {
  const l = useLoja();
  const nichos = (l.perfil?.nichos || []).join('|');
  const [versao, setVersao] = useState(0);
  const painel = useDados('/api/painel');
  const doPerfil = useDados(`/api/paginas?ordem=oportunidade&por=8&nichos=${encodeURIComponent(nichos)}`, [nichos, versao]);
  // Se os nichos escolhidos ainda não têm dados neste país, mostra os melhores de todos os nichos (com aviso).
  const semNicho = !doPerfil.carregando && nichos && !doPerfil.dados?.itens?.length;
  const todos = useDados(semNicho ? '/api/paginas?ordem=oportunidade&por=8' : null, [semNicho]);
  const paraVoce = semNicho ? todos : doPerfil;
  const acelerando = useDados('/api/paginas?acelerando=1&por=4&tipo=low', []);
  const listas = useDados('/api/favoritos');
  const d = painel.dados;
  const iniciante = (l.perfil?.nivel || 'iniciante') === 'iniciante';
  if (painel.erro) return html`<${Erro} msg=${painel.erro} />`;
  const meusNichos = l.perfil?.nichos?.length ? l.perfil.nichos.slice(0, 3).join(', ') + (l.perfil.nichos.length > 3 ? ' e outros' : '') : 'todos os nichos';
  return html`
    <div class="cab"><div><h1>Hoje</h1><p>${nomePais(l.pais)}, ${meusNichos}${d?.ultimaBusca ? html`. O robô coletou ${relativo(d.ultimaBusca)}.` : '.'}</p></div>
      <a class="botao" href="/boas-vindas">Mudar nichos e país</a></div>
    <div class="hoje">
      ${paraVoce.carregando || listas.carregando ? html`<div class="hoje-acao"><div class="esq-l" style="width:40%;margin:0"></div><div class="esq-l" style="width:80%;height:22px;margin:0"></div><div class="esq-l" style="width:60%;margin:0"></div></div>`
        : html`<${AcaoDoDia} top=${paraVoce.dados?.itens?.[0]} listas=${listas.dados || []} iniciante=${iniciante} />`}
      <${Trilha} escaladas=${d?.escaladas} listas=${listas.dados || []} />
    </div>
    ${l.perfil?.nichos?.[0] ? html`<div class="secao"><${FocoBusca} nicho=${l.perfil.nichos[0]} forcar=${false} onAtualizar=${() => setVersao((v) => v + 1)} /></div>` : null}
    <section class="secao"><div class="secao-cab"><h2>Melhores para modelar no seu perfil</h2><a href="/ofertas?ordem=oportunidade">Ver todas</a></div>
      ${semNicho && todos.dados?.itens?.length ? html`<p class="mut peq">Seus nichos ainda não têm ofertas coletadas em ${nomePais(l.pais)}, então mostramos as melhores de todos. O robô já incluiu seus nichos na próxima rodada.</p>` : null}
      ${paraVoce.carregando ? html`<${Esqueleto} cards=${4} />` : paraVoce.dados?.itens?.length ? html`<div class="feed">${paraVoce.dados.itens.map((p) => html`<${CartaoOferta} p=${p} />`)}</div>`
        : html`<${Vazio} titulo="Nenhuma oferta pronta para modelar ainda" texto="Aqui entram ofertas low ticket com 8 ou mais anúncios, fora de teste e com página de vendas. Elas aparecem conforme o robô encontra." acao="Ver todas as ofertas" href="/ofertas" />`}</section>
    <section class="secao"><div class="secao-cab"><h2>Novas e acelerando</h2><a href="/ofertas?acelerando=1">Ver todas</a></div>
      ${acelerando.carregando ? html`<${Esqueleto} cards=${4} />` : acelerando.dados?.itens?.length ? html`<div class="feed">${acelerando.dados.itens.map((p) => html`<${CartaoOferta} p=${p} />`)}</div>`
        : html`<${Vazio} titulo="Nenhuma oferta nova acelerando agora" texto="Esta lista se preenche sozinha: o robô reconta os anunciantes todo dia e destaca quem entrou há pouco e está crescendo rápido." acao="Ver ofertas escaladas" href="/ofertas" />`}</section>`;
}
