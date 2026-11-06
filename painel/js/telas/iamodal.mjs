// Janela "Modelar com IA" de um criativo: análise (hook, ângulo, promessa, estrutura) e geração de material novo.
import { useState, useLayoutEffect as useEffect } from 'preact/hooks';
import { html, api, post, copiar, navegar } from '../base.mjs';
import { Ic, Modal } from '../ui.mjs';
import { resolver, temWebGPU, chaves } from '../ia.mjs';

const TIPOS = [['hooks', '10 hooks'], ['roteiros', '3 roteiros'], ['copies', '5 copies'], ['ugc', 'Brief de UGC'], ['storyboard', 'Storyboard']];

function SemIA({ resp, onTentarLocal, titulo }) {
  return html`<div class="painel-box"><div class="pb-cab"><b>${titulo || 'Prompt pronto para copiar'}</b><button class="bt-p" onClick=${() => copiar(resp.prompt)}><${Ic} n="copiar" /> Copiar</button></div>
    <div class="pb-corpo"><p class="mut peq" style="margin-top:0">Sem IA configurada no servidor${resp.erros?.length ? ` (${resp.erros.join('; ')})` : ''}. Cole no ChatGPT, Claude ou Gemini.
      Ou salve sua chave grátis em Configurações → IA.${temWebGPU() ? ' Seu navegador também consegue rodar um modelo pequeno, sem internet depois do download.' : ''}</p>
      ${temWebGPU() ? html`<button onClick=${onTentarLocal}>Gerar no navegador (baixa cerca de 1 GB na primeira vez)</button>` : null}
      <pre class="prompt">${resp.prompt}</pre></div></div>`;
}

const Lista = ({ itens }) => html`<ol class="lista-ia">${(itens || []).map((t) => html`<li><span>${typeof t === 'string' ? t : JSON.stringify(t)}</span><button class="bt-ic" title="Copiar" onClick=${() => copiar(typeof t === 'string' ? t : JSON.stringify(t))}><${Ic} n="copiar" /></button></li>`)}</ol>`;

function Resultado({ tipo, r }) {
  if (!r) return null;
  if (tipo === 'hooks') return html`<${Lista} itens=${r.hooks} />`;
  if (tipo === 'copies') return html`${(r.copies || []).map((c) => html`<div class="res-box" style="margin-bottom:8px"><div class="linha" style="justify-content:space-between"><b>${c.titulo}</b><button class="bt-ic" onClick=${() => copiar(`${c.titulo}\n\n${c.texto}`)}><${Ic} n="copiar" /></button></div><p class="peq" style="white-space:pre-wrap">${c.texto}</p></div>`)}`;
  if (tipo === 'roteiros') return html`${(r.roteiros || []).map((ro) => html`<div class="res-box" style="margin-bottom:8px"><b>${ro.titulo}</b>
    <table class="tabela peq"><tbody>${(ro.cenas || []).map((c) => html`<tr><td class="mut">${c.tempo}</td><td>${c.fala}</td><td class="mut">${c.visual}</td></tr>`)}</tbody></table></div>`)}`;
  if (tipo === 'storyboard') return html`<div class="story">${(r.quadros || []).map((q) => html`<div class="res-box"><b>${q.n}. ${q.tempo}</b><div class="peq">${q.imagem}</div>${q.texto_tela ? html`<div class="peq"><span class="mut">Na tela:</span> ${q.texto_tela}</div>` : null}${q.fala ? html`<div class="peq"><span class="mut">Fala:</span> ${q.fala}</div>` : null}</div>`)}</div>`;
  if (tipo === 'ugc') return html`<dl class="lista-def">${Object.entries(r).map(([k, v]) => html`<dt>${k}</dt><dd>${Array.isArray(v) ? v.join(' · ') : v}</dd>`)}</dl>`;
  return html`<pre class="prompt">${JSON.stringify(r, null, 2)}</pre>`;
}

export function ModalIA({ ad, onFechar }) {
  const [an, setAn] = useState(null), [carregando, setCarregando] = useState(true), [progresso, setProgresso] = useState('');
  const [produto, setProduto] = useState(localStorage.nichoPrompt || ''), [tipo, setTipo] = useState('hooks'), [gerado, setGerado] = useState({}), [gerando, setGerando] = useState(false);
  const analisar = async (usarLocal = false) => {
    setCarregando(true);
    try { setAn(await resolver(await post('/api/ia/criativo', { ad_id: ad.ad_id }), { usarLocal, aoProgresso: setProgresso })); } catch (e) { setAn({ erro: e.message }); }
    setCarregando(false); setProgresso('');
  };
  useEffect(() => {
    api('/api/ia/criativo?ad_id=' + encodeURIComponent(ad.ad_id)).then((r) => { if (r.resultado) { setAn(r); setCarregando(false); } else analisar(); }).catch(() => analisar());
  }, [ad.ad_id]);
  const gerar = async (t = tipo, usarLocal = false) => {
    setTipo(t); setGerando(true); localStorage.nichoPrompt = produto;
    try { const r = await resolver(await post('/api/ia/gerar', { tipo: t, ad_id: ad.ad_id, produto, analise: an?.resultado }), { usarLocal, aoProgresso: setProgresso }); setGerado({ ...gerado, [t]: r }); }
    catch (e) { setGerado({ ...gerado, [t]: { erro: e.message } }); }
    setGerando(false); setProgresso('');
  };
  const a = an?.resultado;
  const g = gerado[tipo];
  return html`<${Modal} titulo="Modelar com IA" onFechar=${onFechar} largo>
    <div class="ia-ref"><b>${ad.page_name || ''}</b><span class="mut peq">${(ad.titulo || ad.texto || '').slice(0, 140)}</span></div>
    ${progresso ? html`<div class="dica">${progresso}</div>` : null}
    ${carregando ? html`<div class="painel-box"><div class="pb-corpo">Analisando o criativo…</div></div>`
      : an?.erro ? html`<div class="aviso-erro">${an.erro}</div>`
      : an?.semIA ? html`<${SemIA} resp=${an} onTentarLocal=${() => analisar(true)} titulo="Análise do criativo: prompt" />`
      : a ? html`<div class="painel-box"><div class="pb-cab"><h2>Por que esse criativo funciona</h2><span class="mut peq">${an.doCache ? 'já analisado' : 'analisado agora'} · ${an.provedor}${an.transcricao ? ' · com transcrição do vídeo' : ''}</span></div>
        <div class="pb-corpo"><div class="grade-ia">
          ${[['Hook', a.hook], ['Ângulo', a.angulo], ['Promessa', a.promessa], ['Público', a.publico], ['Dor / desejo', a.dor], ['Mecanismo', a.mecanismo], ['CTA', a.cta], ['Formato', a.formato]]
            .filter(([, v]) => v).map(([k, v]) => html`<div><span class="mut peq">${k}</span><div>${v}</div></div>`)}</div>
          ${a.estrutura?.length ? html`<div class="secao"><span class="mut peq">Estrutura</span><table class="tabela peq"><tbody>${a.estrutura.map((e) => html`<tr><td class="mut">${e.tempo}</td><td><b>${e.parte}</b></td><td>${e.descricao}</td></tr>`)}</tbody></table></div>` : null}
          ${a.objecoes?.length ? html`<p class="peq"><span class="mut">Objeções que quebra:</span> ${a.objecoes.join(' · ')}</p>` : null}
          ${a.por_que_funciona ? html`<p class="peq"><span class="mut">Por que funciona:</span> ${a.por_que_funciona}</p>` : null}
          ${a.como_modelar?.length ? html`<p class="peq"><span class="mut">Como modelar:</span></p><${Lista} itens=${a.como_modelar} />` : null}</div></div>
      <div class="painel-box secao"><div class="pb-cab"><h2>Criar o meu material</h2></div><div class="pb-corpo">
        <label class="campo">Seu produto (a IA cria material novo para ele, sem copiar a referência)<input value=${produto} onInput=${(e) => setProduto(e.target.value)} placeholder="ex.: desafio de 21 dias de pilates para mães" /></label>
        <div class="atalhos" style="margin-top:10px">${TIPOS.map(([k, n]) => html`<button class=${'chip grande' + (k === tipo ? ' on' : '')} onClick=${() => gerar(k)} disabled=${gerando}>${n}</button>`)}</div>
        ${gerando ? html`<p class="mut">Gerando…</p>` : g?.semIA ? html`<${SemIA} resp=${g} onTentarLocal=${() => gerar(tipo, true)} />` : g?.erro ? html`<div class="aviso-erro">${g.erro}</div>` : g?.resultado ? html`<${Resultado} tipo=${tipo} r=${g.resultado} />` : html`<p class="mut peq">Escolha o que gerar acima.</p>`}
      </div></div>` : null}
  </${Modal}>`;
}

export { chaves };
