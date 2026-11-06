// Entregável: do mapa da concorrência ao PDF pronto, em passos. IA opcional em cada etapa (sem chave: prompt para copiar).
import { useState, useRef, useLayoutEffect as useEffect } from 'preact/hooks';
import { html, api, post, aviso, copiar, navegar, relativo } from '../base.mjs';
import { Ic, Abas, Vazio, Esqueleto, Chips } from '../ui.mjs';
import { resolver } from '../ia.mjs';

const FORMATOS = [['ebook', 'E-book'], ['planner', 'Planner'], ['checklist', 'Checklist'], ['workbook', 'Workbook'], ['desafio', 'Desafio de 7 dias']];
const PASSOS = [['briefing', '1. Briefing'], ['mapa', '2. Concorrência'], ['estrutura', '3. Estrutura'], ['conteudo', '4. Conteúdo'], ['capa', '5. Capa'], ['bonus', '6. Bônus e bumps'], ['entrega', '7. Entrega']];
const ENTREGA = {
  Kiwify: 'Produtos → seu produto → Área de membros: crie um módulo, envie o PDF e ative o acesso automático após a compra.',
  Hotmart: 'Ferramentas → Hotmart Club: crie a área, adicione um módulo com o PDF e associe ao produto.',
  Cakto: 'Produtos → Entregável: escolha "Área de membros Cakto" e envie o arquivo (ou link) do PDF.',
  Kirvano: 'Produto → Conteúdo: suba o PDF na área de membros da Kirvano e libere o acesso por e-mail.',
  Eduzz: 'Use a área de membros Nutror (grátis com a Eduzz) e vincule ao produto.',
  Ticto: 'Produto → Área de membros Ticto: envie o PDF como aula/material e publique.',
  Hubla: 'Crie o produto como "conteúdo" e envie o PDF; a Hubla libera o acesso no pagamento.',
};

// Pede uma etapa à IA (servidor → chave do navegador → prompt para copiar).
async function pedirIA(etapa, dados) { return resolver(await post('/api/projetos/ia', { tipo: 'entregavel', etapa, dados })); }

export function TelaEntregaveis() {
  const [lista, setLista] = useState(null);
  useEffect(() => { api('/api/projetos?tipo=entregavel').then(setLista).catch(() => setLista([])); }, []);
  const novo = async () => { const r = await post('/api/projetos', { tipo: 'entregavel', titulo: 'Novo entregável', dados: { formato: 'ebook', capitulos: [] } }); navegar('/entregavel/' + r.id); };
  if (!lista) return html`<${Esqueleto} />`;
  return html`<div class="cab"><div><h1>Entregável</h1><p>Monte o produto (e-book, planner, checklist, workbook ou desafio) com IA, capítulo por capítulo, e exporte em PDF.</p></div>
      ${lista.length ? html`<button class="pri" onClick=${novo}>Criar entregável</button>` : null}</div>
    ${lista.length ? html`<div class="grade-3">${lista.map((p) => html`<a class="painel-box passo" href=${'/entregavel/' + p.id}><div><b>${p.titulo}</b><span class="mut peq">editado ${relativo(p.atualizado)}</span></div></a>`)}</div>`
      : html`<${Vazio} titulo="Nenhum entregável ainda" texto="Comece pelo briefing: produto, público e promessa. A IA monta a estrutura e escreve os capítulos." acao="Criar o primeiro entregável" onAcao=${novo} />`}`;
}

export function TelaEntregavel({ id }) {
  const [p, setP] = useState(null), [passo, setPasso] = useState('briefing'), [ocupado, setOcupado] = useState(''), [semIA, setSemIA] = useState(null);
  const tSalvar = useRef();
  useEffect(() => { api('/api/projetos/' + id).then((r) => setP(r.erro ? null : r)); }, [id]);
  if (!p) return html`<${Esqueleto} linhas=${8} />`;
  const d = p.dados;
  const mudar = (patch, titulo) => {
    const n = { ...p, titulo: titulo ?? p.titulo, dados: { ...d, ...patch } };
    setP(n);
    clearTimeout(tSalvar.current);
    tSalvar.current = setTimeout(() => post('/api/projetos/' + id, { tipo: 'entregavel', titulo: n.titulo, dados: n.dados }).catch((e) => aviso('Erro ao salvar: ' + e.message)), 600);
  };
  const [colado, setColado] = useState('');
  // aplicar: o que fazer com o resultado (vale para a IA e para a resposta colada à mão).
  const ia = async (etapa, extra = {}, aplicar) => {
    setOcupado(etapa); setSemIA(null);
    try {
      const r = await pedirIA(etapa, { ...d, titulo: p.titulo, ...extra });
      if (r.semIA) { setSemIA({ ...r, aplicar }); return null; }
      aplicar?.(r.resultado);
      return r.resultado;
    } catch (e) { aviso(e.message); return null; } finally { setOcupado(''); }
  };
  const usarColado = () => {
    try {
      const t = colado.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
      const j = JSON.parse(t.match(/[[{][\s\S]*[\]}]/)?.[0] || t);
      semIA.aplicar?.(j); setSemIA(null); setColado(''); aviso('Resposta aplicada');
    } catch { aviso('Não consegui ler a resposta: cole exatamente o JSON que a IA devolveu'); }
  };
  const prontos = (d.capitulos || []).filter((c) => c.html).length;
  return html`<div class="cab"><div><div class="migalha"><a href="/entregavel">Entregáveis</a> / ${p.titulo}</div>
      <input class="titulo-edit" value=${p.titulo} onInput=${(e) => mudar({}, e.target.value)} aria-label="Título do entregável" /></div>
      <div class="linha"><span class="mut peq">${prontos} de ${(d.capitulos || []).length} capítulos escritos</span><button class="pri" onClick=${() => exportarPDF(p)}><${Ic} n="baixar" /> Exportar PDF</button></div></div>
    <${Abas} abas=${PASSOS} ativa=${passo} onTroca=${setPasso} />
    ${semIA ? html`<div class="painel-box" style="margin-bottom:12px"><div class="pb-cab"><b>Sem IA no servidor: copie o prompt, cole no ChatGPT/Gemini e cole a resposta no campo abaixo</b><button class="bt-p" onClick=${() => copiar(semIA.prompt)}><${Ic} n="copiar" /> Copiar</button></div>
      <div class="pb-corpo col-gap"><pre class="prompt">${semIA.prompt}</pre>
        <label class="campo">Resposta da IA (cole aqui)<textarea value=${colado} onInput=${(e) => setColado(e.target.value)} placeholder='{"titulo": "..."}' /></label>
        <button class="pri" style="width:fit-content" onClick=${usarColado} disabled=${!colado.trim()}>Usar esta resposta</button></div></div>` : null}
    ${passo === 'briefing' ? html`<div class="painel-box"><div class="pb-corpo col-gap">
      <label class="campo">Produto (o que a pessoa recebe)<input value=${d.produto || ''} onInput=${(e) => mudar({ produto: e.target.value })} placeholder="ex.: Guia de pilates na parede para iniciantes" /></label>
      <label class="campo">Público<input value=${d.publico || ''} onInput=${(e) => mudar({ publico: e.target.value })} placeholder="ex.: mulheres 35+ sem tempo para academia" /></label>
      <label class="campo">Promessa<input value=${d.promessa || ''} onInput=${(e) => mudar({ promessa: e.target.value })} placeholder="ex.: perder a barriga em 21 dias com 15 minutos por dia" /></label>
      <div class="campo">Formato<${Chips} opcoes=${FORMATOS} valor=${d.formato || 'ebook'} onTroca=${(v) => v && mudar({ formato: v })} /></div>
      <label class="campo">Reclamações de produtos parecidos (opcional: cole do Reclame Aqui ou dos comentários)<textarea value=${d.reclamacoes || ''} onInput=${(e) => mudar({ reclamacoes: e.target.value })} /></label>
      <button class="pri" style="width:fit-content" onClick=${() => setPasso('mapa')}>Continuar</button></div></div>` : null}
    ${passo === 'mapa' ? html`<div class="painel-box"><div class="pb-cab"><h2>Mapa do entregável concorrente</h2><button onClick=${() => ia('mapa', {}, (r) => mudar({ mapa: r }))} disabled=${!!ocupado}>${ocupado === 'mapa' ? 'Gerando…' : 'Gerar com IA'}</button></div>
      <div class="pb-corpo">${d.mapa ? html`<div class="grade-2">${[['Formato prometido', [d.mapa.formato_prometido]], ['Módulos', d.mapa.modulos], ['Bônus', d.mapa.bonus], ['Lacunas (faça melhor)', d.mapa.lacunas], ['Seus diferenciais', d.mapa.diferenciais]]
        .map(([t, l]) => html`<div><b class="peq">${t}</b><ul class="lista-ia">${(l || []).filter(Boolean).map((x) => html`<li>${x}</li>`)}</ul></div>`)}</div>`
        : html`<p class="mut">A IA lista o que a concorrência entrega e onde ela decepciona, para o seu produto ser melhor. Use o briefing e, se tiver, as reclamações.</p>`}
        <button style="margin-top:10px" onClick=${() => setPasso('estrutura')}>Continuar</button></div></div>` : null}
    ${passo === 'estrutura' ? html`<div class="painel-box"><div class="pb-cab"><h2>Estrutura</h2><button onClick=${() => ia('estrutura', {}, (r) => mudar({ subtitulo: r.subtitulo, capitulos: (r.capitulos || []).map((c) => ({ ...c, html: '' })) }, r.titulo || p.titulo))} disabled=${!!ocupado}>${ocupado === 'estrutura' ? 'Gerando…' : 'Gerar estrutura com IA'}</button></div>
      <div class="pb-corpo col-gap"><label class="campo">Subtítulo<input value=${d.subtitulo || ''} onInput=${(e) => mudar({ subtitulo: e.target.value })} /></label>
        ${(d.capitulos || []).map((c, i) => html`<div class="linha"><span class="num-passo">${i + 1}</span><input style="flex:1" value=${c.titulo} onInput=${(e) => mudar({ capitulos: d.capitulos.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)) })} />
          <button class="bt-ic" title="Remover" onClick=${() => mudar({ capitulos: d.capitulos.filter((_, j) => j !== i) })}><${Ic} n="fechar" /></button></div>`)}
        <div class="linha"><button onClick=${() => mudar({ capitulos: [...(d.capitulos || []), { titulo: 'Novo capítulo', objetivo: '', html: '' }] })}><${Ic} n="mais" /> Capítulo</button>
          <button class="pri" onClick=${() => setPasso('conteudo')}>Escrever o conteúdo</button></div></div></div>` : null}
    ${passo === 'conteudo' ? html`<${Conteudo} d=${d} titulo=${p.titulo} mudar=${mudar} ia=${ia} ocupado=${ocupado} />` : null}
    ${passo === 'capa' ? html`<${Capa} titulo=${p.titulo} subtitulo=${d.subtitulo} d=${d} mudar=${mudar} />` : null}
    ${passo === 'bonus' ? html`<div class="painel-box"><div class="pb-cab"><h2>Bônus, order bumps e upsell</h2><button onClick=${() => ia('bonus', {}, (r) => mudar({ bonus: r }))} disabled=${!!ocupado}>${ocupado === 'bonus' ? 'Gerando…' : 'Sugerir com IA'}</button></div>
      <div class="pb-corpo">${d.bonus ? html`<div class="grade-2"><div><b class="peq">Bônus</b><ul class="lista-ia">${(d.bonus.bonus || []).map((b) => html`<li><b>${b.nome}</b>: ${b.descricao} <span class="mut">(${b.formato})</span></li>`)}</ul></div>
        <div><b class="peq">Order bumps</b><ul class="lista-ia">${(d.bonus.order_bumps || []).map((b) => html`<li><b>${b.nome}</b> · ${b.preco_sugerido}<div class="mut peq">${b.por_que_combina}</div></li>`)}</ul>
          ${d.bonus.upsell ? html`<b class="peq">Upsell</b><p><b>${d.bonus.upsell.nome}</b> · ${d.bonus.upsell.preco_sugerido}<br /><span class="mut peq">${d.bonus.upsell.descricao}</span></p>` : null}</div></div>`
        : html`<p class="mut">De 4 a 6 order bumps coerentes aumentam o ticket médio e permitem pagar um CPA maior. Veja o efeito nas Calculadoras.</p>`}</div></div>` : null}
    ${passo === 'entrega' ? html`<div class="painel-box"><div class="pb-cab"><h2>Como entregar (sem hospedar arquivos aqui)</h2></div><div class="pb-corpo">
      <p class="mut">Exporte o PDF e suba na área de membros do seu gateway: o acesso é liberado sozinho depois da compra.</p>
      <dl class="lista-def">${Object.entries(ENTREGA).map(([g, t]) => html`<dt>${g}</dt><dd>${t}</dd>`)}</dl>
      <button class="pri" onClick=${() => exportarPDF(p)}><${Ic} n="baixar" /> Exportar PDF</button></div></div>` : null}`;
}

// Editor do conteúdo: TipTap (carregado sob demanda); se não carregar, um editor simples do navegador.
function EditorRico({ valor, onMudar }) {
  const caixa = useRef(), ed = useRef();
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [{ Editor }, { default: StarterKit }] = await Promise.all([import('https://esm.sh/@tiptap/core@2.11.5'), import('https://esm.sh/@tiptap/starter-kit@2.11.5')]);
        if (!vivo) return;
        ed.current = new Editor({ element: caixa.current, extensions: [StarterKit], content: valor || '<p></p>', onUpdate: ({ editor }) => onMudar(editor.getHTML()) });
      } catch {
        if (!vivo) return;
        caixa.current.contentEditable = 'true'; caixa.current.innerHTML = valor || '';
        caixa.current.oninput = () => onMudar(caixa.current.innerHTML);
      }
    })();
    return () => { vivo = false; ed.current?.destroy(); ed.current = null; };
  }, []);
  useEffect(() => { if (ed.current && valor !== ed.current.getHTML()) ed.current.commands.setContent(valor || '<p></p>', false); }, [valor]);
  const cmd = (f) => ed.current && f(ed.current.chain().focus()).run();
  return html`<div class="editor-rico"><div class="barra-rico">
      <button class="bt-p" onClick=${() => cmd((c) => c.toggleHeading({ level: 2 }))}>Título</button><button class="bt-p" onClick=${() => cmd((c) => c.toggleHeading({ level: 3 }))}>Subtítulo</button>
      <button class="bt-p" onClick=${() => cmd((c) => c.toggleBold())}><b>N</b></button><button class="bt-p" onClick=${() => cmd((c) => c.toggleItalic())}><i>I</i></button>
      <button class="bt-p" onClick=${() => cmd((c) => c.toggleBulletList())}>• Lista</button><button class="bt-p" onClick=${() => cmd((c) => c.toggleOrderedList())}>1. Lista</button></div>
    <div class="doc" ref=${caixa}></div></div>`;
}

function Conteudo({ d, titulo, mudar, ia, ocupado }) {
  const [i, setI] = useState(0);
  const caps = d.capitulos || [];
  if (!caps.length) return html`<${Vazio} titulo="Sem capítulos" texto="Monte a estrutura primeiro (passo 3)." />`;
  const c = caps[Math.min(i, caps.length - 1)];
  const escrever = () => ia('capitulo', { capitulo: c }, (r) => r?.html && mudar({ capitulos: caps.map((x, j) => (j === i ? { ...x, html: r.html } : x)) }));
  return html`<div class="conteudo-ent">
    <div class="nichos-lista">${caps.map((x, j) => html`<button class=${j === i ? 'ativo' : ''} onClick=${() => setI(j)}>${j + 1}. ${x.titulo}<small class=${x.html ? 'cresce' : 'mut'}>${x.html ? 'escrito' : 'a escrever'}</small></button>`)}</div>
    <div class="col-gap"><div class="linha" style="justify-content:space-between"><b>${c.titulo}</b>
      <button onClick=${escrever} disabled=${!!ocupado}>${ocupado === 'capitulo' ? 'Escrevendo…' : c.html ? 'Reescrever com IA' : 'Escrever com IA'}</button></div>
      <${EditorRico} key=${i} valor=${c.html} onMudar=${(h) => mudar({ capitulos: caps.map((x, j) => (j === i ? { ...x, html: h } : x)) })} /></div></div>`;
}

// Capa (canvas) e mockup 3D do e-book, exportados em PNG.
function Capa({ titulo, subtitulo, d, mudar }) {
  const cv = useRef(), mk = useRef();
  const cor1 = d.capaCor1 || '#1f5eff', cor2 = d.capaCor2 || '#0b1220', autor = d.capaAutor || '';
  useEffect(() => {
    const c = cv.current, ctx = c.getContext('2d'), W = 1600, H = 2400;
    c.width = W; c.height = H;
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, cor1); g.addColorStop(1, cor2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.08)'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(W * 0.85, H * 0.15, 200 + k * 140, 0, Math.PI * 2); ctx.fill(); }
    const quebra = (t, tam, y, peso) => { ctx.font = `${peso} ${tam}px Inter, Arial`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; let linha = '', yy = y;
      for (const p of String(t || '').split(' ')) { const tt = linha ? linha + ' ' + p : p; if (ctx.measureText(tt).width > W - 240 && linha) { ctx.fillText(linha, 120, yy); linha = p; yy += tam * 1.12; } else linha = tt; }
      ctx.fillText(linha, 120, yy); return yy; };
    const y = quebra(titulo, 150, H * 0.42, 800);
    quebra(subtitulo, 64, y + 140, 500);
    if (autor) { ctx.font = '600 56px Inter, Arial'; ctx.fillText(autor, 120, H - 160); }
    // mockup 3D: lombada + capa em perspectiva, com sombra
    const m = mk.current, mx = m.getContext('2d'), MW = 1400, MH = 1400; m.width = MW; m.height = MH;
    mx.clearRect(0, 0, MW, MH); mx.fillStyle = 'rgba(0,0,0,.25)'; mx.beginPath(); mx.ellipse(MW / 2 + 40, MH - 170, 420, 50, 0, 0, Math.PI * 2); mx.fill();
    const cw = 700, ch = 1050, x0 = 380, y0 = 120, fatias = 140;
    for (let k = 0; k < fatias; k++) { const t = k / fatias, enc = 1 - 0.12 * t, h = ch * enc, sx = (W / fatias) * k;
      mx.drawImage(c, sx, 0, W / fatias + 1, H, x0 + cw * t, y0 + (ch - h) / 2, cw / fatias + 1, h); }
    mx.fillStyle = cor2; mx.beginPath(); mx.moveTo(x0, y0); mx.lineTo(x0 - 70, y0 + 30); mx.lineTo(x0 - 70, y0 + ch - 30); mx.lineTo(x0, y0 + ch); mx.closePath(); mx.fill();
    mx.fillStyle = 'rgba(255,255,255,.18)'; mx.fillRect(x0 - 4, y0, 4, ch);
  }, [titulo, subtitulo, cor1, cor2, autor]);
  const baixar = (el, nome) => { const a = document.createElement('a'); a.href = el.toDataURL('image/png'); a.download = nome; a.click(); };
  return html`<div class="editor"><div class="editor-palco capa-palco"><canvas ref=${cv} class="capa-cv"></canvas><canvas ref=${mk} class="capa-cv"></canvas></div>
    <div class="painel-box"><div class="pb-corpo col-gap">
      <label class="campo">Cor 1<input type="color" value=${cor1} onInput=${(e) => mudar({ capaCor1: e.target.value })} /></label>
      <label class="campo">Cor 2<input type="color" value=${cor2} onInput=${(e) => mudar({ capaCor2: e.target.value })} /></label>
      <label class="campo">Autor ou marca<input value=${autor} onInput=${(e) => mudar({ capaAutor: e.target.value })} /></label>
      <button onClick=${() => baixar(cv.current, 'capa.png')}><${Ic} n="baixar" /> Capa (PNG)</button>
      <button onClick=${() => baixar(mk.current, 'mockup-3d.png')}><${Ic} n="baixar" /> Mockup 3D (PNG)</button>
      <p class="mut peq">Use o mockup na página de vendas e nos criativos. O título e o subtítulo vêm da estrutura.</p></div></div></div>`;
}

// PDF no próprio navegador: abre uma página de impressão formatada (Salvar como PDF). Não ocupa o Storage.
// Remove scripts e atributos de evento do HTML gerado (o texto vem da IA ou de colagem).
const limpo = (h) => String(h || '').replace(/<(script|style|iframe)[\s\S]*?<\/(script|style|iframe)>/gi, '').replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

function exportarPDF(p) {
  const d = p.dados, esc = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const w = window.open('', '_blank');
  if (!w) return aviso('Libere as janelas pop-up para exportar o PDF');
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(p.titulo)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap">
  <style>@page{size:A4;margin:22mm 20mm}body{font-family:Inter,Arial,sans-serif;color:#111;line-height:1.6;font-size:12pt}
  .capa{height:250mm;display:flex;flex-direction:column;justify-content:center;background:linear-gradient(135deg,${d.capaCor1 || '#1f5eff'},${d.capaCor2 || '#0b1220'});color:#fff;padding:20mm;margin:-22mm -20mm 0;page-break-after:always}
  .capa h1{font-size:34pt;line-height:1.1;margin:0 0 10mm}.capa p{font-size:15pt;opacity:.9}.sum{page-break-after:always}h2{page-break-before:always;font-size:20pt;color:#1f5eff}h3{font-size:14pt}
  .sum li{margin:4px 0}</style></head><body>
  <section class="capa"><h1>${esc(p.titulo)}</h1><p>${esc(d.subtitulo)}</p>${d.capaAutor ? `<p>${esc(d.capaAutor)}</p>` : ''}</section>
  <section class="sum"><h3>Sumário</h3><ol>${(d.capitulos || []).map((c) => `<li>${esc(c.titulo)}</li>`).join('')}</ol></section>
  ${(d.capitulos || []).map((c) => `<h2>${esc(c.titulo)}</h2>${limpo(c.html || '<p><em>Capítulo ainda não escrito.</em></p>').replace(/<h2>/g, '<h3>').replace(/<\/h2>/g, '</h3>')}`).join('')}
  <script>setTimeout(()=>print(),700)<\/script></body></html>`);
  w.document.close();
}
