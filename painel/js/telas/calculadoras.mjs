// Calculadoras e plano de campanha: confere se a oferta para em pé antes de investir.
import { useState } from 'preact/hooks';
import { html, brl } from '../base.mjs';

const Campo = ({ rot, v, set, passo = '0.01' }) => html`<label class="campo">${rot}<input type="number" step=${passo} value=${v} onInput=${(e) => set(Number(e.target.value) || 0)} /></label>`;
const Caixa = ({ rot, val, sub, cor }) => html`<div class="res-box"><span class="peq mut">${rot}</span><div class="res" style=${cor ? `color:${cor}` : ''}>${val}</div>${sub ? html`<span class="peq mut">${sub}</span>` : null}</div>`;
function useNum(chave, padrao) {
  const [v, set] = useState(Number(localStorage['calc_' + chave] ?? padrao));
  return [v, (n) => { localStorage['calc_' + chave] = n; set(n); }];
}

export function TelaCalculadoras() {
  const [preco, sPreco] = useNum('preco', 19.9), [taxa, sTaxa] = useNum('taxa', 6.99), [fixa, sFixa] = useNum('fixa', 1), [imp, sImp] = useNum('imp', 0);
  const [bump, sBump] = useNum('bump', 9.9), [bumpTx, sBumpTx] = useNum('bumpTx', 30), [up, sUp] = useNum('up', 27), [upTx, sUpTx] = useNum('upTx', 10), [margem, sMargem] = useNum('margem', 30);
  const [tCri, sTCri] = useNum('tCri', 5), [tDias, sTDias] = useNum('tDias', 3), [tMult, sTMult] = useNum('tMult', 1);
  const [inv, sInv] = useNum('inv', 300), [cpa, sCpa] = useNum('cpa', 12);
  const [est, setEst] = useState(Object.keys(window.ESTRUTURAS || {})[0] || '');
  const [, render] = useState(0);
  const liq = (p) => (p > 0 ? p - (p * (taxa + imp)) / 100 - fixa : 0);
  const ticket = liq(preco) + (liq(bump) * bumpTx) / 100 + (liq(up) * upTx) / 100;
  const bruto = preco + (bump * bumpTx) / 100 + (up * upTx) / 100;
  const alvo = ticket * (1 - margem / 100);
  const porCri = preco * Math.max(tMult, 0.5);
  const vendas = inv / Math.max(cpa, 0.01), lucro = vendas * ticket - inv;
  const e = (window.ESTRUTURAS || {})[est];
  const checklist = window.CHECKLIST || [];
  const feitos = checklist.flatMap(([, itens], si) => itens.map((_, ii) => !!localStorage['ck' + si + '-' + ii])).filter(Boolean).length;
  return html`
    <div class="cab"><div><h1>Calculadoras e plano</h1><p>Quanto você pode pagar por venda, quanto investir no teste e como escalar. Os valores ficam salvos neste navegador.</p></div></div>
    <div class="grade-2">
      <div class="painel-box"><div class="pb-cab"><h2>CPA máximo e ROAS de empate</h2></div><div class="pb-corpo">
        <div class="form-grade"><${Campo} rot="Preço do produto" v=${preco} set=${sPreco} /><${Campo} rot="Taxa do gateway (%)" v=${taxa} set=${sTaxa} /><${Campo} rot="Taxa fixa por venda" v=${fixa} set=${sFixa} />
          <${Campo} rot="Impostos (%)" v=${imp} set=${sImp} passo="0.1" /><${Campo} rot="Order bump (preço)" v=${bump} set=${sBump} /><${Campo} rot="Conversão do bump (%)" v=${bumpTx} set=${sBumpTx} passo="1" />
          <${Campo} rot="Upsell (preço)" v=${up} set=${sUp} /><${Campo} rot="Conversão do upsell (%)" v=${upTx} set=${sUpTx} passo="1" /><${Campo} rot="Margem desejada (%)" v=${margem} set=${sMargem} passo="1" /></div>
        <div class="grade-3 secao"><${Caixa} rot="Ticket médio líquido" val=${brl(ticket)} sub=${'bruto ' + brl(bruto)} /><${Caixa} rot="CPA máximo (empate)" val=${brl(ticket)} sub=${'ROAS de empate ' + (bruto / Math.max(ticket, 0.01)).toFixed(2)} />
          <${Caixa} rot=${`CPA alvo (${margem}% de margem)`} val=${brl(alvo)} sub=${'ROAS alvo ' + (bruto / Math.max(alvo, 0.01)).toFixed(2)} cor="var(--ok)" /></div>
        <p class="peq mut">As taxas variam por plataforma, plano e forma de pagamento: confira na sua. De 4 a 6 order bumps e um upsell aumentam o ticket e permitem pagar um CPA maior.</p></div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Plano de campanha</h2><span class="mut peq">teste → pré-escala → escala</span></div><div class="pb-corpo">
        <label class="campo">Estrutura<select value=${est} onChange=${(ev) => setEst(ev.target.value)}>${Object.entries(window.ESTRUTURAS || {}).map(([k, x]) => html`<option value=${k}>${x.nome}</option>`)}</select></label>
        <div class="col-gap secao">${e ? e.fases(preco, tCri).map(([fase, fazer, decidir], i) => html`<div class="res-box"><b>${i + 1}. ${fase}</b><div class="peq" style="margin-top:4px">${fazer}</div><div class="peq mut" style="margin-top:4px">Decisão: ${decidir}</div></div>`) : null}</div></div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Orçamento de teste</h2></div><div class="pb-corpo">
        <div class="form-grade"><${Campo} rot="Criativos" v=${tCri} set=${sTCri} passo="1" /><${Campo} rot="Dias de teste" v=${tDias} set=${sTDias} passo="1" /><${Campo} rot="Tickets por criativo/dia" v=${tMult} set=${sTMult} passo="0.5" /></div>
        <div class="grade-3 secao"><${Caixa} rot="Por criativo / dia" val=${brl(porCri)} /><${Caixa} rot="Por dia (todos)" val=${brl(porCri * tCri)} /><${Caixa} rot="Teste completo" val=${brl(porCri * tCri * tDias)} sub=${`${tCri} criativos × ${tDias} dias`} /></div>
        <p class="peq mut">Cada criativo gasta pelo menos 1 ticket e roda de 2 a 3 dias antes da decisão. Corte o que passar de 1 a 1,5 ticket sem venda.</p></div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Projeção de escala</h2></div><div class="pb-corpo">
        <div class="form-grade"><${Campo} rot="Investimento por dia" v=${inv} set=${sInv} passo="10" /><${Campo} rot="CPA atual" v=${cpa} set=${sCpa} /></div>
        <div class="grade-3 secao"><${Caixa} rot="Vendas por dia" val=${vendas.toFixed(1)} /><${Caixa} rot="Lucro por dia" val=${brl(lucro)} cor=${lucro >= 0 ? 'var(--ok)' : 'var(--erro)'} /><${Caixa} rot="Lucro em 30 dias" val=${brl(lucro * 30)} /></div>
        <p class="peq mut">Usa o ticket médio líquido calculado ao lado.</p></div></div>
    </div>
    <div class="secao"><div class="secao-cab"><h2>Checklist de lançamento</h2><span class="mut peq">${feitos} concluídos</span></div>
      <div class="grade-3">${checklist.map(([sec, itens], si) => html`<div class="painel-box"><div class="pb-cab"><h2>${sec}</h2></div><div class="pb-corpo">
        ${itens.map((it, ii) => html`<label class="check" style="cursor:pointer"><input type="checkbox" checked=${!!localStorage['ck' + si + '-' + ii]}
          onChange=${(ev) => { if (ev.target.checked) localStorage['ck' + si + '-' + ii] = 1; else delete localStorage['ck' + si + '-' + ii]; render((n) => n + 1); }} /> <span>${it}</span></label>`)}</div></div>`)}</div></div>`;
}
