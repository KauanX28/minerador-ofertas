// Prompts de modelagem e o Método.
import { useState, useEffect } from 'preact/hooks';
import { html, copiar } from '../base.mjs';
import { Ic } from '../ui.mjs';

export function TelaPrompts() {
  const [nicho, setNicho] = useState(localStorage.nichoPrompt || '');
  const lista = window.PROMPTS || [];
  const cats = [...new Set(lista.map((p) => p.cat))];
  const [cat, setCat] = useState(cats[0] || '');
  const texto = (p) => p.texto.replaceAll('{{NICHO}}', nicho.trim() || '[SEU PRODUTO]').replace('{{CRIATIVO}}', '[COLE AQUI O TEXTO OU A TRANSCRIÇÃO DO CRIATIVO]');
  return html`<div class="cab"><div><h1>Prompts de modelagem</h1><p>Funcionam nos planos grátis do ChatGPT, Claude e Gemini. Dentro de cada oferta, a aba "Modelar" já preenche os dados da referência.</p></div></div>
    <div class="painel-box form-linha"><label class="campo" style="flex:1">Seu produto ou nicho (preenche todos os prompts)
      <input value=${nicho} onInput=${(e) => { setNicho(e.target.value); localStorage.nichoPrompt = e.target.value; }} placeholder="ex.: pack de atividades bíblicas para crianças" /></label></div>
    <div class="atalhos">${cats.map((c) => html`<button class=${'chip grande' + (c === cat ? ' on' : '')} onClick=${() => setCat(c)}>${c}</button>`)}</div>
    <div class="grade-2">${lista.filter((p) => p.cat === cat).map((p) => html`<div class="painel-box"><div class="pb-cab"><div><b>${p.titulo}</b>${p.fonte ? html`<div class="peq mut">${p.fonte}</div>` : null}</div>
      <button class="bt-p" onClick=${() => copiar(texto(p))}><${Ic} n="copiar" /> Copiar</button></div><div class="pb-corpo"><pre class="prompt">${texto(p)}</pre></div></div>`)}</div>`;
}

export function TelaMetodo() {
  const [md, setMd] = useState('');
  useEffect(() => { fetch('/METODO.md').then((r) => r.text()).then(setMd); }, []);
  const gratis = (window.FERRAMENTAS || []).filter((f) => /sim|grátis|gratis/i.test(f.gratis) && f.url);
  return html`<div class="md" dangerouslySetInnerHTML=${{ __html: md && window.marked ? window.marked.parse(md) : '' }}></div>
    <div class="md"><h2>Ferramentas grátis que continuam úteis</h2><ul>${gratis.map((f) => html`<li><a href=${f.url} target="_blank" rel="noopener">${f.nome}</a>: ${f.uso}</li>`)}</ul></div>`;
}
