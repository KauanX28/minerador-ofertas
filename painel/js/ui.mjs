// Componentes visuais reutilizados em todas as telas.
import { useState, useEffect, useRef } from 'preact/hooks';
import { html, fmt, compacto, brl, diasDesde, STATUS, bib, copiar, favoritar, loja, definir, nomeGateway, TIPOS_OFERTA, dataCurta, rodarTarefa, post, aviso } from './base.mjs';

const ICONES = {
  inicio: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  ofertas: 'M22 7 13.5 15.5 8.5 10.5 2 17M16 7h6v6',
  anuncios: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM21 15l-5-5L5 21M9 7a2 2 0 1 1 0 4 2 2 0 0 1 0-4',
  gateways: 'M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM2 10h20',
  dominio: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  minerar: 'M3 5c0-1.7 4-3 9-3s9 1.3 9 3-4 3-9 3-9-1.3-9-3M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3',
  listas: 'M3 4h5v16H3zM10 4h5v10h-5zM17 4h4v13h-4z',
  calc: 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2M8 6h8M8 11h1M12 11h1M16 11h0M8 15h1M12 15h1M16 15v3',
  prompts: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  metodo: 'M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z',
  uso: 'M12 14l4-4M3.34 19a10 10 0 1 1 17.32 0',
  config: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  estrela: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z',
  externo: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
  baixar: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  fechar: 'M18 6 6 18M6 6l12 12',
  lua: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z',
  sol: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4',
  copiar: 'M9 9h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  grade: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  lista: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  busca: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M21 21l-4.3-4.3',
  sair: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  seta: 'M5 12h14M13 6l6 6-6 6',
  check: 'M20 6 9 17l-5-5',
  comparar: 'M3 3h7v18H3zM14 3h7v18h-7z',
  filtro: 'M22 3H2l8 9.5V19l4 2v-8.5z',
  raio: 'M13 2 3 14h9l-1 8 10-12h-9z',
  alvo: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  menu: 'M3 6h18M3 12h18M3 18h18',
  mais: 'M12 5v14M5 12h14',
  sobe: 'M6 15l6-6 6 6',
  esq: 'M15 18l-6-6 6-6',
  dir: 'M9 18l6-6-6-6',
  desce: 'M6 9l6 6 6-6',
  mais3: 'M5 12h.01M12 12h.01M19 12h.01',
  ajuda: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
  estudio: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  validar: 'M9 12l2 2 4-4M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5z',
  conta: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0',
  ocultar: 'M17.9 17.9A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.1-5.9M9.9 4.2A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.2 3.2M1 1l22 22',
};
export const Ic = ({ n, t = 16 }) => html`<svg class="ic" width=${t} height=${t} viewBox="0 0 24 24" aria-hidden="true"><path d=${ICONES[n] || ''} /></svg>`;

export const Tag = ({ c = '', children, title }) => html`<span class=${'tag ' + c} title=${title}>${children}</span>`;
// Status como medidor: quantos segmentos acesos = quão escalada; a cor diz se sobe, se pede atenção ou se cai.
const NIVEL = { 'Teste': [1, 'neutro'], 'Validando': [2, 'atencao'], 'Nova acelerando': [2, 'sobe', 'sobe'], 'Escalando agora': [3, 'sobe', 'sobe'],
  'Escalada': [3, 'sobe'], 'Escalada forte': [4, 'sobe'], 'Saturando/caindo': [2, 'cai', 'desce'] };
export function Status({ s, chapa }) {
  if (!s) return null;
  const [n, cor, seta] = NIVEL[s] || [1, 'neutro'];
  return html`<span class=${'status ' + cor + (chapa ? ' chapa' : '')} title=${s}><span class="medidor" aria-hidden="true">${[1, 2, 3, 4].map((i) => html`<i class=${i <= n ? 'on' : ''}></i>`)}</span>${seta ? html`<${Ic} n=${seta} />` : null}${s}</span>`;
}
// Frase do veredito, a partir do status e da nota de modelagem.
export function veredito(p) {
  const [, cor] = NIVEL[p.status] || [1, 'neutro'];
  const modelar = p.oportunidade >= 60 ? 'boa para modelar' : p.oportunidade >= 40 ? 'dá para modelar com cuidado' : 'concorrida para modelar';
  const base = { 'Escalada forte': 'Escalada forte', 'Escalada': 'Escalada', 'Escalando agora': 'Escalando agora', 'Nova acelerando': 'Nova e acelerando',
    'Validando': 'Ainda validando', 'Teste': 'Em teste', 'Saturando/caindo': 'Saturando' }[p.status] || p.status || 'Sem leitura ainda';
  return { frase: p.status === 'Saturando/caindo' || p.status === 'Teste' ? base : `${base} · ${modelar}`, cor: cor === 'neutro' ? '' : cor };
}
export const Gws = ({ lista }) => (lista?.length ? lista.map((g) => html`<span class="tag tg-gw">${g}</span> `) : html`<span class="mut">—</span>`);
export const TipoTag = ({ t }) => (t && t !== 'low' ? html`<span class="tag">${TIPOS_OFERTA[t] || t}</span>` : null);

export function Preco({ preco, precoBrl, origem }) {
  if (!preco && precoBrl == null) return html`<span class="mut">—</span>`;
  const conv = precoBrl != null && preco && !/^R\$/.test(preco);
  return html`<span class="preco" title=${origem ? 'Preço lido no ' + origem : ''}>${preco || brl(precoBrl)}</span>${conv ? html`<small class="mut"> ≈ ${brl(precoBrl)}</small>` : null}`;
}

export function Score({ n, fatores, mini }) {
  const titulo = fatores ? 'Como a nota foi calculada:\n' + fatores.map((f) => `${f.nome}: ${f.pontos} de ${f.peso} (${f.detalhe})`).join('\n') : '';
  return html`<div class=${'score' + (mini ? ' mini' : '')} title=${titulo}><b>${n ?? '—'}</b><i><span style=${`width:${Math.min(100, n || 0)}%`}></span></i></div>`;
}

// Tendência de 30 dias: área suave e o último ponto destacado (SVG puro, sem biblioteca).
export function Spark({ serie, w = 112, h = 32 }) {
  if (!serie || serie.length < 2) return html`<span class="sem-hist" title="A tendência aparece a partir da segunda contagem (o robô reconta todo dia)">
    <svg class="spark vazia" width="40" height=${h} aria-hidden="true"><line x1="1" x2="39" y1=${h / 2} y2=${h / 2} /></svg>tendência a partir de amanhã</span>`;
  const vs = serie.map((p) => p[1]), max = Math.max(...vs), min = Math.min(...vs), amp = max - min || 1;
  const pad = 4, x = (i) => pad + (i / (vs.length - 1)) * (w - pad * 2), y = (v) => h - pad - ((v - min) / amp) * (h - pad * 2);
  const pts = vs.map((v, i) => [x(i), y(v)]);
  // curva suave (Catmull-Rom convertida em Bézier)
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  const fim = pts.at(-1), sobe = vs.at(-1) >= vs[0];
  return html`<svg class=${'spark ' + (sobe ? 'sobe' : 'desce')} width=${w} height=${h} viewBox=${`0 0 ${w} ${h}`} role="img" aria-label=${`Anúncios ativos em 30 dias: de ${vs[0]} para ${vs.at(-1)}`}>
    <title>${serie.map((p) => `${dataCurta(p[0])}: ${p[1]}`).join('\n')}</title>
    <path class="area-s" d=${`${d} L${fim[0]},${h} L${pts[0][0]},${h} Z`} /><path class="linha-s" d=${d} />
    <circle class="anel-s" cx=${fim[0]} cy=${fim[1]} r="4" /><circle class="ponto-s" cx=${fim[0]} cy=${fim[1]} r="2.6" /></svg>`;
}

// Variação em 7 dias, com o sinal na cor do significado.
export function Delta({ v, rot = 'em 7 dias' }) {
  if (v == null) return null;
  return html`<span class=${'delta ' + (v > 0 ? 'sobe' : v < 0 ? 'cai' : '')}><b>${v > 0 ? '+' : ''}${fmt(v)}</b> ${rot}</span>`;
}

export function Grafico({ serie, h = 140 }) {
  if (!serie || serie.length < 2) return html`<div class="vazio peq">O gráfico aparece a partir da segunda contagem (o robô reconta todo dia).</div>`;
  const w = 640, vs = serie.map((p) => p[1]), max = Math.max(...vs, 1);
  const x = (i) => 30 + (i / (vs.length - 1)) * (w - 40), y = (v) => h - 20 - (v / max) * (h - 34);
  const pts = vs.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return html`<svg class="grafico" viewBox=${`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Anúncios ativos por dia">
    <line x1="30" x2=${w - 10} y1=${y(0)} y2=${y(0)} class="eixo" /><line x1="30" x2=${w - 10} y1=${y(max)} y2=${y(max)} class="eixo fraco" />
    <text x="0" y=${y(max) + 4} class="rot">${max}</text><text x="0" y=${y(0) + 4} class="rot">0</text>
    <polygon points=${`${x(0)},${y(0)} ${pts} ${x(vs.length - 1)},${y(0)}`} class="area" /><polyline points=${pts} class="linha" />
    ${serie.map((p, i) => html`<circle cx=${x(i)} cy=${y(p[1])} r=${i === serie.length - 1 ? 4 : 2.5} class=${i === serie.length - 1 ? 'fim' : ''}><title>${dataCurta(p[0])}: ${p[1]} anúncios</title></circle>`)}
    <text x="30" y=${h - 4} class="rot">${dataCurta(serie[0][0])}</text><text x=${w - 10} y=${h - 4} class="rot" text-anchor="end">${dataCurta(serie.at(-1)[0])}</text></svg>`;
}

export const Ent = ({ img, t1, t2 }) => html`<div class="ent">${img ? html`<img src=${img} loading="lazy" alt="" />` : html`<div class="av"></div>`}
  <div><div class="t1" title=${t1}>${t1}</div>${t2 ? html`<div class="t2" title=${t2}>${t2}</div>` : null}</div></div>`;

// Ocultar anunciante (marca grande, app, o que não interessa): some de todas as listas e entra na lista de bloqueio.
export function Ocultar({ pageId, nome, onOculto }) {
  const [feito, set] = useState(false);
  if (feito) return html`<span class="mut peq">oculto</span>`;
  return html`<button class="bt-ic" title=${'Ocultar ' + (nome || 'este anunciante') + ' de todas as listas'} aria-label=${'Ocultar ' + (nome || 'anunciante')}
    onClick=${async (e) => { e.preventDefault(); e.stopPropagation(); await post('/api/ocultar', { page_id: pageId }); set(true); aviso((nome || 'Anunciante') + ' oculto. Para mostrar de novo, vá em Configurações, Anunciantes ocultos.'); onOculto?.(); }}><${Ic} n="ocultar" /></button>`;
}

export function Estrela({ tipo, chave, nome, on }) {
  const [ativo, set] = useState(!!on);
  return html`<button class=${'bt-ic' + (ativo ? ' on' : '')} title=${ativo ? 'Tirar de Minhas listas' : 'Salvar em Minhas listas'} aria-label=${ativo ? 'Tirar de Minhas listas' : 'Salvar em Minhas listas'} aria-pressed=${ativo}
    onClick=${async (e) => { e.preventDefault(); e.stopPropagation(); await favoritar(tipo, chave, nome, ativo); set(!ativo); }}><${Ic} n="estrela" /></button>`;
}

export const Esqueleto = ({ linhas = 6, cards }) => (cards
  ? html`<div class="feed">${Array.from({ length: cards }, () => html`<div class="card esq"><div class="esq-img"></div><div class="esq-l"></div><div class="esq-l curta"></div></div>`)}</div>`
  : html`<div class="painel-box">${Array.from({ length: linhas }, () => html`<div class="esq-linha"><div class="esq-l"></div></div>`)}</div>`);

export const Vazio = ({ titulo, texto, acao, onAcao, href }) => html`<div class="painel-box vazio-acao"><b>${titulo}</b>${texto ? html`<p class="mut">${texto}</p>` : null}
  ${acao ? (href ? html`<a class="botao pri" href=${href}>${acao}</a>` : html`<button class="pri" onClick=${onAcao}>${acao}</button>`) : null}</div>`;

export const Erro = ({ msg }) => html`<div class="painel-box vazio-acao"><b>Esta parte não carregou</b><p class="mut">${msg}. Confira a conexão e tente de novo.</p><button onClick=${() => location.reload()}>Recarregar a página</button></div>`;

export function Abas({ abas, ativa, onTroca }) {
  return html`<div class="abas" role="tablist">${abas.map(([k, nome, n]) => html`<button role="tab" aria-selected=${k === ativa} class=${k === ativa ? 'ativo' : ''} onClick=${() => onTroca(k)}>${nome}${n != null ? html` <small class="mut">${n}</small>` : null}</button>`)}</div>`;
}

export const Kpi = ({ rot, val, sub }) => html`<div class="kpi"><span>${rot}</span><b>${val}</b>${sub ? html`<small>${sub}</small>` : null}</div>`;

// Tabela ordenável: colunas = [{ t: título, v: (linha, i) => conteúdo, k: chave de ordenação, ord: (linha) => valor, cl: classe }]
export function Tabela({ linhas, colunas, ordemInicial, vazio = 'Nenhum resultado.' }) {
  const [ord, set] = useState(ordemInicial || { k: null, asc: false });
  let l = linhas || [];
  if (ord.k) {
    const c = colunas.find((x) => x.k === ord.k), val = c?.ord || ((r) => r[ord.k]);
    l = [...l].sort((a, b) => { const x = val(a) ?? -Infinity, y = val(b) ?? -Infinity; return (x > y ? 1 : x < y ? -1 : 0) * (ord.asc ? 1 : -1); });
  }
  return html`<div class="rolar"><table class="tabela"><thead><tr>${colunas.map((c) => html`<th class=${(c.cl || '') + (c.k ? ' ordenavel' : '') + (c.k && c.k === ord.k ? ' ord' + (ord.asc ? ' asc' : '') : '')}
      onClick=${c.k ? () => set({ k: c.k, asc: ord.k === c.k ? !ord.asc : false }) : null}>${c.t}</th>`)}</tr></thead>
    <tbody>${l.length ? l.map((r, i) => html`<tr>${colunas.map((c) => html`<td class=${c.cl || ''}>${c.v(r, i)}</td>`)}</tr>`)
      : html`<tr><td colspan=${colunas.length} class="vazio">${vazio}</td></tr>`}</tbody></table></div>`;
}

// Card do feed de ofertas: status, leitura (anúncios, dias, variações), tendência e o essencial da venda.
const FORMATOS = { VIDEO: 'Vídeo', IMAGE: 'Imagem', CAROUSEL: 'Carrossel', DCO: 'Dinâmico' };
export function CartaoOferta({ p, selecionado, onSelecionar }) {
  const [oculto, setOculto] = useState(false);
  if (oculto) return null;
  const sub = p.produto || p.dominios?.[0] || p.titulo || '';
  const formato = FORMATOS[p.formato] || p.formato;
  const temPreco = p.preco || p.precoBrl != null;
  const notaTit = `Nota ${p.score} de 100` + (p.fatores ? '\n' + p.fatores.map((f) => `${f.nome}: ${f.pontos} de ${f.peso}`).join('\n') : '') + (p.oportunidade != null ? `\n\nBoa para modelar: ${p.oportunidade}. ${p.motivoOport || ''}` : '');
  return html`<article class="card">
    <a href=${'/oferta/' + encodeURIComponent(p.page_id)} class="card-link" aria-label=${'Abrir ' + p.nome}>
      <div class="card-midia">${p.thumb ? html`<img src=${p.thumb} loading="lazy" alt="" />` : html`<div class="sem-img">${(p.nome || '?')[0]}</div>`}
        <div class="card-selos"><${Status} s=${p.status} chapa />${formato ? html`<span class="selo">${formato}</span>` : null}</div></div>
      <div class="card-corpo">
        <div class="card-tit"><b title=${p.nome}>${p.nome}</b>${sub ? html`<span title=${sub}>${sub}</span>` : null}</div>
        <div class="leitura">
          <div><b>${compacto(p.ativos)}</b><span>anúncios</span></div>
          <div><b>${p.dias ?? '—'}</b><span>dias</span></div>
          <div><b>${p.dupMax ?? 1}x</b><span>variações</span></div>
        </div>
        <div class="card-tend"><${Spark} serie=${p.serie} /><${Delta} v=${p.var7} /></div>
        ${temPreco || p.gateways?.length ? html`<div class="card-meta">
          ${temPreco ? html`<${Preco} preco=${p.preco} precoBrl=${p.precoBrl} />` : null}
          ${temPreco && p.gateways?.length ? html`<span class="sep"></span>` : null}
          ${p.gateways?.length ? html`<span>${p.gateways.slice(0, 2).join(', ')}</span>` : null}</div>` : null}
      </div></a>
    <div class="card-acoes">
      <span class="nota-card" title=${notaTit}>Nota <b>${p.score ?? '—'}</b></span>
      ${onSelecionar ? html`<label class="check-l"><input type="checkbox" checked=${selecionado} onChange=${() => onSelecionar(p.page_id)} /> Comparar</label>` : html`<span style="flex:1"></span>`}
      <${Ocultar} pageId=${p.page_id} nome=${p.nome} onOculto=${() => setOculto(true)} />
      <${Estrela} tipo="pagina" chave=${p.page_id} nome=${p.nome} on=${p.favorito} />
    </div></article>`;
}

export function CartaoAnuncio({ a, onModelar }) {
  const dias = diasDesde(a.inicio);
  const [expirou, setExpirou] = useState(false);
  return html`<div class="ad">
    <div class="ad-cab"><b title=${a.page_name}>${a.page_name || ''}</b>${a.ativo === 0 ? html`<span class="tag">saiu do ar</span>` : null}</div>
    <div class="ad-midia">${a.video && !expirou ? html`<video src=${a.video} poster=${a.thumb || ''} controls preload="metadata" onError=${() => setExpirou(true)}></video>`
      : a.video && expirou ? html`<div class="expirou">${a.thumb ? html`<img src=${a.thumb} loading="lazy" alt="" />` : null}<button class="bt-p" onClick=${() => rodarTarefa({ tipo: 'renovar', pagina: a.page_id, pais: loja.pais })}>Vídeo expirou: buscar de novo</button></div>` : a.thumb ? html`<img src=${a.thumb} loading="lazy" alt="" />` : html`<div style="height:80px"></div>`}
      ${a.formato && !(a.video && !expirou) ? html`<span class="selo">${FORMATOS[a.formato] || a.formato}</span>` : null}</div>
    <div class="ad-met"><div><b>${dias ?? '—'}</b><span>dias no ar</span></div><div><b>${a.dup || 1}x</b><span>variações</span></div><div class="cta"><b title=${a.cta || ''}>${a.cta || '—'}</b><span>botão</span></div></div>
    <div class="ad-info">${a.titulo ? html`<b>${a.titulo}</b>` : null}<div class="txt">${a.texto}</div>
      ${a.gateway ? html`<div><span class="tag tg-gw">${nomeGateway(a.gateway)}</span></div>` : null}</div>
    <div class="rod">
      ${onModelar ? html`<button class="bt-p modelar" onClick=${() => onModelar(a)}>Modelar</button>` : html`<span style="margin-right:auto"></span>`}
      <button class="bt-ic" title="Copiar texto do anúncio" aria-label="Copiar texto do anúncio" onClick=${() => copiar(a.texto || '')}><${Ic} n="copiar" /></button>
      ${a.video ? html`<a class="bt-ic" href=${a.video} target="_blank" rel="noopener" download title="Baixar vídeo" aria-label="Baixar vídeo"><${Ic} n="baixar" /></a>` : null}
      ${a.link ? html`<a class="bt-ic" href=${a.link} target="_blank" rel="noopener" title="Abrir a página de destino" aria-label="Abrir a página de destino"><${Ic} n="dominio" /></a>` : null}
      <a class="bt-ic" href=${bib.anuncio(a.ad_id)} target="_blank" rel="noopener" title="Ver na Biblioteca de Anúncios" aria-label="Ver na Biblioteca de Anúncios"><${Ic} n="externo" /></a>
      <${Estrela} tipo="criativo" chave=${a.ad_id} nome=${(a.page_name || '') + ': ' + (a.titulo || a.texto || '').slice(0, 60)} />
    </div></div>`;
}

// Folha: painel que desliza (da direita no desktop, de baixo no celular). Fecha com Esc ou tocando fora.
export function Folha({ titulo, onFechar, children, rodape }) {
  const ref = useRef();
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', esc);
    const antes = document.activeElement; ref.current?.querySelector('button, a, input, select')?.focus();
    return () => { document.removeEventListener('keydown', esc); antes?.focus?.(); };
  }, []);
  return html`<div class="fundo on" onClick=${onFechar}></div>
    <div class="folha" role="dialog" aria-modal="true" aria-label=${titulo} ref=${ref}>
      <div class="folha-topo"><b>${titulo}</b><button class="bt-ic" onClick=${onFechar} aria-label="Fechar"><${Ic} n="fechar" /></button></div>
      <div class="folha-corpo">${children}</div>${rodape ? html`<div class="folha-rod">${rodape}</div>` : null}</div>`;
}

export function Modal({ titulo, onFechar, children, largo }) {
  useEffect(() => { const esc = (e) => { if (e.key === 'Escape') onFechar(); }; document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc); }, []);
  return html`<div class="fundo on" onClick=${onFechar}></div>
    <div class=${'modal' + (largo ? ' largo' : '')} role="dialog" aria-modal="true" aria-label=${titulo}>
      <div class="modal-topo"><b>${titulo}</b><button class="bt-ic" onClick=${onFechar} aria-label="Fechar"><${Ic} n="fechar" /></button></div>
      <div class="modal-corpo">${children}</div></div>`;
}

// Prompts de modelagem preenchidos com o criativo (degrada para "copiar", sem depender de IA paga).
export function ModalModelar({ ad, onFechar }) {
  const base = `${ad.titulo ? 'Título: ' + ad.titulo + '\n' : ''}${ad.texto || ''}`;
  const lista = (window.PROMPTS || []).filter((p) => p.criativo);
  return html`<${Modal} titulo="Modelar este criativo" onFechar=${onFechar} largo>
    <p class="mut">Copie um prompt e use no ChatGPT, Claude ou Gemini (planos grátis). Ele cria uma estrutura nova a partir da referência, sem copiar o texto de ninguém.</p>
    ${lista.map((p) => { const t = p.texto.replace('{{CRIATIVO}}', base).replaceAll('{{NICHO}}', '[SEU PRODUTO]');
      return html`<div class="painel-box" style="margin-bottom:10px"><div class="pb-cab"><b>${p.titulo}</b><button class="bt-p" onClick=${() => copiar(t)}><${Ic} n="copiar" /> Copiar</button></div>
        <div class="pb-corpo"><pre class="prompt">${t}</pre></div></div>`; })}
  </${Modal}>`;
}

export function Paginacao({ pagina, por, total, onIr }) {
  const paginas = Math.ceil(total / por);
  if (paginas <= 1) return null;
  return html`<div class="paginacao"><button disabled=${pagina <= 1} onClick=${() => onIr(pagina - 1)}>Anterior</button>
    <span class="mut">Página ${pagina} de ${paginas}</span><button disabled=${pagina >= paginas} onClick=${() => onIr(pagina + 1)}>Próxima</button></div>`;
}

export function Chips({ opcoes, valor, onTroca, multi }) {
  const sel = multi ? new Set(valor) : null;
  return html`<div class="chips">${opcoes.map(([k, nome]) => {
    const on = multi ? sel.has(k) : valor === k;
    return html`<button type="button" class=${'chip' + (on ? ' on' : '')} aria-pressed=${on}
      onClick=${() => onTroca(multi ? (on ? valor.filter((x) => x !== k) : [...valor, k]) : on ? '' : k)}>${nome}</button>`;
  })}</div>`;
}

export const comparar = {
  alternar(id) { const l = loja.comparar.includes(id) ? loja.comparar.filter((x) => x !== id) : [...loja.comparar, id].slice(-3); definir({ comparar: l }); },
};
