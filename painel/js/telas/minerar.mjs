// Minerar agora: pede ao robô uma busca na Biblioteca (o robô também roda sozinho 4x por dia).
import { useState } from 'preact/hooks';
import { html, useLoja, useDados, rodarTarefa, PAISES, relativo, aviso } from '../base.mjs';
import { Tabela, Chips } from '../ui.mjs';

export function TelaMinerar() {
  const l = useLoja();
  const inicial = new URLSearchParams(location.search).get('palavras') || '';
  const [nicho, setNicho] = useState(''), [palavras, setPalavras] = useState(inicial), [paises, setPaises] = useState([l.pais]), [visivel, setVisivel] = useState(false);
  const hist = useDados('/api/historico-tarefas', [l.tarefa?.rodando]);
  const lista = palavras.split(',').map((s) => s.trim()).filter(Boolean);
  const alternar = (p) => setPalavras((lista.includes(p) ? lista.filter((x) => x !== p) : [...lista, p]).join(', '));
  const ir = () => {
    if (!paises.length) return aviso('Escolha pelo menos um país');
    if (!nicho && !lista.length) return aviso('Escolha um nicho ou escreva palavras-chave');
    rodarTarefa({ tipo: 'minerar', nicho: nicho || 'Avulso', palavras: lista.join(', '), pais: paises.join(','), visivel: !l.config?.nuvem && visivel });
  };
  return html`<div class="cab"><div><h1>Minerar agora</h1><p>O robô já minera sozinho 4 vezes por dia (nichos, gateways e recontagem). Use esta tela para buscar algo específico agora.</p></div></div>
    <div class="grade-2">
      <div class="painel-box"><div class="pb-cab"><h2>Nova busca</h2></div><div class="pb-corpo col-gap">
        <label class="campo">Nicho<select value=${nicho} onChange=${(e) => setNicho(e.target.value)}><option value="">Só as palavras abaixo</option>${Object.keys(l.config?.nichos || {}).map((n) => html`<option>${n}</option>`)}</select></label>
        <label class="campo">Palavras-chave (separadas por vírgula)<textarea value=${palavras} onInput=${(e) => setPalavras(e.target.value)} placeholder="ex.: pilates na parede, desafio 21 dias" style="min-height:70px" /></label>
        <div class="campo">Países<${Chips} opcoes=${PAISES.map(([c, n]) => [c, c])} valor=${paises} onTroca=${setPaises} multi /></div>
        ${!l.config?.nuvem ? html`<label class="check-l"><input type="checkbox" checked=${visivel} onChange=${(e) => setVisivel(e.target.checked)} /> mostrar o navegador (modo local)</label>` : null}
        <button class="pri" onClick=${ir} disabled=${l.tarefa?.rodando}>${l.tarefa?.rodando ? 'Robô ocupado…' : 'Pedir busca ao robô'}</button>
        ${l.config?.nuvem ? html`<p class="peq mut">Na nuvem o pedido entra na fila e o robô começa em 1 a 2 minutos.</p>` : null}</div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Sugestões de palavras-chave</h2><span class="mut peq">clique para adicionar</span></div><div class="pb-corpo" style="max-height:420px;overflow:auto">
        ${(window.PALAVRAS || []).map((g) => html`<div style="margin-bottom:12px"><b class="peq">${g.grupo}</b><div class="peq mut" style="margin:2px 0 6px">${g.dica}</div>
          <div class="chips">${g.itens.map((p) => html`<button type="button" class=${'chip' + (lista.includes(p) ? ' on' : '')} onClick=${() => alternar(p)}>${p}</button>`)}</div></div>`)}</div></div>
    </div>
    <div class="secao"><div class="secao-cab"><h2>Andamento</h2>${l.tarefa?.rodando ? html`<span class="tag st-agora">rodando</span>` : null}</div>
      <pre class="log">${(l.tarefa?.log || []).join('\n') || 'Nenhuma coleta em andamento.'}</pre></div>
    <div class="secao"><div class="secao-cab"><h2>Pedidos recentes</h2></div><div class="painel-box"><${Tabela} linhas=${hist.dados || []} colunas=${[
      { t: 'Pedido', v: (t) => t.descricao || t.tipo }, { t: 'Situação', v: (t) => html`<span class=${'tag ' + (t.status === 'concluida' || t.status === 'concluido' ? 'st-validando' : t.status === 'erro' ? 'st-forte' : '')}>${t.status}</span>` },
      { t: 'Criado', v: (t) => relativo(t.criado) }, { t: 'Erro', v: (t) => html`<span class="mut peq">${t.erro || ''}</span>` }]} vazio="Nenhum pedido ainda." /></div></div>`;
}
