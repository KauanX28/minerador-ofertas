// Escalar com dados reais: desempenho dos anúncios (Meta Marketing API do próprio dono), check-up da conta,
// vendas reais dos gateways (webhook) e diário de testes.
import { useState, useLayoutEffect as useEffect } from 'preact/hooks';
import { html, api, post, useDados, aviso, copiar, brl, fmt, relativo } from '../base.mjs';
import { Ic, Abas, Tabela, Esqueleto, Erro, Vazio, Kpi, Modal } from '../ui.mjs';

// Números do plano (os mesmos das Calculadoras, salvos neste navegador).
function plano() {
  const n = (k, p) => Number(localStorage['calc_' + k] ?? p);
  const taxa = n('taxa', 6.99), imp = n('imp', 0), fixa = n('fixa', 1), liq = (p) => (p > 0 ? p - (p * (taxa + imp)) / 100 - fixa : 0);
  const ticket = liq(n('preco', 19.9)) + (liq(n('bump', 9.9)) * n('bumpTx', 30)) / 100 + (liq(n('up', 27)) * n('upTx', 10)) / 100;
  return { ticket, cpaMax: ticket, cpaAlvo: ticket * (1 - n('margem', 30) / 100), preco: n('preco', 19.9) };
}
const COR_ACAO = { Escalar: 'st-validando', Cortar: 'st-forte', 'Trocar criativo': 'st-escalada', Manter: 'st-agora', 'Aguardar dados': '' };

export function TelaEscalar() {
  const [aba, setAba] = useState('desempenho');
  return html`<div class="cab"><div><h1>Escalar com dados reais</h1><p>O que está dando lucro, o que cortar e o que escalar, com os números da sua conta e das suas vendas.</p></div></div>
    <${Abas} abas=${[['desempenho', 'Desempenho dos anúncios'], ['conta', 'Check-up da conta'], ['vendas', 'Vendas reais'], ['diario', 'Diário de testes']]} ativa=${aba} onTroca=${setAba} />
    ${aba === 'desempenho' ? html`<${Desempenho} />` : aba === 'conta' ? html`<${Conta} />` : aba === 'vendas' ? html`<${Vendas} />` : html`<${Diario} />`}`;
}

const ComoConfigurar = () => html`<div class="painel-box"><div class="pb-corpo">
  <b>Conecte sua conta de anúncios (grátis, uma vez)</b>
  <ol class="lista-ia peq">
    <li>Em <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener">developers.facebook.com</a>, crie um app do tipo "Empresa" (pode ficar em modo de desenvolvimento: só você usa).</li>
    <li>Adicione o produto "API de Marketing" e gere um token com a permissão <code>ads_read</code> (de preferência de um usuário do sistema, que não expira).</li>
    <li>Na Vercel, crie as variáveis <code>META_ACCESS_TOKEN</code> (o token) e <code>META_AD_ACCOUNT_ID</code> (o número da conta, ex.: 123456789).</li>
  </ol><p class="mut peq">A ferramenta só lê dados: nunca altera campanhas. O token fica no servidor, não no navegador.</p></div></div>`;

function Desempenho() {
  const [dias, setDias] = useState('7');
  const p = plano();
  const r = useDados(`/api/meta/desempenho?dias=${dias}&ticket=${p.preco}&cpaAlvo=${p.cpaAlvo.toFixed(2)}&cpaMax=${p.cpaMax.toFixed(2)}`, [dias]);
  if (r.erro) return html`<${Erro} msg=${r.erro} />`;
  if (r.carregando) return html`<${Esqueleto} linhas=${8} />`;
  if (r.dados?.semConfig) return html`<${ComoConfigurar} />`;
  const ads = r.dados || [];
  const tot = ads.reduce((s, a) => ({ g: s.g + a.gasto, c: s.c + a.compras, r: s.r + a.receita }), { g: 0, c: 0, r: 0 });
  const fadiga = ads.filter((a) => a.fadiga);
  return html`<div class="barra-filtros"><select value=${dias} onChange=${(e) => setDias(e.target.value)} aria-label="Período"><option value="7">Últimos 7 dias</option><option value="14">14 dias</option><option value="30">30 dias</option></select>
      <span class="mut peq">CPA alvo ${brl(p.cpaAlvo)} · máximo ${brl(p.cpaMax)} (das Calculadoras)</span></div>
    <div class="kpis"><${Kpi} rot="Gasto" val=${brl(tot.g)} /><${Kpi} rot="Vendas" val=${fmt(tot.c)} /><${Kpi} rot="CPA" val=${tot.c ? brl(tot.g / tot.c) : '—'} />
      <${Kpi} rot="ROAS" val=${tot.g ? (tot.r / tot.g).toFixed(2) : '—'} /><${Kpi} rot="Criativos com fadiga" val=${fadiga.length} sub="frequência alta e CTR caindo" /></div>
    ${fadiga.length ? html`<div class="aviso-erro">Fadiga: ${fadiga.map((a) => a.nome).join(', ')}. Troque ou varie esses criativos.</div>` : null}
    ${ads.length ? html`<div class="painel-box secao"><${Tabela} linhas=${ads} ordemInicial=${{ k: 'gasto', asc: false }} colunas=${[
      { t: 'Anúncio', k: 'nome', v: (a) => html`<b>${a.nome}</b><div class="mut peq">${a.campanha} · ${a.conjunto}</div>` },
      { t: 'Ação sugerida', k: 'acao', v: (a) => html`<span class=${'tag ' + (COR_ACAO[a.acao] || '')} title=${a.motivo}>${a.acao}</span><div class="mut peq">${a.motivo}</div>` },
      { t: 'Gasto', k: 'gasto', cl: 'dir', v: (a) => brl(a.gasto) }, { t: 'Vendas', k: 'compras', cl: 'dir', v: (a) => a.compras },
      { t: 'CPA', k: 'cpa', cl: 'dir', v: (a) => (a.cpa == null ? '—' : html`<span class=${a.cpa <= p.cpaAlvo ? 'cresce' : a.cpa > p.cpaMax ? 'cai' : ''}>${brl(a.cpa)}</span>`) },
      { t: 'ROAS', k: 'roas', cl: 'dir', v: (a) => (a.roas == null ? '—' : a.roas.toFixed(2)) },
      { t: 'CTR', k: 'ctr', cl: 'dir', v: (a) => html`${a.ctr.toFixed(2)}% <small class=${a.ctrTendencia >= 0 ? 'cresce' : 'cai'}>${a.ctrTendencia >= 0 ? '▲' : '▼'}</small>` },
      { t: 'Frequência', k: 'frequencia', cl: 'dir', v: (a) => a.frequencia.toFixed(1) },
    ]} /></div>` : html`<${Vazio} titulo="Sem anúncios com gasto no período" />`}`;
}

function Conta() {
  const r = useDados('/api/meta/conta');
  if (r.erro) return html`<${Erro} msg=${r.erro} />`;
  if (r.carregando) return html`<${Esqueleto} />`;
  if (r.dados?.semConfig) return html`<${ComoConfigurar} />`;
  const c = r.dados;
  return html`<div class="kpis"><${Kpi} rot="Conta" val=${c.nome} sub=${c.fuso} /><${Kpi} rot="Situação" val=${html`<span class=${c.ativa ? 'cresce' : 'cai'}>${c.status}</span>`} sub=${c.motivo ? 'motivo ' + c.motivo : ''} />
      <${Kpi} rot="Limite de gasto" val=${c.limiteGasto ? brl(c.limiteGasto) : 'sem limite'} sub=${c.limiteGasto ? `usado ${brl(c.gasto)}` : ''} /><${Kpi} rot="Anúncios com problema" val=${c.reprovados.length} /></div>
    ${c.reprovados.length ? html`<div class="painel-box"><${Tabela} linhas=${c.reprovados} colunas=${[{ t: 'Anúncio', v: (a) => html`<b>${a.nome}</b><div class="mut peq">${a.conjunto || ''}</div>` },
      { t: 'Situação', v: (a) => html`<span class="tag st-forte">${a.status === 'DISAPPROVED' ? 'reprovado' : 'com problema'}</span>` }, { t: 'Motivo', v: (a) => html`<span class="peq">${a.motivo || '—'}</span>` }]} /></div>`
      : html`<div class="painel-box vazio">Nenhum anúncio reprovado. </div>`}`;
}

function Vendas() {
  const r = useDados('/api/vendas/resumo?dias=30');
  if (r.erro) return html`<${Erro} msg=${r.erro} />`;
  if (r.carregando) return html`<${Esqueleto} />`;
  const v = r.dados, base = location.origin + '/api/webhook/';
  const aplicar = () => {
    if (v.precoPrincipal) localStorage.calc_preco = v.precoPrincipal.toFixed(2);
    if (v.taxaBump != null) localStorage.calc_bumpTx = (100 * v.taxaBump).toFixed(1);
    if (v.taxaUpsell != null) localStorage.calc_upTx = (100 * v.taxaUpsell).toFixed(1);
    aviso('Calculadoras atualizadas com as conversões reais');
  };
  return html`<div class="kpis"><${Kpi} rot="Pedidos (30 dias)" val=${fmt(v.pedidos)} /><${Kpi} rot="Receita" val=${brl(v.receita)} /><${Kpi} rot="Ticket médio" val=${v.ticketMedio ? brl(v.ticketMedio) : '—'} />
      <${Kpi} rot="Conversão do bump" val=${v.taxaBump != null ? (100 * v.taxaBump).toFixed(1) + '%' : '—'} /><${Kpi} rot="Conversão do upsell" val=${v.taxaUpsell != null ? (100 * v.taxaUpsell).toFixed(1) + '%' : '—'} /><${Kpi} rot="Reembolsos" val=${fmt(v.reembolsos)} /></div>
    ${v.pedidos ? html`<button onClick=${aplicar}>Usar estes números nas Calculadoras</button>` : null}
    <div class="painel-box secao"><div class="pb-cab"><h2>Como ligar (webhook do gateway)</h2></div><div class="pb-corpo">
      ${v.webhook ? html`<p class="peq" style="margin-top:0">No painel do gateway, em Webhooks/Integrações, cadastre a URL abaixo (troque <code>kiwify</code> pelo seu gateway e <code>SEU_TOKEN</code> pelo valor de <code>WEBHOOK_TOKEN</code>) para os eventos de compra aprovada e reembolso:</p>
        <pre class="prompt">${base}kiwify?token=SEU_TOKEN</pre><button class="bt-p" onClick=${() => copiar(base + 'kiwify?token=SEU_TOKEN')}><${Ic} n="copiar" /> Copiar</button>`
        : html`<p class="peq" style="margin-top:0">Crie a variável <code>WEBHOOK_TOKEN</code> na Vercel (uma senha longa qualquer). Depois cadastre no gateway: <code>${base}NOME_DO_GATEWAY?token=SEU_TOKEN</code>.</p>`}
      <p class="mut peq">Só ficam salvos valor, produto, tipo (principal, bump ou upsell) e situação. Nome, e-mail e CPF do comprador são descartados.</p></div></div>`;
}

// Diário de testes: cada teste com oferta, criativos, gasto e resultado. Fica salvo como projeto do tipo "teste".
function Diario() {
  const [lista, setLista] = useState(null), [editar, setEditar] = useState(null);
  const carregar = async () => { const l = await api('/api/projetos?tipo=teste'); setLista(await Promise.all(l.map((x) => api('/api/projetos/' + x.id)))); };
  useEffect(() => { carregar().catch(() => setLista([])); }, []);
  if (!lista) return html`<${Esqueleto} />`;
  const linhas = lista.map((t) => ({ ...t.dados, id: t.id, titulo: t.titulo, cpa: t.dados.vendas ? t.dados.gasto / t.dados.vendas : null, roas: t.dados.gasto ? (t.dados.receita || 0) / t.dados.gasto : null }));
  const gasto = linhas.reduce((s, t) => s + Number(t.gasto || 0), 0), receita = linhas.reduce((s, t) => s + Number(t.receita || 0), 0);
  return html`<div class="barra-res"><span class="mut">${lista.length} testes · gasto ${brl(gasto)} · receita ${brl(receita)} · resultado ${brl(receita - gasto)}</span>
      <button class="pri" onClick=${() => setEditar({ titulo: '', dados: { inicio: new Date().toISOString().slice(0, 10), resultado: 'rodando' } })}><${Ic} n="mais" /> Novo teste</button></div>
    ${linhas.length ? html`<div class="painel-box"><${Tabela} linhas=${linhas} ordemInicial=${{ k: 'inicio', asc: false }} colunas=${[
      { t: 'Teste', k: 'titulo', v: (t) => html`<b>${t.titulo}</b><div class="mut peq">${t.oferta || ''}</div>` }, { t: 'Início', k: 'inicio', v: (t) => t.inicio },
      { t: 'Criativos', v: (t) => html`<span class="peq">${t.criativos || '—'}</span>` }, { t: 'Gasto', k: 'gasto', cl: 'dir', v: (t) => brl(Number(t.gasto || 0)) },
      { t: 'Vendas', k: 'vendas', cl: 'dir', v: (t) => t.vendas || 0 }, { t: 'CPA', k: 'cpa', cl: 'dir', v: (t) => (t.cpa ? brl(t.cpa) : '—') }, { t: 'ROAS', k: 'roas', cl: 'dir', v: (t) => (t.roas ? t.roas.toFixed(2) : '—') },
      { t: 'Resultado', k: 'resultado', v: (t) => html`<span class=${'tag ' + (t.resultado === 'aprovado' ? 'st-validando' : t.resultado === 'reprovado' ? 'st-forte' : 'st-agora')}>${t.resultado}</span>` },
      { t: '', cl: 'acoes', v: (t) => html`<button class="bt-p" onClick=${() => setEditar(lista.find((x) => x.id === t.id))}>Editar</button>` }]} /></div>`
      : html`<${Vazio} titulo="Nenhum teste registrado" texto="Registre cada teste: oferta, criativos, gasto e resultado. Com o tempo você vê o que funciona para você." />`}
    ${editar ? html`<${EditarTeste} t=${editar} onFechar=${() => setEditar(null)} onSalvo=${() => { setEditar(null); carregar(); }} />` : null}`;
}

function EditarTeste({ t, onFechar, onSalvo }) {
  const [titulo, setTitulo] = useState(t.titulo || ''), [d, setD] = useState(t.dados || {});
  const campo = (k, rot, tipo = 'text') => html`<label class="campo">${rot}<input type=${tipo} value=${d[k] ?? ''} onInput=${(e) => setD({ ...d, [k]: tipo === 'number' ? Number(e.target.value) : e.target.value })} /></label>`;
  const salvar = async () => { await post(t.id ? '/api/projetos/' + t.id : '/api/projetos', { tipo: 'teste', titulo: titulo || 'Teste', dados: d }); aviso('Teste salvo'); onSalvo(); };
  return html`<${Modal} titulo=${t.id ? 'Editar teste' : 'Novo teste'} onFechar=${onFechar}>
    <label class="campo">Nome do teste<input value=${titulo} onInput=${(e) => setTitulo(e.target.value)} placeholder="ex.: Pilates 21d · ângulo mães" /></label>
    <div class="form-grade">${campo('oferta', 'Oferta / produto')}${campo('inicio', 'Início', 'date')}${campo('fim', 'Fim', 'date')}
      ${campo('gasto', 'Gasto (R$)', 'number')}${campo('vendas', 'Vendas', 'number')}${campo('receita', 'Receita (R$)', 'number')}</div>
    <label class="campo">Criativos testados<input value=${d.criativos || ''} onInput=${(e) => setD({ ...d, criativos: e.target.value })} placeholder="ex.: hook dor nas costas, UGC mãe, feedback" /></label>
    <label class="campo">Resultado<select value=${d.resultado || 'rodando'} onChange=${(e) => setD({ ...d, resultado: e.target.value })}><option value="rodando">Rodando</option><option value="aprovado">Aprovado (escalar)</option><option value="reprovado">Reprovado</option></select></label>
    <label class="campo">Aprendizados<textarea value=${d.notas || ''} onInput=${(e) => setD({ ...d, notas: e.target.value })} /></label>
    <div class="linha" style="justify-content:space-between">${t.id ? html`<button class="fantasma" onClick=${async () => { await api('/api/projetos/' + t.id, { method: 'DELETE' }); onSalvo(); }}>Excluir</button>` : html`<span></span>`}
      <button class="pri" onClick=${salvar}>Salvar</button></div>
  </${Modal}>`;
}
