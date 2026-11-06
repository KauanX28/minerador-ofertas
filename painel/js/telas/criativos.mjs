// Biblioteca de criativos coletados: os mais duplicados são os campeões.
import { useState } from 'preact/hooks';
import { html, useDados, useParams, useLoja, nomePais, fmt, exportarCSV, exportarXLSX, diasDesde, bib, post, loja } from '../base.mjs';
import { Folha } from '../ui.mjs';
import { ModalIA } from './iamodal.mjs';
import { FocoBusca } from '../foco.mjs';
import { PadroesVencedores } from './referencias.mjs';

// Busca por significado: a frase vira vetor no próprio navegador (mesmo modelo do robô) e o banco devolve os anúncios mais parecidos.
let extrator = null;
async function vetorDaFrase(frase, aoProgresso) {
  if (!extrator) {
    const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2');
    extrator = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { dtype: 'q8', progress_callback: (p) => p.progress && aoProgresso(Math.round(p.progress)) });
  }
  const r = await extrator('query: ' + frase, { pooling: 'mean', normalize: true });
  return Array.from(r.data);
}

function BuscaSignificado({ onModelar }) {
  const [frase, setFrase] = useState(''), [estado, setEstado] = useState(''), [res, setRes] = useState(null);
  const buscar = async (e) => {
    e.preventDefault(); if (!frase.trim()) return;
    try {
      setEstado(extrator ? 'Buscando…' : 'Preparando a busca (só na primeira vez: baixa o modelo, cerca de 120 MB, e guarda no navegador)…');
      const vetor = await vetorDaFrase(frase.trim(), (n) => setEstado(`Baixando o modelo… ${n}%`));
      setEstado('Buscando…');
      setRes(await post('/api/busca-semantica', { vetor, pais: loja.pais }));
      setEstado('');
    } catch (err) { setEstado('Não foi possível buscar: ' + err.message); }
  };
  return html`<form class="painel-box form-linha" onSubmit=${buscar}>
      <input value=${frase} onInput=${(e) => setFrase(e.target.value)} placeholder="Descreva a ideia: ex.: mãe cansada que quer emagrecer sem academia" aria-label="Frase para buscar por significado" />
      <button class="pri" type="submit">Buscar criativos parecidos</button></form>
    ${estado ? html`<p class="peq" role="status">${estado}</p>` : null}
    ${res ? (res.length ? html`<div class="ads">${res.map((a) => html`<div class="com-sim"><span class="sim">${Math.round(a.similaridade * 100)}% parecido</span><${CartaoAnuncio} a=${a} onModelar=${onModelar} /></div>`)}</div>`
      : html`<${Vazio} titulo="Nada parecido ainda" texto="O robô prepara os criativos para esta busca a cada rodada. Tente outra frase ou volte mais tarde." />`) : null}`;
}
import { Ic, CartaoAnuncio, Esqueleto, Erro, Vazio, ModalModelar } from '../ui.mjs';

const COLS = [['Página', (a) => a.page_name], ['Dias', (a) => diasDesde(a.inicio)], ['Variações', (a) => a.dup], ['Formato', (a) => a.formato], ['CTA', (a) => a.cta],
  ['Título', (a) => a.titulo], ['Texto', (a) => a.texto], ['Destino', (a) => a.link], ['Gateway', (a) => a.gateway], ['Biblioteca', (a) => bib.anuncio(a.ad_id)]];

export function TelaCriativos() {
  const l = useLoja();
  const [f, mudar] = useParams({ modo: '', texto: '', formato: '', dup: '', ordem: 'dup', cta: '', plataforma: '', gateway: '', dias: '', marcas: '' });
  const [modelar, setModelar] = useState(null), [filtros, setFiltros] = useState(false), [versao, setVersao] = useState(0), [aoVivo, setAoVivo] = useState(false);
  const modo = f.modo || 'palavra';
  const { modo: _m, ...busca } = f;
  const qs = new URLSearchParams({ ...busca, limite: 240 }).toString();
  const ativos = ['cta', 'gateway', 'dup', 'dias', 'marcas'].filter((k) => f[k]).length;
  const limpar = () => mudar({ texto: '', formato: '', dup: '', ordem: 'dup', cta: '', gateway: '', dias: '', marcas: '' });
  const textos = { palavra: 'anúncios ativos coletados. Quanto mais variações, mais o anunciante confia no criativo.',
    significado: 'descreva uma ideia e veja criativos com a mesma ideia, mesmo com outras palavras ou em outro idioma.',
    padroes: 'o que os criativos mais duplicados do nicho têm em comum: hooks, formatos e chamadas.' };
  const r = useDados(modo === 'palavra' ? '/api/anuncios?' + qs : null, [qs, modo, versao]);
  const lista = r.dados || [];
  return html`
    <div class="cab"><div><h1>${modo === 'significado' ? 'Busca por significado' : modo === 'padroes' ? 'Padrões vencedores' : 'Criativos'}</h1><p>${nomePais(l.pais)}: ${textos[modo]}</p></div></div>
    ${modo === 'padroes' ? html`<${PadroesVencedores} />` : modo === 'significado' ? html`<${BuscaSignificado} onModelar=${setModelar} />` : html`
    <div class="barra-filtros">
      <label class="campo-inline"><${Ic} n="busca" /><input placeholder="Palavra no texto, título ou página" aria-label="Palavra no texto, título ou página" value=${f.texto} onChange=${(e) => mudar({ texto: e.target.value })} /></label>
      <select value=${f.ordem} onChange=${(e) => mudar({ ordem: e.target.value })} aria-label="Ordenar por"><option value="dup">Mais variações</option><option value="antigos">No ar há mais tempo</option><option value="novos">Mais recentes</option></select>
      <select value=${f.formato} onChange=${(e) => mudar({ formato: e.target.value })} aria-label="Formato"><option value="">Todos os formatos</option><option value="VIDEO">Vídeo</option><option value="IMAGE">Imagem</option><option value="DCO">Dinâmico</option><option value="CAROUSEL">Carrossel</option></select>
      <button class=${ativos ? 'on' : ''} onClick=${() => setFiltros(true)} aria-haspopup="dialog"><${Ic} n="filtro" /> Filtros${ativos ? ` (${ativos})` : ''}</button>
    </div>
    ${filtros ? html`<${Folha} titulo="Filtros de criativos" onFechar=${() => setFiltros(false)} rodape=${html`<button class="fantasma" onClick=${limpar}>Limpar filtros</button><button class="pri" onClick=${() => setFiltros(false)}>Ver criativos</button>`}>
      <div class="form-grade">
        <label class="campo">Botão do anúncio<select value=${f.cta} onChange=${(e) => mudar({ cta: e.target.value })}><option value="">Qualquer</option><option value="Saiba mais">Saiba mais</option><option value="Comprar">Comprar agora</option><option value="WhatsApp">WhatsApp</option><option value="Inscreva">Inscreva-se</option><option value="Baixar">Baixar</option></select></label>
        <label class="campo">Gateway<select value=${f.gateway} onChange=${(e) => mudar({ gateway: e.target.value })}><option value="">Qualquer</option>${(l.config?.gateways || []).map((g) => html`<option value=${g.id}>${g.nome}</option>`)}</select></label>
        <label class="campo">Mínimo de variações<input type="number" min="1" inputmode="numeric" placeholder="ex.: 3" value=${f.dup} onChange=${(e) => mudar({ dup: e.target.value })} /></label>
        <label class="campo">No ar há pelo menos (dias)<input type="number" min="0" inputmode="numeric" placeholder="ex.: 7" value=${f.dias} onChange=${(e) => mudar({ dias: e.target.value })} /></label>
      </div>
      <label class="check-l"><input type="checkbox" checked=${f.marcas === '1'} onChange=${(e) => mudar({ marcas: e.target.checked ? '1' : '' })} /> Mostrar também marcas grandes</label>
    </${Folha}>` : null}
    ${f.texto ? html`<${FocoBusca} termo=${f.texto} onAtualizar=${() => setVersao((v) => v + 1)} onEstado=${setAoVivo} />` : null}
    ${r.erro ? html`<${Erro} msg=${r.erro} />` : r.carregando && !r.dados ? html`<${Esqueleto} cards=${8} />` : html`
      <div class="barra-res"><span class="mut">${fmt(lista.length)} criativos${lista.length >= 240 ? ' (os 240 primeiros)' : ''}${ativos ? html` · <button class="link" onClick=${limpar}>limpar filtros</button>` : null}</span>
        <div class="linha">
          <details class="menu-exp"><summary class="botao"><${Ic} n="baixar" /> Exportar</summary><div class="menu-exp-lista">
            <button onClick=${(e) => { exportarCSV('criativos', lista, COLS); e.target.closest('details').open = false; }}>Planilha CSV</button>
            <button onClick=${(e) => { exportarXLSX('criativos', lista, COLS); e.target.closest('details').open = false; }}>Excel (.xlsx)</button></div></details></div></div>
      ${lista.length ? html`<div class="ads">${lista.map((a) => html`<${CartaoAnuncio} a=${a} onModelar=${setModelar} />`)}</div>`
        : aoVivo ? html`<${Vazio} titulo=${`Buscando "${f.texto}" agora`} texto="Os criativos aparecem aqui em instantes, conforme o robô lê a Biblioteca de Anúncios. Não precisa recarregar." />`
        : html`<${Vazio} titulo=${f.texto ? `Nada encontrado para "${f.texto}"` : 'Nenhum criativo com esses filtros'} texto=${f.texto ? 'O robô procurou na Biblioteca de Anúncios e não achou criativos com esses filtros. Tente outra palavra.' : 'Tire alguns filtros para ver mais criativos.'} acao="Limpar filtros" onAcao=${limpar} />`}`}`}
    ${modelar ? html`<${ModalIA} ad=${modelar} onFechar=${() => setModelar(null)} />` : null}`;
}
