// Uso e limites dos planos grátis (banco, Storage, tráfego, minutos do Actions, cotas de IA) e saúde do robô.
import { html, useDados, fmt, relativo } from '../base.mjs';
import { Tabela, Esqueleto, Erro } from '../ui.mjs';

const bytes = (b) => (b == null ? '—' : b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GB' : b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB');

export function TelaUso() {
  const r = useDados('/api/uso');
  if (r.erro) return html`<${Erro} msg=${r.erro} />`;
  if (r.carregando) return html`<${Esqueleto} linhas=${8} />`;
  const u = r.dados, c = u.raspador.coletas24h;
  const val = (i) => (i.unidade === 'bytes' ? bytes(i.usado) : i.usado == null ? '—' : fmt(i.usado) + ' ' + i.unidade);
  const lim = (i) => (i.limite == null ? 'sem limite' : i.unidade === 'bytes' ? bytes(i.limite) : fmt(i.limite) + ' ' + i.unidade);
  return html`<div class="cab"><div><h1>Uso e limites</h1><p>Tudo roda nos planos grátis. Você recebe alerta no Telegram a partir de 80%.</p></div></div>
    <div class="grade-3">${u.itens.map((i) => html`<div class="painel-box"><div class="pb-corpo">
      <div class="linha" style="justify-content:space-between"><b>${i.nome}</b>${i.alerta ? html`<span class="tag st-forte">acima de 80%</span>` : null}</div>
      <div class="res" style="margin-top:6px">${val(i)} <span class="mut peq">de ${lim(i)}</span></div>
      ${i.pct != null ? html`<div class="barra-uso"><span style=${`width:${Math.min(100, i.pct)}%${i.alerta ? ';background:var(--cai)' : ''}`}></span></div><small class="mut">${i.pct}%</small>` : null}
      <div class="peq mut">${i.obs || ''}</div></div></div>`)}</div>
    <div class="grade-2 secao">
      <div><div class="secao-cab"><h2>Saúde do robô (24 h)</h2></div><div class="painel-box"><div class="pb-corpo">
        <div class="linha"><span class="tag st-validando">${fmt(c.ok || 0)} ok</span><span class="tag">${fmt(c.vazio || 0)} sem resultado</span><span class="tag st-forte">${fmt(c.erro || 0)} com erro</span></div>
        ${u.raspador.ultimoErro ? html`<p class="peq">Último erro (${relativo(u.raspador.ultimoErro.quando)}, ${u.raspador.ultimoErro.pais || ''} "${u.raspador.ultimoErro.termo || ''}"): <span class="mut">${u.raspador.ultimoErro.erro || ''}</span></p>` : html`<p class="peq mut">Nenhum erro registrado.</p>`}</div></div></div>
      <div><div class="secao-cab"><h2>Últimas rodadas do robô</h2></div><div class="painel-box"><${Tabela} linhas=${u.raspador.execucoes} colunas=${[
        { t: 'Onde', v: (e) => e.origem }, { t: 'Tarefa', v: (e) => e.tipo }, { t: 'Início', v: (e) => relativo(e.inicio) },
        { t: 'Duração', cl: 'dir', v: (e) => (e.fim ? Math.max(1, Math.round((e.fim - e.inicio) / 60)) + ' min' : 'rodando') }, { t: 'Páginas', cl: 'dir', v: (e) => fmt(e.coletas) },
        { t: 'Situação', v: (e) => html`<span class=${'tag ' + (e.status === 'ok' ? 'st-validando' : e.status === 'erro' ? 'st-forte' : '')}>${e.status}</span>` }]} /></div></div></div>
    <div class="grade-2 secao">
      <div><div class="secao-cab"><h2>Maiores tabelas</h2></div><div class="painel-box">${u.tabelas.length ? html`<${Tabela} linhas=${u.tabelas} colunas=${[{ t: 'Tabela', v: (t) => t.tabela }, { t: 'Tamanho', cl: 'dir', v: (t) => bytes(t.bytes) }]} />` : html`<div class="vazio">Disponível com o banco na nuvem.</div>`}</div></div>
      <div><div class="secao-cab"><h2>Cotas de IA (hoje)</h2></div><div class="painel-box"><div class="pb-corpo">${u.ia.length ? u.ia.map((x) => html`<div>${x.chave}: ${fmt(x.hoje)}</div>`) : html`<span class="mut">Sem chave de IA, as funções mostram o prompt pronto para copiar.</span>`}</div></div></div></div>`;
}
