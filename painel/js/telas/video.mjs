// Vídeo simples no navegador: slides com legenda grande, imagem opcional por cena e narração gravada no microfone.
// Usa o gravador nativo do navegador (canvas + MediaRecorder): sem servidor, sem custo, exporta MP4 quando suportado.
import { useState, useRef } from 'preact/hooks';
import { html, aviso } from '../base.mjs';
import { Ic, Chips } from '../ui.mjs';

const TAMANHOS = { '9:16': [1080, 1920], '4:5': [1080, 1350], '1:1': [1080, 1080] };
const quebrar = (ctx, texto, largura) => {
  const linhas = []; let atual = '';
  for (const p of String(texto).split(/\s+/)) { const t = atual ? atual + ' ' + p : p; if (ctx.measureText(t).width > largura && atual) { linhas.push(atual); atual = p; } else atual = t; }
  if (atual) linhas.push(atual);
  return linhas;
};

export function TelaVideo() {
  const inicial = (() => { try { return JSON.parse(sessionStorage.videoCenas || 'null'); } catch { return null; } })();
  const [cenas, setCenas] = useState(inicial || [{ texto: 'Você também sente dor nas costas todo dia?', seg: 3, img: null }, { texto: 'Em 10 minutos por dia, sem sair de casa', seg: 3, img: null }, { texto: 'Clique em Saiba mais', seg: 3, img: null }]);
  const [formato, setFormato] = useState('9:16'), [corFundo, setCor] = useState('#0b1220'), [narrar, setNarrar] = useState(false), [estado, setEstado] = useState(''), [url, setUrl] = useState(null);
  const tela = useRef();
  const [W, H] = TAMANHOS[formato];
  const mudar = (i, patch) => setCenas(cenas.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const desenhar = (ctx, c, imagem, t) => {
    ctx.fillStyle = corFundo; ctx.fillRect(0, 0, W, H);
    if (imagem) { const r = Math.max(W / imagem.width, H / imagem.height) * (1 + 0.04 * t); const w = imagem.width * r, h = imagem.height * r; ctx.globalAlpha = 0.85; ctx.drawImage(imagem, (W - w) / 2, (H - h) / 2, w, h); ctx.globalAlpha = 1; }
    ctx.font = `800 ${Math.round(W * 0.075)}px Inter, Arial, sans-serif`; ctx.textAlign = 'center';
    const linhas = quebrar(ctx, c.texto, W * 0.84), lh = W * 0.09, y0 = H * 0.5 - (linhas.length * lh) / 2;
    linhas.forEach((l, k) => { const y = y0 + k * lh; const m = ctx.measureText(l).width; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - m / 2 - 20, y - lh * 0.78, m + 40, lh); ctx.fillStyle = '#fff'; ctx.fillText(l, W / 2, y); });
  };

  const gerar = async () => {
    setUrl(null);
    const cv = tela.current; cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const imagens = await Promise.all(cenas.map((c) => (c.img ? new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = c.img; }) : null)));
    const stream = cv.captureStream(30);
    let mic = null;
    if (narrar) {
      try { mic = await navigator.mediaDevices.getUserMedia({ audio: true }); mic.getAudioTracks().forEach((t) => stream.addTrack(t)); }
      catch { aviso('Sem acesso ao microfone: o vídeo sai sem narração'); }
    }
    const tipo = ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 6e6 });
    const partes = []; rec.ondataavailable = (e) => e.data.size && partes.push(e.data);
    const fim = new Promise((ok) => (rec.onstop = ok));
    rec.start();
    for (let i = 0; i < cenas.length; i++) {
      setEstado(`${narrar ? 'Gravando: leia em voz alta. ' : ''}Cena ${i + 1} de ${cenas.length}: ${cenas[i].texto}`);
      const ini = performance.now(), dur = Math.max(1, Number(cenas[i].seg) || 3) * 1000;
      await new Promise((ok) => { const quadro = () => { const t = (performance.now() - ini) / dur; desenhar(ctx, cenas[i], imagens[i], Math.min(t, 1)); if (t < 1) requestAnimationFrame(quadro); else ok(); }; quadro(); });
    }
    rec.stop(); await fim; mic?.getTracks().forEach((t) => t.stop());
    setUrl(URL.createObjectURL(new Blob(partes, { type: tipo })));
    setEstado(tipo.startsWith('video/mp4') ? 'Pronto (MP4).' : 'Pronto (WebM). Se a plataforma não aceitar WebM, converta no CapCut grátis.');
  };

  return html`<div class="cab"><div><h1>Vídeo simples</h1><p>Slides com legenda grande, no formato dos criativos de texto na tela. Narração opcional pelo microfone.</p></div></div>
    <div class="editor">
      <div class="editor-palco"><canvas ref=${tela} class="video-tela" width=${W} height=${H}></canvas></div>
      <div class="col-gap">
        <div class="painel-box"><div class="pb-corpo col-gap">
          <div class="campo">Formato<${Chips} opcoes=${Object.keys(TAMANHOS).map((k) => [k, k])} valor=${formato} onTroca=${(v) => v && setFormato(v)} /></div>
          <label class="campo">Cor de fundo<input type="color" value=${corFundo} onInput=${(e) => setCor(e.target.value)} /></label>
          ${cenas.map((c, i) => html`<div class="cena"><b class="peq">Cena ${i + 1}</b>
            <textarea value=${c.texto} onInput=${(e) => mudar(i, { texto: e.target.value })} style="min-height:56px" />
            <div class="linha"><label class="peq">Segundos <input type="number" min="1" max="15" value=${c.seg} onInput=${(e) => mudar(i, { seg: e.target.value })} style="width:64px" /></label>
              <label class="botao peq" style="cursor:pointer">${c.img ? 'Trocar imagem' : 'Imagem'}<input type="file" accept="image/*" hidden onChange=${(e) => e.target.files?.[0] && mudar(i, { img: URL.createObjectURL(e.target.files[0]) })} /></label>
              <button class="bt-ic" title="Remover cena" onClick=${() => setCenas(cenas.filter((_, j) => j !== i))}><${Ic} n="fechar" /></button></div></div>`)}
          <button onClick=${() => setCenas([...cenas, { texto: 'Nova cena', seg: 3, img: null }])}><${Ic} n="mais" /> Cena</button>
          <label class="check-l"><input type="checkbox" checked=${narrar} onChange=${(e) => setNarrar(e.target.checked)} /> gravar minha narração enquanto o vídeo roda</label>
          <button class="pri" onClick=${gerar}>Gerar vídeo</button>
          ${estado ? html`<span class="peq">${estado}</span>` : null}
          ${url ? html`<a class="botao pri" href=${url} download=${'criativo-' + formato.replace(':', 'x') + (url && estado.includes('MP4') ? '.mp4' : '.webm')}><${Ic} n="baixar" /> Baixar vídeo</a>` : null}
        </div></div></div></div>`;
}
