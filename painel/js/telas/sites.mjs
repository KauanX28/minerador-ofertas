// Análise de site: gateway, checkout, preço, VSL, quiz, rastreadores, sitemap e quem anuncia o domínio.
import { useState } from 'preact/hooks';
import { html, useDados, useLoja, navegar, fmt, relativo, rodarTarefa } from '../base.mjs';
import { Ic, Tabela, Esqueleto, Erro, Vazio, Ent, Kpi, Gws, Estrela } from '../ui.mjs';

export function TelaSites() {
  const l = useLoja();
  const r = useDados('/api/analises');
  const [url, setUrl] = useState('');
  return html`<div class="cab"><div><h1>Análise de site</h1><p>Cole o link da página de vendas ou do checkout. O robô abre como celular, segue os redirecionamentos e mostra o funil.</p></div></div>
    <form class="painel-box form-linha" onSubmit=${(e) => { e.preventDefault(); const u = url.trim(); if (!u) return; navegar('/site/' + encodeURIComponent(u.replace(/^https?:\/\//, '').split('/')[0])); }}>
      <input value=${url} onInput=${(e) => setUrl(e.target.value)} placeholder="https://pagina-de-vendas.com ou link de checkout" aria-label="Endereço do site" />
      <button class="pri" type="submit">Ver análise</button></form>
    <div class="secao"><div class="secao-cab"><h2>Sites já analisados</h2><span class="mut peq">${r.dados?.length ?? ''}</span></div>
      ${r.erro ? html`<${Erro} msg=${r.erro} />` : r.carregando ? html`<${Esqueleto} />` : html`<div class="painel-box"><${Tabela} linhas=${r.dados} colunas=${[
        { t: 'Site', v: (a) => html`<a href=${'/site/' + encodeURIComponent(a.dominio)} class="sem-sub"><${Ent} img=${a.imagem} t1=${a.dominio} t2=${a.titulo} /></a>` },
        { t: 'Funil', v: (a) => a.funil }, { t: 'Gateway', v: (a) => html`<${Gws} lista=${a.gateways} />` }, { t: 'Preço', v: (a) => (a.preco ? html`<span class="preco">${a.preco}</span>` : '—') },
        { t: 'Anúncios', cl: 'dir', v: (a) => fmt(a.anuncios) }, { t: 'Páginas', cl: 'dir', v: (a) => fmt(a.paginas) }, { t: 'Analisado', cl: 'dir', v: (a) => html`<span class="peq mut">${relativo(a.quando)}</span>` },
      ]} /></div>`}</div>`;
}

export function TelaSite({ dominio }) {
  const l = useLoja();
  const r = useDados('/api/analise?url=' + encodeURIComponent(dominio), [dominio]);
  if (r.erro) return html`<${Erro} msg=${r.erro} />`;
  if (r.carregando) return html`<${Esqueleto} linhas=${10} />`;
  const { dados: a, links } = r.dados;
  const atalhos = html`<div class="linha">${Object.entries(links || {}).map(([n, u]) => html`<a class="botao" href=${u} target="_blank" rel="noopener">${n} <${Ic} n="externo" t=${12} /></a>`)}</div>`;
  const analisar = () => rodarTarefa({ tipo: 'analisar', url: dominio, pais: l.pais });
  if (!a) return html`<div class="cab"><div><div class="migalha"><a href="/sites">Sites</a> / ${dominio}</div><h1>${dominio}</h1></div></div>
    <${Vazio} titulo="Este site ainda não foi analisado" texto=${`A análise abre a página como celular, identifica gateway, checkout, preço, VSL, quiz, rastreadores e cloaker, lê o sitemap.xml e conta os anúncios que levam ao site (${l.pais}).`} acao="Analisar agora" onAcao=${analisar} />
    <div class="secao"><div class="secao-cab"><h2>Ferramentas externas</h2></div>${atalhos}</div>`;
  const t = a.tecnologia || {};
  return html`
    <div class="cab"><div><div class="migalha"><a href="/sites">Sites</a> / ${a.dominio}</div><h1>${a.dominio}</h1><p>analisado ${relativo(a.quando)}</p></div>
      <div class="linha"><${Estrela} tipo="oferta" chave=${a.dominio} nome=${a.dominio} /><button onClick=${analisar}>Refazer análise</button>
        ${a.urlFinal ? html`<a class="botao" href=${a.urlFinal} target="_blank" rel="noopener">Abrir site <${Ic} n="externo" /></a>` : null}</div></div>
    <div class="kpis"><${Kpi} rot="Anúncios para o site" val=${fmt(a.biblioteca?.total)} sub="na Biblioteca" />
      <${Kpi} rot="Páginas anunciando" val=${fmt(a.biblioteca?.paginas?.length)} sub=${(a.biblioteca?.paginas?.length || 0) > 1 ? 'várias contas: sinal de escala' : ''} />
      <${Kpi} rot="Gateway" val=${(a.gateways || []).join(', ') || '—'} /><${Kpi} rot="Preço principal" val=${a.checkouts?.[0]?.preco || a.precos?.[0] || '—'} /></div>
    ${a.cloaker?.suspeito ? html`<div class="aviso-erro">Possível cloaker: ${a.cloaker.motivo}. O robô de anúncios vê uma página diferente da que o cliente vê.</div>` : null}
    <div class="grade-2 secao">
      <div class="painel-box"><div class="pb-cab"><h2>Página</h2></div><div class="pb-corpo">
        ${a.imagem ? html`<img src=${a.imagem} alt="" class="capa" />` : null}<b>${a.titulo || ''}</b><div class="mut peq">${a.descricao || ''}</div>
        ${(a.manchetes || []).length ? html`<div class="peq secao">${a.manchetes.map((m) => html`<div>· ${m}</div>`)}</div>` : null}
        ${(a.precos || []).length ? html`<div class="peq secao"><span class="mut">Preços na página:</span> ${a.precos.slice(0, 6).join(' · ')}</div>` : null}</div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Checkout</h2></div><div class="pb-corpo">
        ${(a.checkouts || []).length ? a.checkouts.map((c) => html`<div class="linha-item"><div><b>${c.produto || c.checkout}</b><div><a class="peq" href=${c.url} target="_blank" rel="noopener">${c.checkout}</a></div></div>${c.preco ? html`<span class="preco">${c.preco}</span>` : null}</div>`)
          : html`<span class="mut">Nenhum link de checkout visível (pode estar dentro do quiz ou do vídeo).</span>`}</div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Estrutura do funil</h2></div><div class="pb-corpo"><dl class="lista-def">
        <dt>VSL</dt><dd>${(t.vsl || []).join(', ') || '—'}</dd><dt>Quiz</dt><dd>${(t.quiz || []).join(', ') || '—'}</dd><dt>Rastreamento</dt><dd>${(t.rastreio || []).join(', ') || '—'}</dd>
        <dt>Construtor</dt><dd>${(t.construtor || []).join(', ') || '—'}</dd><dt>Palavras</dt><dd>${fmt(a.palavras)}</dd></dl></div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Gatilhos</h2></div><div class="pb-corpo">
        ${[['temGarantia', 'Garantia'], ['temBonus', 'Bônus'], ['temDepoimentos', 'Depoimentos / prova social'], ['temEscassez', 'Escassez / urgência']].map(([k, n]) => html`<div class="check"><span class=${a[k] ? 'sim' : 'nao'}>${a[k] ? '✓' : '–'}</span>${n}</div>`)}</div></div>
    </div>
    ${a.biblioteca?.paginas?.length ? html`<div class="secao"><div class="secao-cab"><h2>Páginas que anunciam o site</h2></div><div class="painel-box"><${Tabela} linhas=${a.biblioteca.paginas} colunas=${[
      { t: 'Página', v: (p) => html`<a href=${'/oferta/' + encodeURIComponent(p.page_id)}>${p.nome}</a>` }, { t: 'Anúncios vistos', cl: 'dir', v: (p) => fmt(p.anuncios) },
      { t: 'Desde', cl: 'dir', v: (p) => (p.inicio ? new Date(p.inicio * 1000).toLocaleDateString('pt-BR') : '—') }]} /></div></div>` : null}
    ${(a.sitemap || []).length ? html`<div class="secao"><div class="secao-cab"><h2>sitemap.xml</h2><span class="mut peq">${a.sitemap.length} páginas, mais recentes primeiro</span></div>
      <div class="painel-box" style="max-height:300px;overflow:auto"><${Tabela} linhas=${a.sitemap} colunas=${[{ t: 'Atualizada', v: (s) => (s.lastmod || '').slice(0, 10) || '—' }, { t: 'URL', v: (s) => html`<a href=${s.url} target="_blank" rel="noopener">${s.url}</a>` }]} /></div></div>` : null}
    <div class="secao"><div class="secao-cab"><h2>Ferramentas externas</h2></div>${atalhos}</div>`;
}
