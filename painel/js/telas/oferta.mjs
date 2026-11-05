// Página da oferta (/oferta/:id) com abas: visão geral, criativos, funil, página, checkout, histórico e modelar.
import { useState } from 'preact/hooks';
import { html, useDados, navegar, nomePais, loja, fmt, relativo, bib, copiar, rodarTarefa, TIPOS_OFERTA, diasDesde, dataCurta } from '../base.mjs';
import { Ic, Status, Gws, Preco, Score, Grafico, Ent, Estrela, Kpi, Esqueleto, Erro, Vazio, Abas, CartaoAnuncio, ModalModelar, Tabela, TipoTag } from '../ui.mjs';
import { Validacao } from './validacao.mjs';
import { ModalIA } from './iamodal.mjs';

const ABAS = [['geral', 'Visão geral'], ['criativos', 'Criativos'], ['funil', 'Funil'], ['pagina', 'Página e validação'], ['checkout', 'Checkout'], ['historico', 'Histórico'], ['modelar', 'Modelar']];

export function TelaOferta({ id, aba }) {
  const r = useDados('/api/pagina/' + encodeURIComponent(id), [id]);
  const [modelar, setModelar] = useState(null);
  if (r.erro) return html`<${Erro} msg=${r.erro} />`;
  if (r.carregando) return html`<${Esqueleto} linhas=${10} />`;
  const { pagina: p, anuncios, historico, grupo, analise, checkouts } = r.dados;
  if (!p) return html`<${Vazio} titulo="Anunciante sem dados neste país" texto=${`Este anunciante não tem anúncios coletados em ${nomePais(loja.pais)}. Troque o país no topo ou abra na Biblioteca.`} acao="Voltar às ofertas" href="/ofertas" />`;
  const base = '/oferta/' + encodeURIComponent(id);
  const contagem = { criativos: anuncios.length, checkout: checkouts.length || null };
  return html`
    <div class="cab oferta-cab">
      <div><div class="migalha"><a href="/ofertas">Ofertas</a> / ${p.nome}</div>
        <div class="linha"><${Ent} img=${p.foto || p.thumb} t1=${p.nome} t2=${[p.produto, p.dominios?.[0]].filter(Boolean).join(' · ')} /><${Status} s=${p.status} /><${TipoTag} t=${p.tipo} /></div></div>
      <div class="linha"><${Estrela} tipo="pagina" chave=${p.page_id} nome=${p.nome} on=${p.favorito} />
        <a class="botao" href=${bib.pagina(p.page_id)} target="_blank" rel="noopener"><${Ic} n="externo" /> Biblioteca</a>
        <button class="pri" onClick=${() => navegar(base + '/modelar')}>Modelar esta oferta</button></div>
    </div>
    <div class="kpis">
      <${Kpi} rot="Anúncios ativos" val=${fmt(p.ativos)} sub=${p.dataContagem ? 'contados ' + relativo(Date.parse(p.dataContagem + 'T12:00:00') / 1000) : 'estimado'} />
      <${Kpi} rot="Variação 7 dias" val=${p.var7 == null ? '—' : (p.var7 >= 0 ? '+' : '') + p.var7} sub=${p.var30 != null ? `30 dias: ${p.var30 >= 0 ? '+' : ''}${p.var30}` : 'precisa de mais contagens'} />
      <${Kpi} rot="Rodando há" val=${`${p.dias} dias`} sub="anúncio ativo mais antigo" />
      <${Kpi} rot="Criativo campeão" val=${`${p.dupMax}x`} sub="cópias do mesmo anúncio" />
      <${Kpi} rot="Preço" val=${html`<${Preco} preco=${p.preco} precoBrl=${p.precoBrl} />`} sub=${p.precoOrigem ? 'lido no ' + p.precoOrigem : 'não identificado'} />
      <${Kpi} rot="Nota" val=${p.score} sub=${`boa para modelar: ${p.oportunidade}`} />
    </div>
    <${Abas} abas=${ABAS.map(([k, n]) => [k, n, contagem[k]])} ativa=${aba} onTroca=${(a) => navegar(a === 'geral' ? base : base + '/' + a, { trocar: true })} />
    <div class="aba-corpo">
      ${aba === 'geral' ? html`<${Geral} p=${p} grupo=${grupo} historico=${historico} anuncios=${anuncios} />` : null}
      ${aba === 'criativos' ? html`<${Criativos} anuncios=${anuncios} onModelar=${setModelar} />` : null}
      ${aba === 'funil' ? html`<${Funil} p=${p} analise=${analise} checkouts=${checkouts} />` : null}
      ${aba === 'pagina' ? html`<${Pagina} p=${p} analise=${analise} />` : null}
      ${aba === 'checkout' ? html`<${Checkouts} checkouts=${checkouts} p=${p} />` : null}
      ${aba === 'historico' ? html`<${Historico} historico=${historico} anuncios=${anuncios} />` : null}
      ${aba === 'modelar' ? html`<${Modelar} p=${p} anuncios=${anuncios} analise=${analise} onModelar=${setModelar} />` : null}
    </div>
    ${modelar ? html`<${ModalIA} ad=${{ ...modelar, page_name: modelar.page_name || p.nome }} onFechar=${() => setModelar(null)} />` : null}`;
}

function Geral({ p, grupo, historico, anuncios }) {
  return html`<div class="grade-2">
    <div class="painel-box"><div class="pb-cab"><h2>Por que essa nota</h2><span class="mut peq">nota ${p.score} de 100</span></div>
      <div class="pb-corpo fatores">${p.fatores.map((f) => html`<div class="fator"><div class="fator-cab"><span>${f.nome}</span><b class="num">${f.pontos}<span class="mut">/${f.peso}</span></b></div>
        <i><span style=${`width:${Math.round(100 * f.nota)}%`}></span></i><small class="mut">${f.detalhe}</small></div>`)}
      <p class="peq mut" style="grid-column:1/-1;margin:4px 0 0">Boa para modelar (${p.oportunidade}): ${p.motivoOport}. Quanto menos contas usam a mesma estrutura, mais espaço há para a sua versão.</p></div></div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="painel-box"><div class="pb-cab"><h2>Anúncios ativos por dia</h2></div><div class="pb-corpo"><${Grafico} serie=${historico.map((h) => [h.data, h.ativos])} /></div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Mesma oferta em outras páginas</h2><span class="mut peq">${grupo.length}</span></div><div class="pb-corpo">
        ${grupo.length ? grupo.map((g) => html`<a href=${'/oferta/' + encodeURIComponent(g.page_id)} class="linha-item sem-sub"><${Ent} img=${g.foto} t1=${g.nome} t2=${g.dominio || ''} /><span class="mut peq">${g.ativos != null ? fmt(g.ativos) + ' anúncios' : ''}</span></a>`)
          : html`<span class="mut peq">Nenhuma outra página vendendo o mesmo checkout/site foi encontrada ainda.</span>`}</div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Criativos campeões</h2><a class="peq" href=${'/oferta/' + encodeURIComponent(p.page_id) + '/criativos'}>Ver todos</a></div>
        <div class="pb-corpo mini-ads">${anuncios.filter((a) => a.ativo).slice(0, 4).map((a) => html`<a href=${bib.anuncio(a.ad_id)} target="_blank" rel="noopener" class="mini-ad" title=${(a.texto || '').slice(0, 140)}>
          ${a.thumb ? html`<img src=${a.thumb} alt="" loading="lazy" />` : html`<div class="sem-img">?</div>`}<span>${a.dup || 1}x · ${diasDesde(a.inicio) ?? '—'}d</span></a>`)}</div></div>
    </div></div>`;
}

function Criativos({ anuncios, onModelar }) {
  const [ordem, setOrdem] = useState('dup'), [formato, setFormato] = useState(''), [inativos, setInativos] = useState(false);
  let l = anuncios.filter((a) => (inativos || a.ativo) && (!formato || a.formato === formato));
  l = [...l].sort(ordem === 'dup' ? (a, b) => (b.dup || 1) - (a.dup || 1) : ordem === 'novos' ? (a, b) => (b.inicio || 0) - (a.inicio || 0) : (a, b) => (a.inicio || 0) - (b.inicio || 0));
  return html`<div class="barra-filtros">
      <select value=${ordem} onChange=${(e) => setOrdem(e.target.value)} aria-label="Ordenar"><option value="dup">Mais variações (campeões)</option><option value="antigos">Rodando há mais tempo</option><option value="novos">Mais novos</option></select>
      <select value=${formato} onChange=${(e) => setFormato(e.target.value)} aria-label="Formato"><option value="">Todos os formatos</option><option value="VIDEO">Vídeo</option><option value="IMAGE">Imagem</option><option value="DCO">Dinâmico</option><option value="CAROUSEL">Carrossel</option></select>
      <label class="check-l"><input type="checkbox" checked=${inativos} onChange=${(e) => setInativos(e.target.checked)} /> mostrar inativos</label></div>
    ${l.length ? html`<div class="ads">${l.map((a) => html`<${CartaoAnuncio} a=${a} onModelar=${onModelar} />`)}</div>` : html`<${Vazio} titulo="Nenhum criativo com esses filtros" />`}`;
}

function Funil({ p, analise, checkouts }) {
  const t = analise?.tecnologia || {};
  const bumps = checkouts.flatMap((c) => { try { return JSON.parse(c.bumps || '[]'); } catch { return []; } });
  const etapas = [['Anúncio', `${fmt(p.ativos)} anúncios ativos · ${p.formato === 'VIDEO' ? 'maioria em vídeo' : p.formato === 'IMAGE' ? 'maioria em imagem' : 'formatos variados'}`],
    t.quiz?.length ? ['Quiz', t.quiz.join(', ')] : null, ['Página', analise ? (analise.titulo || analise.dominio) : p.dominios?.[0] || 'direto para o checkout'],
    t.vsl?.length ? ['VSL', t.vsl.join(', ')] : null, ['Checkout', checkouts[0] ? `${checkouts[0].produto || checkouts[0].checkout} · ${checkouts[0].preco || ''}` : (p.gateways || []).join(', ') || 'não identificado'],
    bumps.length ? ['Order bumps', bumps.map((b) => `${b.titulo} (${b.preco})`).join(' · ')] : null,
    ['Upsell / downsell', 'só aparece depois da compra: confira comprando o produto ou nas reclamações']].filter(Boolean);
  return html`<div class="funil">${etapas.map(([n, d], i) => html`<div class="funil-etapa"><span class="num-passo">${i + 1}</span><div><b>${n}</b><div class="mut peq">${d}</div></div></div>${i < etapas.length - 1 ? html`<${Ic} n="seta" />` : null}`)}</div>
    ${!analise ? html`<${SemAnalise} p=${p} />` : html`<div class="grade-2 secao">
      <div class="painel-box"><div class="pb-cab"><h2>Tecnologia</h2></div><div class="pb-corpo"><dl class="lista-def">
        <dt>VSL</dt><dd>${(t.vsl || []).join(', ') || '—'}</dd><dt>Quiz</dt><dd>${(t.quiz || []).join(', ') || '—'}</dd>
        <dt>Rastreamento</dt><dd>${(t.rastreio || []).join(', ') || '—'}</dd><dt>Construtor</dt><dd>${(t.construtor || []).join(', ') || '—'}</dd></dl></div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Gatilhos na página</h2></div><div class="pb-corpo">
        ${[['temGarantia', 'Garantia'], ['temBonus', 'Bônus'], ['temDepoimentos', 'Depoimentos / prova social'], ['temEscassez', 'Escassez / urgência']].map(([k, n]) => html`<div class="check"><span class=${analise[k] ? 'sim' : 'nao'}>${analise[k] ? '✓' : '–'}</span>${n}</div>`)}
        ${analise.cloaker?.suspeito ? html`<div class="aviso-erro" style="margin-top:10px">Possível cloaker: ${analise.cloaker.motivo}</div>` : null}</div></div></div>`}`;
}

const SemAnalise = ({ p }) => html`<div class="painel-box secao"><div class="pb-corpo"><b>O site desta oferta ainda não foi analisado.</b>
  <p class="mut peq">O robô analisa sozinho os sites dos maiores anunciantes. Para pedir agora, clique abaixo (leva alguns minutos).</p>
  ${p.dominios?.[0] ? html`<button class="pri" onClick=${() => rodarTarefa({ tipo: 'analisar', url: p.dominios[0], pais: loja.pais })}>Analisar ${p.dominios[0].split('/')[0]}</button>` : html`<span class="mut">Sem site identificado nos anúncios.</span>`}</div></div>`;

function Pagina({ p, analise }) {
  const dom = analise?.dominio || p.dominios?.[0]?.split('/')[0];
  const validacao = dom ? html`<div class="secao"><${Validacao} dominio=${dom} nome=${p.produto || p.nome} /></div>` : null;
  if (!analise) return html`<${SemAnalise} p=${p} />${validacao}`;
  return html`<div class="grade-2">
    <div class="painel-box"><div class="pb-cab"><h2>${analise.dominio}</h2>${analise.urlFinal ? html`<a class="botao" href=${analise.urlFinal} target="_blank" rel="noopener">Abrir <${Ic} n="externo" /></a>` : null}</div><div class="pb-corpo">
      ${analise.imagem ? html`<img src=${analise.imagem} alt="" class="capa" />` : null}<b>${analise.titulo || ''}</b><div class="mut peq">${analise.descricao || ''}</div>
      ${(analise.manchetes || []).length ? html`<div class="peq secao">${analise.manchetes.map((m) => html`<div>· ${m}</div>`)}</div>` : null}
      ${(analise.precos || []).length ? html`<div class="peq secao"><span class="mut">Preços na página:</span> ${analise.precos.slice(0, 6).join(' · ')}</div>` : null}</div></div>
    <div class="painel-box"><div class="pb-cab"><h2>Estrutura da página</h2></div><div class="pb-corpo"><dl class="lista-def">
      <dt>VSL</dt><dd>${(analise.tecnologia?.vsl || []).join(', ') || '—'}</dd><dt>Quiz</dt><dd>${(analise.tecnologia?.quiz || []).join(', ') || '—'}</dd>
      <dt>Construtor</dt><dd>${(analise.tecnologia?.construtor || []).join(', ') || '—'}</dd><dt>Palavras</dt><dd>${fmt(analise.palavras)}</dd></dl>
      <a class="peq" href=${'/site/' + encodeURIComponent(analise.dominio)}>Ver análise completa do site</a></div></div></div>${validacao}`;
}

function Checkouts({ checkouts, p }) {
  if (!checkouts.length) return html`<${Vazio} titulo="Nenhum checkout identificado ainda" texto="O checkout aparece quando o anúncio leva direto ao gateway ou depois da análise do site." />`;
  return html`<div class="painel-box"><${Tabela} linhas=${checkouts} colunas=${[
    { t: 'Produto', v: (c) => html`<b>${c.produto || '—'}</b><div class="mut peq">${c.checkout}</div>` },
    { t: 'Gateway', v: (c) => html`<span class="tag tg-gw">${loja.config?.gateways?.find((g) => g.id === c.gateway)?.nome || c.gateway}</span>` },
    { t: 'Preço', v: (c) => html`<${Preco} preco=${c.preco} precoBrl=${c.preco_brl} />` },
    { t: 'Situação', v: (c) => (c.ok === 0 ? html`<span class="tag">indisponível</span>` : c.analisado ? html`<span class="tag st-validando">no ar</span>` : '—') },
    { t: 'Lido', v: (c) => html`<span class="mut peq">${relativo(c.analisado)}</span>` },
    { t: '', cl: 'acoes', v: (c) => html`<a class="bt-ic" href=${c.url || 'https://' + c.checkout} target="_blank" rel="noopener" title="Abrir checkout"><${Ic} n="externo" /></a>` },
  ]} /></div>`;
}

// Linha do tempo dos criativos: quando cada um entrou e quando saiu.
function Historico({ historico, anuncios }) {
  const [periodo, setPeriodo] = useState(30);
  const corte = new Date(Date.now() - periodo * 864e5).toISOString().slice(0, 10);
  const serie = historico.filter((h) => h.data >= corte).map((h) => [h.data, h.ativos]);
  const lista = [...anuncios].filter((a) => a.inicio).sort((a, b) => a.inicio - b.inicio).slice(-40);
  const ini = Math.min(...lista.map((a) => a.inicio)), fim = Date.now() / 1000, span = Math.max(fim - ini, 86400);
  return html`<div class="painel-box"><div class="pb-cab"><h2>Anúncios ativos por dia</h2><div class="seg">${[7, 14, 30, 90].map((n) => html`<button class=${periodo === n ? 'ativo' : ''} onClick=${() => setPeriodo(n)}>${n} dias</button>`)}</div></div><div class="pb-corpo"><${Grafico} serie=${serie} h=${180} /></div></div>
    <div class="painel-box secao"><div class="pb-cab"><h2>Linha do tempo dos criativos</h2><span class="mut peq">barra = período no ar · cinza = já saiu</span></div><div class="pb-corpo">
      ${lista.length ? lista.map((a) => { const sai = a.ativo ? fim : (a.inativo_desde || a.visto_ultimo || fim);
        return html`<div class="tl-linha"><span class="tl-rot" title=${a.texto || ''}>${(a.titulo || a.texto || a.ad_id).slice(0, 40)}</span>
          <div class="tl-trilho"><span class=${'tl-barra' + (a.ativo ? '' : ' saiu')} style=${`left:${((a.inicio - ini) / span) * 100}%;width:${Math.max(1, ((sai - a.inicio) / span) * 100)}%`} title=${`${diasDesde(a.inicio)} dias · ${a.dup || 1}x`}></span></div>
          <span class="mut peq num">${a.dup || 1}x</span></div>`; }) : html`<span class="mut">Sem criativos com data.</span>`}
      <div class="tl-eixo mut peq"><span>${new Date(ini * 1000).toLocaleDateString('pt-BR')}</span><span>hoje</span></div></div></div>`;
}

function Modelar({ p, anuncios, analise, onModelar }) {
  const campeao = [...anuncios].filter((a) => a.ativo).sort((a, b) => (b.dup || 1) - (a.dup || 1))[0];
  const ref = [`Oferta de referência: ${p.nome}`, p.produto && `Produto: ${p.produto}`, p.preco && `Preço: ${p.preco}`, p.funil && `Funil: ${p.funil}`,
    analise?.titulo && `Título da página: ${analise.titulo}`, (analise?.manchetes || []).length && `Manchetes da página: ${analise.manchetes.slice(0, 6).join(' | ')}`,
    campeao && `Criativo campeão (${campeao.dup || 1} cópias, ${diasDesde(campeao.inicio)} dias no ar): ${(campeao.titulo ? campeao.titulo + ' — ' : '') + (campeao.texto || '').slice(0, 800)}`].filter(Boolean).join('\n');
  const prompts = [
    ['Estrutura da oferta para o MEU produto', `Analise a oferta abaixo e explique por que ela vende (promessa, público, mecanismo, preço, garantia). Depois, crie uma oferta NOVA para o meu produto [DESCREVA SEU PRODUTO], com outra promessa, outro nome e outro ângulo, mantendo só a lógica que funciona. Não copie frases.\n\n${ref}`],
    ['10 hooks e 3 roteiros de criativo', `Com base no criativo campeão abaixo, identifique o hook, o ângulo e a estrutura (com tempos). Depois escreva 10 hooks novos e 3 roteiros de 30 a 45 segundos para o meu produto [SEU PRODUTO], em português do Brasil, sem repetir as frases da referência.\n\n${ref}`],
    ['Página de vendas modelada', `Liste as seções da página de referência na ordem (dobra, prova, mecanismo, oferta, bônus, garantia, FAQ). Depois escreva uma página NOVA para [SEU PRODUTO] seguindo essa ordem, com texto próprio.\n\n${ref}`],
    ['Quiz de pré-venda', `Crie um quiz de 6 a 8 perguntas que leve ao produto [SEU PRODUTO], no estilo da oferta abaixo, com resultado personalizado e chamada para o checkout.\n\n${ref}`],
    ['Entregável e order bumps', `Sugira o entregável (formato, módulos, bônus) de um produto low ticket para concorrer com a oferta abaixo, mais 4 a 6 order bumps coerentes e um upsell.\n\n${ref}`],
  ];
  return html`<div class="dica">Modelar é criar a sua versão a partir do que funciona: mesma lógica, outra promessa, outro texto, outro criativo. Copie um prompt e cole no ChatGPT, Claude ou Gemini.</div>
    ${campeao ? html`<div class="linha" style="margin-bottom:12px"><button class="pri" onClick=${() => onModelar(campeao)}>Analisar o criativo campeão com IA e criar hooks, roteiros e copies</button></div>` : null}
    <div class="grade-2">${prompts.map(([t, txt]) => html`<div class="painel-box"><div class="pb-cab"><b>${t}</b><button class="bt-p" onClick=${() => copiar(txt)}><${Ic} n="copiar" /> Copiar</button></div>
      <div class="pb-corpo"><pre class="prompt">${txt}</pre></div></div>`)}</div>`;
}
