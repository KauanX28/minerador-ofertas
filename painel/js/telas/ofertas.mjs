// Feed de ofertas (cards ou tabela), filtros no servidor, atalhos e comparação lado a lado.
import { useState } from 'preact/hooks';
import { html, loja, definir, useLoja, useDados, useParams, nomePais, fmt, TIPOS_OFERTA, STATUS, exportarCSV, exportarXLSX, bib, brl, nichoPorNome } from '../base.mjs';
import { FocoBusca } from '../foco.mjs';
import { Ocultar } from '../ui.mjs';
import { Ic, CartaoOferta, Tabela, Esqueleto, Vazio, Erro, Status, Gws, Preco, Score, Spark, Ent, Estrela, Paginacao, Abas, comparar, Grafico, Folha, Delta } from '../ui.mjs';

const ATALHOS = [
  ['low', 'Low ticket', { tipo: 'low', plr: '', acelerando: '', gringa: '' }],
  ['info', 'Infoproduto', { tipo: 'low,info_alto', plr: '', acelerando: '', gringa: '' }],
  ['plr', 'PLR', { tipo: '', plr: '1', acelerando: '', gringa: '' }],
  ['acel', 'Novas acelerando', { tipo: 'low', acelerando: '1', plr: '', gringa: '' }],
  ['gringa', 'Gringas sem versão no Brasil', { tipo: 'low,info_alto', gringa: '1', plr: '', acelerando: '' }],
];
const ORDENS = [['score', 'Maior nota'], ['oportunidade', 'Melhor para modelar'], ['crescimento', 'Crescendo mais (7 dias)'], ['ativos', 'Mais anúncios ativos'], ['novos', 'Mais novas'], ['dias', 'Rodando há mais tempo'], ['preco', 'Menor preço']];
const COLS_CSV = [['Anunciante', (p) => p.nome], ['País', () => loja.pais], ['Status', (p) => p.status], ['Anúncios ativos', (p) => p.ativos], ['Var. 7 dias', (p) => p.var7],
  ['Var. 30 dias', (p) => p.var30], ['Dias', (p) => p.dias], ['Variações', (p) => p.dupMax], ['Gateways', (p) => (p.gateways || []).join(', ')], ['Preço', (p) => p.preco],
  ['Preço em R$', (p) => p.precoBrl], ['Produto', (p) => p.produto], ['Funil', (p) => p.funil], ['Site', (p) => p.dominios?.[0]], ['Tipo', (p) => TIPOS_OFERTA[p.tipo]],
  ['Nichos', (p) => (p.nichos || []).join(', ')], ['Score', (p) => p.score], ['Oportunidade', (p) => p.oportunidade], ['Biblioteca', (p) => bib.pagina(p.page_id)]];

export function TelaOfertas() {
  const l = useLoja();
  const padrao = { aba: 'anunciantes', tipo: 'low', preco: String(l.config?.precoMaxFiltro ?? 47), sempreco: '1', idioma: '', nicho: '', status: '', funil: '', formato: '',
    vsl: '', quiz: '', checkout: '', plr: '', acelerando: '', gringa: '', gateway: '', min: '', dias: '', busca: '', ordem: 'score', visao: 'cards', pagina: '1', marcas: '' };
  const [f, mudar] = useParams(padrao);
  const [maisFiltros, setMais] = useState(false);
  const [versao, setVersao] = useState(0); // sobe quando o robô traz dados novos (recarrega a lista)
  const [aoVivo, setAoVivo] = useState(false);
  const qs = new URLSearchParams({ tipo: f.tipo, precoMax: f.preco, semPreco: f.sempreco, idioma: f.idioma, nicho: f.nicho, status: f.status, funil: f.funil, formato: f.formato,
    vsl: f.vsl, quiz: f.quiz, checkout: f.checkout, plr: f.plr, acelerando: f.acelerando, gringa: f.gringa, gateway: f.gateway, min: f.min, dias: f.dias, busca: f.busca,
    ordem: f.ordem, pagina: f.pagina, por: 48, marcas: f.marcas }).toString();
  const r = useDados(f.aba === 'anunciantes' ? '/api/paginas?' + qs : '/api/ofertas-agrupadas?' + qs, [qs, f.aba, versao]);
  const atalho = ATALHOS.find(([, , v]) => Object.entries(v).every(([k, x]) => (f[k] || '') === x))?.[0];
  const ativos = ['idioma', 'nicho', 'status', 'funil', 'formato', 'vsl', 'quiz', 'checkout', 'gateway', 'min', 'dias'].filter((k) => f[k]).length;
  const check = (k, rot) => html`<label class="check-l"><input type="checkbox" checked=${f[k] === '1'} onChange=${(e) => mudar({ [k]: e.target.checked ? '1' : '' })} /> ${rot}</label>`;
  // Durante a troca de aba a resposta anterior (outro formato) ainda está em r.dados: só usa a do formato certo.
  const formatoOk = f.aba === 'anunciantes' ? r.dados && !Array.isArray(r.dados) : Array.isArray(r.dados);
  const itens = !formatoOk ? [] : f.aba === 'anunciantes' ? r.dados.itens : r.dados;

  const limpar = () => mudar(Object.fromEntries(Object.keys(padrao).filter((k) => !['aba', 'visao'].includes(k)).map((k) => [k, padrao[k]])));
  const total = formatoOk && f.aba === 'anunciantes' ? r.dados.total : formatoOk ? itens.length : null;

  return html`
    <div class="cab"><div><h1>Ofertas</h1><p>${nomePais(l.pais)}: quem está anunciando mais, há mais tempo e crescendo.</p></div>
      <${Abas} abas=${[['anunciantes', 'Por anunciante'], ['checkout', 'Por checkout']]} ativa=${f.aba} onTroca=${(aba) => mudar({ aba })} /></div>
    <div class="atalhos rolar-x" role="group" aria-label="Atalhos">${ATALHOS.map(([k, nome, v]) => html`<button class=${'chip grande' + (atalho === k ? ' on' : '')} aria-pressed=${atalho === k} onClick=${() => mudar(v)}>${nome}</button>`)}</div>
    <div class="barra-filtros">
      <label class="campo-inline"><${Ic} n="busca" /><input placeholder="Nicho, nome, produto ou site" aria-label="Buscar por nicho, nome, produto ou site" value=${f.busca} onChange=${(e) => { const t = e.target.value.trim(), n = nichoPorNome(t); mudar(n ? { nicho: n, busca: '' } : { busca: t }); }} /></label>
      <select value=${f.nicho} onChange=${(e) => mudar({ nicho: e.target.value })} aria-label="Nicho" class="sel-nicho"><option value="">Todos os nichos</option>${Object.keys(l.config?.nichos || {}).map((n) => html`<option>${n}</option>`)}</select>
      <select value=${f.preco} onChange=${(e) => mudar({ preco: e.target.value })} aria-label="Preço máximo">${[['27', 'Até R$ 27'], ['47', 'Até R$ 47'], ['97', 'Até R$ 97'], ['197', 'Até R$ 197'], ['0', 'Qualquer preço']].map(([v, t]) => html`<option value=${v}>${t}</option>`)}</select>
      <button class=${ativos ? 'on' : ''} onClick=${() => setMais(true)} aria-haspopup="dialog"><${Ic} n="filtro" /> Filtros${ativos ? ` (${ativos})` : ''}</button>
    </div>
    <div class="barra-res">
      <span class="mut">${total == null ? 'Carregando…' : `${fmt(total)} ${total === 1 ? 'oferta' : 'ofertas'}`}${r.carregando && formatoOk ? ', atualizando…' : ''}${ativos ? html` · <button class="link" onClick=${limpar}>limpar filtros</button>` : null}</span>
      <div class="linha">
        ${f.aba === 'anunciantes' ? html`<select value=${f.ordem} onChange=${(e) => mudar({ ordem: e.target.value })} aria-label="Ordenar por">${ORDENS.map(([v, t]) => html`<option value=${v}>${t}</option>`)}</select>
        <div class="seg" role="group" aria-label="Como mostrar"><button class=${f.visao === 'cards' ? 'ativo' : ''} aria-pressed=${f.visao === 'cards'} onClick=${() => mudar({ visao: 'cards' })} title="Cards" aria-label="Mostrar em cards"><${Ic} n="grade" /></button>
          <button class=${f.visao === 'tabela' ? 'ativo' : ''} aria-pressed=${f.visao === 'tabela'} onClick=${() => mudar({ visao: 'tabela' })} title="Tabela" aria-label="Mostrar em tabela"><${Ic} n="lista" /></button></div>
        <details class="menu-exp"><summary class="botao"><${Ic} n="baixar" /> Exportar</summary><div class="menu-exp-lista">
          <button onClick=${(e) => { exportarCSV('ofertas', itens, COLS_CSV); e.target.closest('details').open = false; }}>Planilha CSV</button>
          <button onClick=${(e) => { exportarXLSX('ofertas', itens, COLS_CSV); e.target.closest('details').open = false; }}>Excel (.xlsx)</button></div></details>` : null}
      </div>
    </div>
    ${maisFiltros ? html`<${Folha} titulo="Filtros" onFechar=${() => setMais(false)} rodape=${html`<button class="fantasma" onClick=${limpar}>Limpar filtros</button><button class="pri" onClick=${() => setMais(false)}>${total == null ? 'Ver ofertas' : `Ver ${fmt(total)} ofertas`}</button>`}>
      <div class="form-grade">
        <label class="campo">Tipo de oferta<select value=${f.tipo} onChange=${(e) => mudar({ tipo: e.target.value })}><option value="">Todos</option><option value="low,info_alto">Infoproduto (qualquer preço)</option>${Object.entries(TIPOS_OFERTA).map(([k, n]) => html`<option value=${k}>${n}</option>`)}</select></label>
        <label class="campo">Status<select value=${f.status} onChange=${(e) => mudar({ status: e.target.value })}><option value="">Todos</option>${Object.keys(STATUS).map((s) => html`<option>${s}</option>`)}</select></label>
        <label class="campo">Funil<select value=${f.funil} onChange=${(e) => mudar({ funil: e.target.value })}><option value="">Qualquer</option><option>Quiz</option><option>VSL</option><option>Página</option><option>Direto p/ checkout</option></select></label>
        <label class="campo">Formato do criativo<select value=${f.formato} onChange=${(e) => mudar({ formato: e.target.value })}><option value="">Qualquer</option><option value="VIDEO">Vídeo</option><option value="IMAGE">Imagem</option><option value="DCO">Dinâmico</option><option value="CAROUSEL">Carrossel</option></select></label>
        <label class="campo">Gateway<select value=${f.gateway} onChange=${(e) => mudar({ gateway: e.target.value })}><option value="">Qualquer</option>${(l.config?.gateways || []).map((g) => html`<option value=${g.id}>${g.nome}</option>`)}</select></label>
        <label class="campo">Idioma dos anúncios<select value=${f.idioma} onChange=${(e) => mudar({ idioma: e.target.value })}>${[['', 'Qualquer'], ['pt', 'Português'], ['es', 'Espanhol'], ['en', 'Inglês'], ['fr', 'Francês'], ['it', 'Italiano'], ['de', 'Alemão']].map(([v, t]) => html`<option value=${v}>${t}</option>`)}</select></label>
        <label class="campo">Mínimo de anúncios ativos<input type="number" min="0" inputmode="numeric" value=${f.min} onChange=${(e) => mudar({ min: e.target.value })} placeholder="ex.: 15" /></label>
        <label class="campo">No ar há pelo menos (dias)<input type="number" min="0" inputmode="numeric" value=${f.dias} onChange=${(e) => mudar({ dias: e.target.value })} placeholder="ex.: 14" /></label>
      </div>
      <fieldset class="grupo"><legend>A oferta tem</legend>${check('vsl', 'VSL')}${check('quiz', 'Quiz')}${check('checkout', 'Checkout conhecido')}</fieldset>
      <fieldset class="grupo"><legend>Mostrar também</legend>
        <label class="check-l"><input type="checkbox" checked=${f.sempreco === '1'} onChange=${(e) => mudar({ sempreco: e.target.checked ? '1' : '0' })} /> Ofertas sem preço lido ainda</label>
        <label class="check-l"><input type="checkbox" checked=${f.marcas === '1'} onChange=${(e) => mudar({ marcas: e.target.checked ? '1' : '' })} /> Marcas grandes (ficam ocultas)</label></fieldset>
    </${Folha}>` : null}
    ${f.busca ? html`<${FocoBusca} termo=${f.busca} onAtualizar=${() => setVersao((v) => v + 1)} onEstado=${setAoVivo} />`
      : f.nicho && f.nicho !== 'Avulso' ? html`<${FocoBusca} nicho=${f.nicho} onAtualizar=${() => setVersao((v) => v + 1)} onEstado=${setAoVivo} />` : null}
    ${f.gringa === '1' && l.pais === 'BR' ? html`<div class="dica">Escolha um país de fora (Estados Unidos, México, Espanha) no seletor do topo: este atalho mostra ofertas de lá que ainda não rodam no Brasil.</div>` : null}
    ${r.erro ? html`<${Erro} msg=${r.erro} />` : !formatoOk ? html`<${Esqueleto} cards=${f.visao === 'cards' && f.aba === 'anunciantes' ? 8 : 0} linhas=${10} />` : f.aba === 'checkout' ? html`<${ListaCheckout} lista=${itens} />` : html`
      ${!itens.length && aoVivo ? html`<${Vazio} titulo=${'Buscando ' + (f.busca ? `"${f.busca}"` : f.nicho) + ' agora'} texto="As ofertas aparecem aqui em instantes, conforme o robô lê a Biblioteca de Anúncios. Não precisa recarregar." />`
      : !itens.length && f.busca ? html`<${Vazio} titulo=${`Nada encontrado para "${f.busca}"`} texto="O robô procurou na Biblioteca de Anúncios e não achou ofertas com esses filtros. Tente outra palavra ou tire o limite de preço e o tipo." acao="Limpar filtros" onAcao=${limpar} />`
      : !itens.length ? html`<${Vazio} titulo="Nenhuma oferta com esses filtros" texto=${f.tipo ? 'Tente "Qualquer preço" ou o atalho Infoproduto. Ofertas ainda sem classificação aparecem em Filtros, Tipo de oferta, Todos.' : 'Mude os filtros ou peça ao robô para minerar novas palavras.'}
        acao="Limpar filtros" onAcao=${limpar} />`
      : f.visao === 'cards' ? html`<div class="feed">${itens.map((p) => html`<${CartaoOferta} p=${p} selecionado=${l.comparar.includes(p.page_id)} onSelecionar=${comparar.alternar} />`)}</div>`
      : html`<div class="painel-box rolar"><${TabelaOfertas} itens=${itens} /></div>`}
      <${Paginacao} pagina=${r.dados.pagina} por=${r.dados.por} total=${r.dados.total} onIr=${(pagina) => mudar({ pagina })} />`}`;
}

function TabelaOfertas({ itens }) {
  const l = useLoja();
  return html`<${Tabela} linhas=${itens} colunas=${[
    { t: '', v: (p) => html`<input type="checkbox" aria-label=${'Comparar ' + p.nome} checked=${l.comparar.includes(p.page_id)} onChange=${() => comparar.alternar(p.page_id)} />` },
    { t: 'Anunciante', k: 'nome', v: (p) => html`<a href=${'/oferta/' + encodeURIComponent(p.page_id)} class="sem-sub"><${Ent} img=${p.foto || p.thumb} t1=${p.nome} t2=${p.produto || p.dominios?.[0] || p.titulo} /></a>` },
    { t: 'Status', k: 'status', v: (p) => html`<${Status} s=${p.status} />` },
    { t: 'Anúncios', k: 'ativos', cl: 'dir', v: (p) => html`<b class="num">${fmt(p.ativos)}</b>` },
    { t: '30 dias', v: (p) => (p.serie?.length > 1 ? html`<${Spark} serie=${p.serie} w=${76} h=${24} />` : html`<span class="mut peq">—</span>`) },
    { t: '7 dias', k: 'var7', cl: 'dir', v: (p) => (p.var7 == null ? html`<span class="mut">—</span>` : html`<span class=${p.var7 > 0 ? 'cresce' : p.var7 < 0 ? 'cai' : ''}>${p.var7 > 0 ? '+' : ''}${p.var7}</span>`) },
    { t: 'Dias', k: 'dias', cl: 'dir', v: (p) => p.dias },
    { t: 'Variações', k: 'dupMax', cl: 'dir', v: (p) => `${p.dupMax}x` },
    { t: 'Gateway', v: (p) => html`<${Gws} lista=${p.gateways} />` },
    { t: 'Preço', k: 'precoBrl', v: (p) => html`<${Preco} preco=${p.preco} precoBrl=${p.precoBrl} origem=${p.precoOrigem} />` },
    { t: 'Funil', v: (p) => p.funil || '—' },
    { t: 'Nota', k: 'score', v: (p) => html`<${Score} n=${p.score} fatores=${p.fatores} />` },
    { t: 'Para modelar', k: 'oportunidade', cl: 'dir', v: (p) => html`<span title=${p.motivoOport}>${p.oportunidade}</span>` },
    { t: '', cl: 'acoes', v: (p) => html`<${Ocultar} pageId=${p.page_id} nome=${p.nome} /><${Estrela} tipo="pagina" chave=${p.page_id} nome=${p.nome} on=${p.favorito} />` },
  ]} />`;
}

function ListaCheckout({ lista }) {
  const hoje = Date.now() / 1000;
  const itens = lista.map((o) => ({ ...o, dias: o.inicio ? Math.floor((hoje - o.inicio) / 86400) : 0 }));
  if (!itens.length) return html`<${Vazio} titulo="Nenhuma oferta agrupada ainda" texto="Ofertas aparecem aqui quando o robô identifica o checkout ou o site de cada anunciante." />`;
  return html`<p class="mut peq">Várias páginas vendendo no mesmo checkout contam como uma oferta só: é um sinal forte de escala (o produtor abriu várias contas).</p>
    <div class="painel-box"><${Tabela} linhas=${itens} ordemInicial=${{ k: 'ativos_paginas', asc: false }} colunas=${[
    { t: 'Oferta', k: 'produto', v: (o) => html`<a href=${o.membros[0] ? '/oferta/' + encodeURIComponent(o.membros[0].page_id) : '#'} class="sem-sub"><${Ent} img=${o.thumb} t1=${o.produto || o.dominios[0] || o.chave.slice(4)} t2=${o.tipo_chave === 'ck' ? 'mesmo checkout' : o.tipo_chave === 'dom' ? 'mesmo site' : 'página única'} /></a>` },
    { t: 'Anúncios ativos', k: 'ativos_paginas', cl: 'dir', v: (o) => html`<b class="num">${fmt(o.ativos_paginas)}</b>` },
    { t: 'Páginas', k: 'paginas', cl: 'dir', v: (o) => html`<span title=${o.membros.map((m) => m.nome).join(', ')}>${o.membros.length || o.paginas}</span>` },
    { t: 'Dias', k: 'dias', cl: 'dir', v: (o) => o.dias },
    { t: 'Gateway', v: (o) => (o.gateway ? html`<span class="tag tg-gw">${loja.config?.gateways?.find((g) => g.id === o.gateway)?.nome || o.gateway}</span>` : '—') },
    { t: 'Preço', k: 'preco_brl', v: (o) => html`<${Preco} preco=${o.preco} precoBrl=${o.preco_brl} />` },
    { t: 'Tipo', v: (o) => TIPOS_OFERTA[o.tipo] || '—' },
  ]} /></div>`;
}

// Comparação de 2 ou 3 ofertas lado a lado.
export function TelaComparar() {
  const ids = new URLSearchParams(location.search).get('ids') || '';
  const r = useDados('/api/paginas?ids=' + encodeURIComponent(ids) + '&por=3', [ids]);
  if (r.erro) return html`<${Erro} msg=${r.erro} />`;
  if (r.carregando) return html`<${Esqueleto} linhas=${8} />`;
  const ps = r.dados.itens;
  if (ps.length < 2) return html`<${Vazio} titulo="Selecione 2 ou 3 ofertas" texto="Marque a caixinha de comparar nos cards das ofertas." acao="Ir para ofertas" href="/ofertas" />`;
  const linhas = [['Status', (p) => html`<${Status} s=${p.status} />`], ['Nota', (p) => html`<${Score} n=${p.score} fatores=${p.fatores} />`], ['Boa para modelar', (p) => `${p.oportunidade} · ${p.motivoOport}`],
    ['Anúncios ativos', (p) => fmt(p.ativos)], ['Variação 7 / 30 dias', (p) => `${p.var7 ?? '—'} / ${p.var30 ?? '—'}`], ['Últimos 30 dias', (p) => html`<${Spark} serie=${p.serie} w=${140} h=${34} />`],
    ['Dias rodando', (p) => p.dias], ['Criativo campeão', (p) => `${p.dupMax}x`], ['Criativos novos (7 dias)', (p) => p.novos7], ['Contas no mesmo checkout', (p) => p.contasCheckout],
    ['Preço', (p) => html`<${Preco} preco=${p.preco} precoBrl=${p.precoBrl} />`], ['Gateway', (p) => html`<${Gws} lista=${p.gateways} />`], ['Funil', (p) => p.funil || '—'],
    ['Tipo', (p) => TIPOS_OFERTA[p.tipo]], ['Site', (p) => p.dominios?.[0] || '—']];
  return html`<div class="cab"><div><div class="migalha"><a href="/ofertas">Ofertas</a><span>/</span>Comparar</div><h1>Comparar ofertas</h1></div><button onClick=${() => definir({ comparar: [] })}>Limpar a seleção</button></div>
    <div class="painel-box rolar"><table class="tabela comparar"><thead><tr><th></th>${ps.map((p) => html`<th><a href=${'/oferta/' + p.page_id} class="sem-sub"><${Ent} img=${p.foto || p.thumb} t1=${p.nome} t2=${p.produto || ''} /></a></th>`)}</tr></thead>
      <tbody>${linhas.map(([t, v]) => html`<tr><th scope="row">${t}</th>${ps.map((p) => html`<td>${v(p)}</td>`)}</tr>`)}</tbody></table></div>`;
}

export { Grafico, brl };
