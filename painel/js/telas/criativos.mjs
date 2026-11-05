// Biblioteca de criativos coletados: os mais duplicados são os campeões.
import { useState } from 'preact/hooks';
import { html, useDados, useParams, useLoja, nomePais, fmt, rodarTarefa, exportarCSV, exportarXLSX, diasDesde, bib, post, loja } from '../base.mjs';
import { Abas } from '../ui.mjs';
import { ModalIA } from './iamodal.mjs';
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
      <button class="pri" type="submit">Buscar por significado</button></form>
    <p class="mut peq">Acha criativos com a mesma ideia mesmo usando outras palavras ou outro idioma. ${estado ? html`<b>${estado}</b>` : null}</p>
    ${res ? (res.length ? html`<div class="ads">${res.map((a) => html`<div class="com-sim"><span class="sim">${Math.round(a.similaridade * 100)}% parecido</span><${CartaoAnuncio} a=${a} onModelar=${onModelar} /></div>`)}</div>`
      : html`<${Vazio} titulo="Nada parecido ainda" texto="Os vetores dos anúncios são gerados pelo robô a cada rodada." />`) : null}`;
}
import { Ic, CartaoAnuncio, Esqueleto, Erro, Vazio, ModalModelar } from '../ui.mjs';

const COLS = [['Página', (a) => a.page_name], ['Dias', (a) => diasDesde(a.inicio)], ['Variações', (a) => a.dup], ['Formato', (a) => a.formato], ['CTA', (a) => a.cta],
  ['Título', (a) => a.titulo], ['Texto', (a) => a.texto], ['Destino', (a) => a.link], ['Gateway', (a) => a.gateway], ['Biblioteca', (a) => bib.anuncio(a.ad_id)]];

export function TelaCriativos() {
  const l = useLoja();
  const [f, mudar] = useParams({ texto: '', formato: '', dup: '', ordem: 'dup', cta: '', plataforma: '', gateway: '', dias: '', marcas: '' });
  const [modelar, setModelar] = useState(null);
  const [modo, setModo] = useState('palavra');
  const qs = new URLSearchParams({ ...f, limite: 240 }).toString();
  const r = useDados(modo === 'palavra' ? '/api/anuncios?' + qs : null, [qs, modo]);
  const lista = r.dados || [];
  return html`
    <div class="cab"><div><h1>Criativos</h1><p>${nomePais(l.pais)} · anúncios ativos coletados. Quanto mais variações, mais o anunciante confia no criativo.</p></div>
      <div class="linha"><button onClick=${() => exportarCSV('criativos', lista, COLS)}>CSV</button><button onClick=${() => exportarXLSX('criativos', lista, COLS)}><${Ic} n="baixar" /> Excel</button></div></div>
    <${Abas} abas=${[['palavra', 'Por palavra e filtros'], ['significado', 'Por significado'], ['padroes', 'Padrões vencedores']]} ativa=${modo} onTroca=${setModo} />
    ${modo === 'padroes' ? html`<${PadroesVencedores} />` : modo === 'significado' ? html`<${BuscaSignificado} onModelar=${setModelar} />` : html`
    <div class="barra-filtros">
      <label class="campo-inline"><${Ic} n="busca" /><input placeholder="Palavra no texto, título ou página" value=${f.texto} onChange=${(e) => mudar({ texto: e.target.value })} /></label>
      <select value=${f.ordem} onChange=${(e) => mudar({ ordem: e.target.value })} aria-label="Ordenar"><option value="dup">Mais variações</option><option value="antigos">Rodando há mais tempo</option><option value="novos">Mais recentes</option></select>
      <select value=${f.formato} onChange=${(e) => mudar({ formato: e.target.value })} aria-label="Formato"><option value="">Todos os formatos</option><option value="VIDEO">Vídeo</option><option value="IMAGE">Imagem</option><option value="DCO">Dinâmico</option><option value="CAROUSEL">Carrossel</option></select>
      <select value=${f.cta} onChange=${(e) => mudar({ cta: e.target.value })} aria-label="Chamada"><option value="">Qualquer CTA</option><option value="Saiba mais">Saiba mais</option><option value="Comprar">Comprar agora</option><option value="WhatsApp">WhatsApp</option><option value="Inscreva">Inscreva-se</option><option value="Baixar">Baixar</option></select>
      <select value=${f.gateway} onChange=${(e) => mudar({ gateway: e.target.value })} aria-label="Gateway"><option value="">Qualquer gateway</option>${(l.config?.gateways || []).map((g) => html`<option value=${g.id}>${g.nome}</option>`)}</select>
      <input type="number" min="1" placeholder="Mín. variações" value=${f.dup} onChange=${(e) => mudar({ dup: e.target.value })} style="width:130px" aria-label="Mínimo de variações" />
      <label class="check-l"><input type="checkbox" checked=${f.marcas === '1'} onChange=${(e) => mudar({ marcas: e.target.checked ? '1' : '' })} /> mostrar marcas grandes</label>
      <input type="number" min="0" placeholder="No ar há (dias)" value=${f.dias} onChange=${(e) => mudar({ dias: e.target.value })} style="width:130px" aria-label="Dias no ar" />
    </div>
    ${r.erro ? html`<${Erro} msg=${r.erro} />` : r.carregando ? html`<${Esqueleto} cards=${8} />` : html`
      <div class="barra-res"><span class="mut">${fmt(lista.length)} criativos${lista.length >= 240 ? ' (os 240 primeiros)' : ''}</span>
        ${f.texto ? html`<button onClick=${() => rodarTarefa({ tipo: 'minerar', palavras: f.texto, nicho: 'Avulso', pais: l.pais })}><${Ic} n="minerar" /> Buscar "${f.texto}" na Biblioteca agora</button>` : null}</div>
      ${lista.length ? html`<div class="ads">${lista.map((a) => html`<${CartaoAnuncio} a=${a} onModelar=${setModelar} />`)}</div>`
        : html`<${Vazio} titulo="Nenhum criativo com esses filtros" texto=${f.texto ? 'Peça ao robô para buscar esse termo na Biblioteca.' : 'Mude os filtros.'} />`}`}`}
    ${modelar ? html`<${ModalIA} ad=${modelar} onFechar=${() => setModelar(null)} />` : null}`;
}
