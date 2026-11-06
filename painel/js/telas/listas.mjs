// Minhas listas como funil de trabalho: Minerada → Validando → Modelando → Testando → Escalando → Descartada.
import { useState, useEffect } from 'preact/hooks';
import { html, api, post, aviso, ETAPAS, fmt, relativo } from '../base.mjs';
import { Ic, Status, Esqueleto, Erro, Vazio, Modal, Score } from '../ui.mjs';

const tagsDe = (f) => { try { return JSON.parse(f.tags || '[]'); } catch { return []; } };
const linkDe = (f) => (f.tipo === 'pagina' ? '/oferta/' + encodeURIComponent(f.chave) : f.tipo === 'oferta' ? '/site/' + encodeURIComponent(f.chave.split('/')[0]) : 'https://' + f.chave);

export function TelaListas() {
  const [favs, setFavs] = useState(null), [erro, setErro] = useState(null);
  const [pasta, setPasta] = useState(''), [tag, setTag] = useState(''), [editar, setEditar] = useState(null), [arrastando, setArr] = useState(null);
  // Criativos salvos ficam em Referências; aqui só ofertas, sites e checkouts.
  const carregar = () => api('/api/favoritos').then((l) => setFavs(l.filter((f) => f.tipo !== 'criativo'))).catch((e) => setErro(e.message));
  useEffect(() => { carregar(); }, []);
  if (erro) return html`<${Erro} msg=${erro} />`;
  if (!favs) return html`<${Esqueleto} linhas=${8} />`;
  const salvar = async (f, patch) => { setFavs(favs.map((x) => (x === f ? { ...x, ...patch, tags: patch.tags ? JSON.stringify(patch.tags) : x.tags } : x))); await post('/api/favoritos', { tipo: f.tipo, chave: f.chave, ...patch }); };
  const mover = (f, etapa) => { salvar(f, { etapa }); aviso('Movido para ' + ETAPAS.find(([k]) => k === etapa)[1]); };
  const remover = async (f) => { await post('/api/favoritos', { tipo: f.tipo, chave: f.chave, remover: true }); setFavs(favs.filter((x) => x !== f)); };
  const pastas = [...new Set(favs.map((f) => f.pasta).filter(Boolean))], tags = [...new Set(favs.flatMap(tagsDe))];
  const vis = favs.filter((f) => (!pasta || f.pasta === pasta) && (!tag || tagsDe(f).includes(tag)));
  if (!favs.length) return html`<div class="cab"><div><h1>Minhas listas</h1></div></div>
    <${Vazio} titulo="Sua lista está vazia" texto="Toque na estrela de qualquer oferta para salvar. Ela entra na etapa Minerada e você acompanha aqui até escalar." acao="Encontrar ofertas para salvar" href="/ofertas" />`;
  return html`
    <div class="cab"><div><h1>Minhas listas</h1><p>Arraste os cards entre as etapas ou use as setas. O robô reconta os anunciantes salvos todo dia.</p></div>
      <div class="linha">
        <select value=${pasta} onChange=${(e) => setPasta(e.target.value)} aria-label="Pasta"><option value="">Todas as pastas</option>${pastas.map((p) => html`<option>${p}</option>`)}</select>
        <select value=${tag} onChange=${(e) => setTag(e.target.value)} aria-label="Tag"><option value="">Todas as tags</option>${tags.map((t) => html`<option>${t}</option>`)}</select></div></div>
    <div class="kanban">${ETAPAS.map(([k, nome], i) => { const col = vis.filter((f) => (f.etapa || 'minerada') === k);
      return html`<section class=${'kb-col' + (arrastando ? ' alvo' : '')} onDragOver=${(e) => e.preventDefault()} onDrop=${() => { if (arrastando && (arrastando.etapa || 'minerada') !== k) mover(arrastando, k); setArr(null); }}>
        <div class="kb-cab"><b>${nome}</b><span class="mut">${col.length}</span></div>
        ${col.map((f) => html`<article class="kb-card" draggable="true" onDragStart=${() => setArr(f)} onDragEnd=${() => setArr(null)}>
          <a href=${linkDe(f)} target=${f.tipo === 'checkout' ? '_blank' : null} class="kb-tit">${f.nome || f.chave}</a>
          <div class="mut peq">${f.tipo === 'pagina' ? 'anunciante' : f.tipo === 'oferta' ? 'site' : 'checkout'}${f.pasta ? ' · ' + f.pasta : ''}</div>
          ${f.pagina ? html`<div class="kb-met"><${Status} s=${f.pagina.status} /><span class="peq">${fmt(f.pagina.ativos)} anúncios</span>${f.pagina.var7 != null ? html`<span class=${'peq ' + (f.pagina.var7 > 0 ? 'cresce' : f.pagina.var7 < 0 ? 'cai' : 'mut')}>${f.pagina.var7 > 0 ? '+' : ''}${f.pagina.var7} em 7 dias</span>` : null}</div>` : null}
          ${tagsDe(f).length ? html`<div class="kb-tags">${tagsDe(f).map((t) => html`<span class="tag">${t}</span>`)}</div>` : null}
          ${f.nota ? html`<p class="kb-nota">${f.nota}</p>` : null}
          <div class="kb-acoes">
            <button class="bt-ic" disabled=${i === 0} title="Voltar uma etapa" aria-label="Voltar uma etapa" onClick=${() => mover(f, ETAPAS[i - 1][0])}><${Ic} n="esq" /></button>
            <button class="bt-ic" disabled=${i === ETAPAS.length - 1} title="Avançar uma etapa" aria-label="Avançar uma etapa" onClick=${() => mover(f, ETAPAS[i + 1][0])}><${Ic} n="dir" /></button>
            <span style="flex:1" class="mut peq">${relativo(f.atualizado || f.criado)}</span>
            <button class="bt-ic" title="Anotações, tags e pasta" aria-label="Anotações, tags e pasta" onClick=${() => setEditar(f)}><${Ic} n="estudio" /></button>
            <button class="bt-ic" title="Tirar da lista" aria-label="Tirar da lista" onClick=${() => remover(f)}><${Ic} n="fechar" /></button></div>
        </article>`)}</section>`; })}</div>
    ${editar ? html`<${Editar} f=${editar} pastas=${pastas} onFechar=${() => setEditar(null)} onSalvar=${async (patch) => { await salvar(editar, patch); setEditar(null); aviso('Salvo'); }} />` : null}`;
}

function Editar({ f, pastas, onFechar, onSalvar }) {
  const [nota, setNota] = useState(f.nota || ''), [tags, setTags] = useState(tagsDe(f).join(', ')), [pasta, setPasta] = useState(f.pasta || '');
  return html`<${Modal} titulo=${f.nome || f.chave} onFechar=${onFechar}>
    <label class="campo">Anotações<textarea value=${nota} onInput=${(e) => setNota(e.target.value)} placeholder="ex.: modelar com ângulo de economia; testar 3 criativos" /></label>
    <label class="campo">Tags (separadas por vírgula)<input value=${tags} onInput=${(e) => setTags(e.target.value)} placeholder="ex.: quiz, pdf, mães" /></label>
    <label class="campo">Pasta<input value=${pasta} onInput=${(e) => setPasta(e.target.value)} list="pastas" placeholder="ex.: Emagrecimento" /><datalist id="pastas">${pastas.map((p) => html`<option value=${p} />`)}</datalist></label>
    <div class="linha" style="justify-content:flex-end;margin-top:12px"><button class="fantasma" onClick=${onFechar}>Cancelar</button>
      <button class="pri" onClick=${() => onSalvar({ nota, pasta, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })}>Salvar</button></div>
  </${Modal}>`;
}
