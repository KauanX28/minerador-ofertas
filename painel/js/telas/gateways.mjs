// Gateways: checkouts com mais anúncios em cada plataforma de pagamento (o "Top pages" do Semrush, medido por anúncios).
import { useState } from 'preact/hooks';
import { html, useDados, useLoja, nomePais, fmt, relativo, rodarTarefa, exportarCSV, bib } from '../base.mjs';
import { Ic, Tabela, Esqueleto, Erro, Vazio, Ent, Score, Estrela, Kpi, Abas } from '../ui.mjs';

export function TelaGateways() {
  const l = useLoja();
  const r = useDados('/api/gateways');
  if (r.erro) return html`<${Erro} msg=${r.erro} />`;
  if (r.carregando) return html`<${Esqueleto} linhas=${10} />`;
  const regiao = (rg) => (l.config?.gateways || []).filter((g) => g.regiao === rg).map((g) => g.id);
  const tab = (lista) => html`<div class="painel-box"><${Tabela} linhas=${lista} colunas=${[
    { t: 'Gateway', v: (g) => html`<a href=${'/gateways/' + g.id}><b>${g.nome}</b></a><div class="peq mut">${g.busca.join(', ')}</div>` },
    { t: 'Anúncios na Biblioteca', cl: 'dir', v: (g) => (g.totalBiblioteca != null ? html`<b class="num">${fmt(g.totalBiblioteca)}</b>` : html`<span class="mut">ainda não pesquisado</span>`) },
    { t: 'Checkouts', cl: 'dir', v: (g) => fmt(g.checkouts) }, { t: 'Anunciantes', cl: 'dir', v: (g) => fmt(g.paginas) },
    { t: 'Atualizado', cl: 'dir', v: (g) => html`<span class="peq mut">${relativo(g.consultado)}</span>` },
    { t: '', cl: 'acoes', v: (g) => html`<a class="botao" href=${'/gateways/' + g.id}>Ver ofertas</a>` },
  ]} /></div>`;
  return html`<div class="cab"><div><h1>Gateways</h1><p>${nomePais(l.pais)} · pesquise um gateway e veja os checkouts com mais anúncios. Dica: cole um link de checkout na busca do topo.</p></div></div>
    <div class="secao-cab"><h2>Brasil e América Latina</h2></div>${tab(r.dados.filter((g) => regiao('BR').includes(g.id)))}
    <div class="secao"><div class="secao-cab"><h2>Internacional</h2><span class="mut peq">use com países como US, GB, CA, AU</span></div>${tab(r.dados.filter((g) => regiao('INT').includes(g.id)))}</div>`;
}

export function TelaGateway({ id }) {
  const l = useLoja();
  const r = useDados('/api/gateway/' + id, [id]);
  const [aba, setAba] = useState('ck');
  if (r.erro) return html`<${Erro} msg=${r.erro} />`;
  if (r.carregando) return html`<${Esqueleto} linhas=${10} />`;
  const d = r.dados, g = d.gateway;
  if (!g) return html`<${Vazio} titulo="Gateway não encontrado" acao="Ver gateways" href="/gateways" />`;
  const pesquisar = () => rodarTarefa({ tipo: 'gateway', gateway: id, pais: l.pais });
  return html`
    <div class="cab"><div><div class="migalha"><a href="/gateways">Gateways</a> / ${g.nome}</div><h1>${g.nome}</h1><p>${nomePais(l.pais)} · busca na Biblioteca por ${g.busca.map((b) => html`<code>${b}</code> `)}</p></div>
      <div class="linha"><button onClick=${() => exportarCSV('checkouts-' + id, d.checkouts, [['Produto', (c) => c.produto], ['Checkout', (c) => c.url], ['Preço', (c) => c.preco], ['Variações', (c) => c.variacoes],
        ['Criativos', (c) => c.anuncios], ['Dias', (c) => c.dias], ['Anunciantes', (c) => c.paginas.map((p) => p.nome).join(' | ')], ['Nota', (c) => c.score]])}>CSV</button>
        <button class="pri" onClick=${pesquisar}>Pesquisar agora</button></div></div>
    <div class="kpis"><${Kpi} rot="Anúncios na Biblioteca" val=${fmt(d.buscas[0]?.total)} sub=${d.buscas[0] ? relativo(d.buscas[0].quando) : 'não pesquisado'} />
      <${Kpi} rot="Checkouts mapeados" val=${fmt(d.checkouts.length)} /><${Kpi} rot="Anúncios coletados" val=${fmt(d.checkouts.reduce((s, c) => s + c.anuncios, 0))} />
      <${Kpi} rot="Páginas de vendas" val=${fmt(d.paginasVendas.length)} sub="sites que levam ao gateway" /></div>
    <${Abas} abas=${[['ck', 'Checkouts mais anunciados', d.checkouts.length], ['lp', 'Páginas de vendas', d.paginasVendas.length]]} ativa=${aba} onTroca=${setAba} />
    ${aba === 'ck' ? (d.checkouts.length ? html`<div class="painel-box"><${Tabela} linhas=${d.checkouts} ordemInicial=${{ k: 'variacoes', asc: false }} colunas=${[
      { t: '#', v: (c, i) => html`<span class="mut num">${i + 1}</span>` },
      { t: 'Produto / checkout', k: 'produto', v: (c) => html`<${Ent} img=${c.thumb} t1=${c.produto || c.titulo || c.checkout} t2=${c.checkout} />${c.disponivel === false ? html`<span class="tag">indisponível</span>` : null}` },
      { t: 'Preço', v: (c) => (c.preco ? html`<span class="preco">${c.preco}</span>` : html`<span class="mut">—</span>`) },
      { t: 'Anúncios (variações)', k: 'variacoes', cl: 'dir', v: (c) => html`<b class="num">${fmt(c.variacoes)}</b>` },
      { t: 'Criativos', k: 'anuncios', cl: 'dir', v: (c) => fmt(c.anuncios) }, { t: 'Dias', k: 'dias', cl: 'dir', v: (c) => c.dias },
      { t: 'Anunciantes', k: 'npags', ord: (c) => c.paginas.length, v: (c) => html`<span class="peq">${c.paginas.slice(0, 2).map((p) => html`<a href=${'/oferta/' + encodeURIComponent(p.page_id)}>${p.nome}</a>${p.ativos != null ? ` (${p.ativos})` : ''}<br />`)}${c.paginas.length > 2 ? html`<span class="mut">+${c.paginas.length - 2}</span>` : null}</span>` },
      { t: 'Nota', k: 'score', v: (c) => html`<${Score} n=${c.score} />` },
      { t: '', cl: 'acoes', v: (c) => html`<${Estrela} tipo="checkout" chave=${c.checkout} nome=${c.produto || c.checkout} on=${c.favorito} /><a class="bt-ic" href=${c.url} target="_blank" rel="noopener" title="Abrir checkout"><${Ic} n="externo" /></a><a class="bt-ic" href=${bib.busca(c.checkout)} target="_blank" rel="noopener" title="Anúncios na Biblioteca"><${Ic} n="anuncios" /></a>` },
    ]} /></div>` : html`<${Vazio} titulo=${'Ainda não pesquisado em ' + nomePais(l.pais)} texto="A pesquisa leva de 3 a 5 minutos e roda no robô." acao="Pesquisar agora" onAcao=${pesquisar} />`)
    : d.paginasVendas.length ? html`<div class="painel-box"><${Tabela} linhas=${d.paginasVendas} colunas=${[
      { t: 'Site', v: (p) => html`<a href=${'/site/' + encodeURIComponent(p.dominio)} class="sem-sub"><${Ent} img=${p.imagem} t1=${p.dominio} t2=${p.produto || p.titulo} /></a>` },
      { t: 'Preço', v: (p) => (p.preco ? html`<span class="preco">${p.preco}</span>` : '—') }, { t: 'Anúncios', cl: 'dir', v: (p) => fmt(p.anuncios) }, { t: 'Páginas', cl: 'dir', v: (p) => fmt(p.paginas) },
    ]} /></div>` : html`<${Vazio} titulo="Nenhuma página de vendas ainda" texto="Aparecem depois que o robô analisa os sites dos anunciantes (automático)." />`}`;
}
