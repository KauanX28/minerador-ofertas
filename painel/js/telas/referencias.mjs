// Biblioteca de referências (criativos salvos, com pastas e tags) e padrões vencedores por nicho.
import { useState, useLayoutEffect as useEffect } from 'preact/hooks';
import { html, api, post, aviso, useLoja, useDados, copiar, nomePais, fmt } from '../base.mjs';
import { Ic, CartaoAnuncio, Esqueleto, Erro, Vazio, Modal } from '../ui.mjs';
import { ModalIA } from './iamodal.mjs';
import { resolver } from '../ia.mjs';

const tagsDe = (f) => { try { return JSON.parse(f.tags || '[]'); } catch { return []; } };

export function TelaReferencias() {
  const [favs, setFavs] = useState(null), [pasta, setPasta] = useState(''), [tag, setTag] = useState(''), [editar, setEditar] = useState(null), [modelar, setModelar] = useState(null);
  const carregar = () => api('/api/favoritos').then((l) => setFavs(l.filter((f) => f.tipo === 'criativo'))).catch(() => setFavs([]));
  useEffect(() => { carregar(); }, []);
  if (!favs) return html`<${Esqueleto} cards=${6} />`;
  const pastas = [...new Set(favs.map((f) => f.pasta).filter(Boolean))], tags = [...new Set(favs.flatMap(tagsDe))];
  const vis = favs.filter((f) => (!pasta || f.pasta === pasta) && (!tag || tagsDe(f).includes(tag)));
  return html`<div class="cab"><div><h1>Criativos salvos</h1><p>Os criativos que você salvou com a estrela, para estudar e modelar. Organize por pasta e tag.</p></div>
      <div class="linha"><select value=${pasta} onChange=${(e) => setPasta(e.target.value)} aria-label="Pasta"><option value="">Todas as pastas</option>${pastas.map((p) => html`<option>${p}</option>`)}</select>
        <select value=${tag} onChange=${(e) => setTag(e.target.value)} aria-label="Tag"><option value="">Todas as tags</option>${tags.map((t) => html`<option>${t}</option>`)}</select></div></div>
    ${!favs.length ? html`<${Vazio} titulo="Nenhum criativo salvo ainda" texto="Toque na estrela de qualquer criativo, aqui na Biblioteca ou na página de uma oferta, para guardar nesta lista." acao="Abrir a biblioteca de criativos" href="/criativos" />`
      : html`<div class="ads">${vis.map((f) => html`<div class="ref">
          ${f.anuncio ? html`<${CartaoAnuncio} a=${f.anuncio} onModelar=${setModelar} />` : html`<div class="painel-box vazio peq">Este anúncio saiu da base: ficou mais de 60 dias fora do ar.</div>`}
          <div class="ref-rod"><span class="peq">${f.pasta ? html`<b>${f.pasta}</b> · ` : ''}${tagsDe(f).join(', ')}</span>${f.nota ? html`<span class="peq mut">${f.nota}</span>` : null}
            <div class="linha"><button class="bt-p" onClick=${() => setEditar(f)}>Pasta, tags e nota</button>
              <button class="bt-ic" title="Tirar dos salvos" aria-label="Tirar dos salvos" onClick=${async () => { await post('/api/favoritos', { tipo: 'criativo', chave: f.chave, remover: true }); carregar(); }}><${Ic} n="fechar" /></button></div></div></div>`)}</div>`}
    ${editar ? html`<${EditarRef} f=${editar} pastas=${pastas} onFechar=${() => setEditar(null)} onSalvo=${() => { setEditar(null); carregar(); }} />` : null}
    ${modelar ? html`<${ModalIA} ad=${modelar} onFechar=${() => setModelar(null)} />` : null}`;
}

function EditarRef({ f, pastas, onFechar, onSalvo }) {
  const [nota, setNota] = useState(f.nota || ''), [tags, setTags] = useState(tagsDe(f).join(', ')), [pasta, setPasta] = useState(f.pasta || '');
  return html`<${Modal} titulo="Organizar referência" onFechar=${onFechar}>
    <label class="campo">Pasta<input value=${pasta} onInput=${(e) => setPasta(e.target.value)} list="pastasRef" placeholder="ex.: Hooks de dor" /><datalist id="pastasRef">${pastas.map((p) => html`<option value=${p} />`)}</datalist></label>
    <label class="campo">Tags (separadas por vírgula)<input value=${tags} onInput=${(e) => setTags(e.target.value)} placeholder="ex.: ugc, antes e depois" /></label>
    <label class="campo">Nota<textarea value=${nota} onInput=${(e) => setNota(e.target.value)} /></label>
    <div class="linha" style="justify-content:flex-end"><button class="fantasma" onClick=${onFechar}>Cancelar</button>
      <button class="pri" onClick=${async () => { await post('/api/favoritos', { tipo: 'criativo', chave: f.chave, pasta, nota, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }); aviso('Salvo'); onSalvo(); }}>Salvar</button></div>
  </${Modal}>`;
}

// Padrões vencedores do nicho: o que mais duplica (calculado) + resumo da IA uma vez por semana.
export function PadroesVencedores() {
  const l = useLoja();
  const [nicho, setNicho] = useState((l.perfil?.nichos || [])[0] || '');
  const r = useDados('/api/padroes?nicho=' + encodeURIComponent(nicho), [nicho]);
  const [resumo, setResumo] = useState(null), [gerando, setGerando] = useState(false);
  const d = r.dados;
  const res = resumo?.resultado || d?.resumo;
  const resumir = async () => { setGerando(true); try { setResumo(await resolver(await post('/api/padroes/resumo', { nicho }))); } catch (e) { aviso(e.message); } setGerando(false); };
  const barra = (lista) => { const max = Math.max(1, ...lista.map((x) => x[1])); return html`${lista.map(([k, v]) => html`<div class="barra-h"><span>${k}</span><i><b style=${`width:${(100 * v) / max}%`}></b></i><small class="mut">${fmt(v)}</small></div>`)}`; };
  return html`<div class="barra-filtros"><select value=${nicho} onChange=${(e) => setNicho(e.target.value)} aria-label="Nicho"><option value="">Todos os nichos</option>${Object.keys(l.config?.nichos || {}).map((n) => html`<option>${n}</option>`)}</select>
      <span class="mut peq">${d ? fmt(d.total) + ' criativos ativos analisados' : ''}${d?.idadeMediaTop ? `; os 20 mais duplicados estão no ar há ${d.idadeMediaTop} dias em média` : ''}</span></div>
    ${r.erro ? html`<${Erro} msg=${r.erro} />` : r.carregando ? html`<${Esqueleto} />` : !d.total ? html`<${Vazio} titulo="Sem criativos deste nicho ainda" texto="O robô coleta este nicho na próxima rodada. Enquanto isso, veja os padrões de todos os nichos." acao="Ver todos os nichos" onAcao=${() => setNicho('')} />` : html`
    <div class="painel-box"><div class="pb-cab"><h2>Resumo da semana</h2>${!res ? html`<button class="bt-p" onClick=${resumir} disabled=${gerando}>${gerando ? 'Gerando…' : 'Resumir com IA'}</button>` : null}</div><div class="pb-corpo">
      ${res ? html`<p style="margin-top:0">${res.resumo}</p>${res.estruturas_de_hook?.length ? html`<b class="peq">Fórmulas de hook</b><ol class="lista-ia">${res.estruturas_de_hook.map((h) => html`<li>${h} <button class="bt-ic" onClick=${() => copiar(h)}><${Ic} n="copiar" /></button></li>`)}</ol>` : null}
        ${res.o_que_testar?.length ? html`<b class="peq">O que testar</b><ul class="lista-ia">${res.o_que_testar.map((x) => html`<li>${x}</li>`)}</ul>` : null}`
        : resumo?.semIA ? html`<p class="mut peq">Copie o prompt e cole no ChatGPT, Claude ou Gemini para gerar o resumo:</p><button class="bt-p" onClick=${() => copiar(resumo.prompt)}><${Ic} n="copiar" /> Copiar prompt</button>`
        : html`<span class="mut peq">A IA resume os padrões abaixo em fórmulas prontas (uma vez por semana, fica salvo).</span>`}</div></div>
    <div class="grade-2 secao">
      <div class="painel-box"><div class="pb-cab"><h2>Hooks dos criativos mais duplicados</h2></div><div class="pb-corpo">
        <ol class="lista-ia">${d.hooks.map((h) => html`<li><span>${h.hook}</span> <small class="mut">${h.dup}x${h.dias != null ? ` · ${h.dias} dias` : ''}</small></li>`)}</ol></div></div>
      <div class="col-gap">
        <div class="painel-box"><div class="pb-cab"><h2>Formatos (peso pelas cópias)</h2></div><div class="pb-corpo">${barra(d.formatos)}</div></div>
        <div class="painel-box"><div class="pb-cab"><h2>Chamadas (CTA)</h2></div><div class="pb-corpo">${barra(d.ctas)}</div></div>
        <div class="painel-box"><div class="pb-cab"><h2>Palavras que mais aparecem nos hooks</h2></div><div class="pb-corpo"><div class="chips">${d.palavras.map(([w, n]) => html`<span class="chip">${w} <small class="mut">${n}</small></span>`)}</div></div></div>
      </div></div>`}`;
}
