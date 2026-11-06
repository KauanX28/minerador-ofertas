// Validação do site com fontes públicas grátis: tráfego real (Chrome UX Report), histórico (Wayback),
// idade do domínio (RDAP), outros funis do produtor (subdomínios) e ranking Tranco.
import { useState, useLayoutEffect as useEffect } from 'preact/hooks';
import { html, api, post, loja, fmt, relativo } from '../base.mjs';
import { Ic } from '../ui.mjs';

const idade = (d) => (d == null ? '—' : d < 60 ? `${d} dias` : d < 730 ? `${Math.round(d / 30)} meses` : `${(d / 365).toFixed(1).replace('.', ',')} anos`);
const ms = (v) => (v == null ? '—' : v >= 1000 ? (v / 1000).toFixed(1).replace('.', ',') + ' s' : Math.round(v) + ' ms');

// Leitura rápida para quem não quer interpretar número: o que os sinais dizem juntos.
function veredito(v) {
  const bons = [], alertas = [];
  if (v.crux?.trafego) bons.push('tem tráfego real medido pelo Chrome'); else if (v.crux && !v.crux.semChave) alertas.push('pouco tráfego orgânico (normal em funil só de anúncio)');
  if (v.rdap?.idadeDias != null) (v.rdap.idadeDias >= 90 ? bons : alertas).push(`domínio com ${idade(v.rdap.idadeDias)}`);
  if (v.wayback?.ultimos12meses >= 3) bons.push(`${v.wayback.ultimos12meses} mudanças salvas no último ano (página ativa)`);
  if (v.subdominios?.total >= 3) bons.push(`${v.subdominios.total} subdomínios: o produtor tem outros funis`);
  if (v.tranco?.posicao && v.tranco.posicao <= 1000000) bons.push(`entre os ${v.tranco.posicao <= 100000 ? '100 mil' : '1 milhão de'} sites mais acessados do mundo`);
  return { bons, alertas };
}

export function Validacao({ dominio, nome }) {
  const [v, setV] = useState(undefined), [rodando, setRodando] = useState(false), [erro, setErro] = useState('');
  const host = String(dominio || '').replace(/^https?:\/\//, '').split('/')[0];
  const validar = async () => {
    setRodando(true); setErro('');
    try { setV(await post('/api/validacao', { dominio: host })); } catch (e) { setErro(e.message); }
    setRodando(false);
  };
  useEffect(() => {
    let vivo = true;
    api('/api/validacao?dominio=' + encodeURIComponent(host)).then((r) => { if (!vivo) return; setV(r); if (!r) validar(); }).catch(() => setV(null));
    return () => { vivo = false; };
  }, [host]);
  if (!host) return null;
  const termo = encodeURIComponent(nome || host.split('.')[0]);
  const externos = [['Google Trends', `https://trends.google.com/trends/explore?geo=${loja.pais}&q=${termo}`], ['Reclame Aqui', `https://www.reclameaqui.com.br/busca/?q=${termo}`],
    ['Google Ads Transparency', `https://adstransparency.google.com/?region=${loja.pais}&domain=${host}`], ['TikTok Ads', `https://library.tiktok.com/ads?region=all&adv_name=${termo}`],
    ['PageSpeed', `https://pagespeed.web.dev/analysis?url=https://${host}`]];
  if (v === undefined || (rodando && !v)) return html`<div class="painel-box"><div class="pb-corpo"><b>Validando ${host}…</b><p class="mut peq">Consultando fontes públicas: tráfego medido pelo Chrome, histórico no Wayback Machine, idade do domínio e ranking de acessos. Leva de 5 a 40 segundos.</p></div></div>`;
  if (!v) return html`<div class="painel-box"><div class="pb-corpo"><b>A validação não respondeu</b><p class="mut peq">${erro || 'Uma das fontes públicas está fora do ar.'} Tente de novo em alguns minutos.</p><button onClick=${validar}>Validar de novo</button></div></div>`;
  const { bons, alertas } = veredito(v);
  return html`<div class="validacao">
    <div class="painel-box veredito"><div class="pb-cab"><h2>Validação de ${v.host}</h2>
      <div class="linha"><span class="mut peq">${relativo(v.quando)}</span><button class="bt-p" onClick=${validar} disabled=${rodando}>${rodando ? 'Validando…' : 'Validar de novo'}</button></div></div>
      <div class="pb-corpo">${bons.map((b) => html`<div class="check"><span class="sim">✓</span>${b}</div>`)}${alertas.map((a) => html`<div class="check"><span class="nao">!</span>${a}</div>`)}
        ${!bons.length && !alertas.length ? html`<span class="mut">Poucos sinais públicos ainda. Domínios novos só de anúncio costumam aparecer assim.</span>` : null}</div></div>
    <div class="grade-3">
      <div class="painel-box"><div class="pb-cab"><h2>Tráfego real</h2><span class="mut peq">Chrome UX Report</span></div><div class="pb-corpo">
        ${v.crux?.semChave ? html`<p class="mut peq" style="margin:0">A medição de tráfego real ainda não está ligada neste painel. Ela usa uma chave grátis do Google que o responsável pelo painel ativa uma vez (o passo a passo está no guia de instalação).</p>`
          : v.crux?.trafego ? html`<div class="res cresce">Detectável</div><dl class="lista-def peq"><dt>Carregamento (LCP)</dt><dd>${ms(v.crux.lcp)}</dd><dt>Resposta ao toque (INP)</dt><dd>${ms(v.crux.inp)}</dd><dt>Estabilidade (CLS)</dt><dd>${v.crux.cls ?? '—'}</dd></dl>`
          : v.crux ? html`<div class="res">Não detectável</div><p class="mut peq">Menos visitas que o mínimo do Chrome. Funil que vive só de anúncio costuma ficar assim.</p>` : html`<span class="mut">${v.erros?.crux || '—'}</span>`}
        ${v.pagespeed?.nota != null ? html`<p class="peq">Nota de velocidade no celular: <b>${v.pagespeed.nota}</b>/100</p>` : null}</div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Histórico da página</h2><span class="mut peq">Wayback Machine</span></div><div class="pb-corpo">
        ${v.wayback?.versoes ? html`<div class="res">${fmt(v.wayback.versoes)} <span class="mut peq">versões salvas</span></div>
          <p class="peq mut">Primeira: ${v.wayback.primeira} · últimos 12 meses: ${v.wayback.ultimos12meses}</p>
          <div class="peq">${v.wayback.amostras.map((a) => html`<a href=${a.url} target="_blank" rel="noopener">${a.data}</a> `)}</div>`
          : html`<p class="mut peq" style="margin-top:0">Nenhuma versão salva ainda.</p>`}
        <a class="botao" style="margin-top:8px" href=${'https://web.archive.org/save/https://' + v.host} target="_blank" rel="noopener">Arquivar agora <${Ic} n="externo" t=${12} /></a>
        <p class="mut peq">Guarda uma cópia de hoje no Wayback (grátis, sem gastar seu armazenamento). Dá para comparar mudança de preço depois.</p></div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Domínio</h2><span class="mut peq">RDAP · Tranco</span></div><div class="pb-corpo">
        <div class="res">${idade(v.rdap?.idadeDias)} <span class="mut peq">de idade</span></div>
        <dl class="lista-def peq"><dt>Registrado em</dt><dd>${v.rdap?.criado || '—'}</dd><dt>Registrador</dt><dd>${v.rdap?.registrador || '—'}</dd>
          <dt>Ranking Tranco</dt><dd>${v.tranco?.posicao ? html`#${fmt(v.tranco.posicao)}${v.tranco.posicao > 1000000 ? ' (pouco acessado)' : ''} ${v.tranco.tendencia ? html`<span class=${v.tranco.tendencia > 0 ? 'cresce' : 'cai'}>${v.tranco.tendencia > 0 ? '▲' : '▼'} ${fmt(Math.abs(v.tranco.tendencia))} em 7 dias</span>` : null}` : 'fora do top 1 milhão'}</dd></dl></div></div>
    </div>
    <div class="grade-2 secao">
      <div class="painel-box"><div class="pb-cab"><h2>Outros funis do produtor</h2><span class="mut peq">${v.subdominios?.total ?? 0} subdomínios</span></div><div class="pb-corpo">
        ${v.subdominios?.destaque?.length ? html`<p class="peq" style="margin-top:0">Chamam atenção: ${v.subdominios.destaque.map((s) => html`<a href=${'https://' + s} target="_blank" rel="noopener"><code>${s}</code></a> `)}</p>` : null}
        ${v.subdominios?.lista?.length ? html`<div class="chips">${v.subdominios.lista.map((s) => html`<a class="chip" href=${'https://' + s} target="_blank" rel="noopener">${s}</a>`)}</div>`
          : html`<span class="mut peq">${v.erros?.subdominios ? 'Fonte fora do ar agora: ' + v.erros.subdominios : 'Nenhum subdomínio público.'}</span>`}</div></div>
      <div class="painel-box"><div class="pb-cab"><h2>Mais validação (abre em nova aba)</h2></div><div class="pb-corpo">
        <div class="linha">${externos.map(([n, u]) => html`<a class="botao" href=${u} target="_blank" rel="noopener">${n} <${Ic} n="externo" t=${12} /></a>`)}</div>
        <p class="mut peq">Google Trends mostra se o tema está subindo; Reclame Aqui, as reclamações (lacunas para o seu entregável); Ads Transparency e TikTok, se o produtor anuncia fora da Meta.</p></div></div>
    </div></div>`;
}
