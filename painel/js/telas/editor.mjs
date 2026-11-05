// Editor de criativo estático (sem IA de imagem paga): modelos dos formatos que mais escalam, textos editáveis,
// imagem enviada ou buscada no Pexels/Unsplash, remoção de fundo no navegador e exportação em 1:1, 4:5 e 9:16.
import { useState, useRef, useLayoutEffect as useEffect } from 'preact/hooks';
import { html, api, aviso } from '../base.mjs';
import { Ic, Chips } from '../ui.mjs';

const FORMATOS = { '1:1': [1080, 1080], '4:5': [1080, 1350], '9:16': [1080, 1920] };
// Cada modelo devolve as camadas: fundo, imagem e textos, em coordenadas do tamanho final.
const MODELOS = {
  manchete: { nome: 'Manchete grande', fundo: '#0b1220', camadas: (w, h) => [
    { tipo: 'imagem', x: 0, y: h * 0.42, w, h: h * 0.58, ajuste: 'cobrir' },
    { tipo: 'texto', id: 'titulo', x: 70, y: 80, w: w - 140, tam: 86, cor: '#ffffff', peso: '800', alinhar: 'left' },
    { tipo: 'texto', id: 'sub', x: 70, y: h * 0.3, w: w - 140, tam: 40, cor: '#ffd84d', peso: '600', alinhar: 'left' }] },
  feedback: { nome: 'Print de feedback', fundo: '#e5ddd5', camadas: (w, h) => [
    { tipo: 'caixa', x: 90, y: h * 0.22, w: w - 180, h: h * 0.4, cor: '#ffffff', raio: 28 },
    { tipo: 'texto', id: 'titulo', x: 140, y: h * 0.26, w: w - 280, tam: 52, cor: '#111111', peso: '500', alinhar: 'left' },
    { tipo: 'texto', id: 'sub', x: 140, y: h * 0.66, w: w - 280, tam: 44, cor: '#1f5eff', peso: '700', alinhar: 'center' }] },
  antesdepois: { nome: 'Antes e depois', fundo: '#ffffff', camadas: (w, h) => [
    { tipo: 'imagem', x: 0, y: h * 0.2, w, h: h * 0.62, ajuste: 'cobrir' },
    { tipo: 'texto', id: 'titulo', x: 50, y: 50, w: w - 100, tam: 70, cor: '#111111', peso: '800', alinhar: 'center' },
    { tipo: 'texto', id: 'sub', x: 50, y: h * 0.86, w: w - 100, tam: 44, cor: '#e11d48', peso: '700', alinhar: 'center' }] },
  oferta: { nome: 'Oferta com preço', fundo: '#1f5eff', camadas: (w, h) => [
    { tipo: 'imagem', x: w * 0.12, y: h * 0.3, w: w * 0.76, h: h * 0.42, ajuste: 'conter' },
    { tipo: 'texto', id: 'titulo', x: 60, y: 70, w: w - 120, tam: 72, cor: '#ffffff', peso: '800', alinhar: 'center' },
    { tipo: 'texto', id: 'sub', x: 60, y: h * 0.78, w: w - 120, tam: 64, cor: '#ffd84d', peso: '800', alinhar: 'center' }] },
};

let Konva = null;
const carregarKonva = async () => (Konva ||= (await import('https://esm.sh/konva@9.3.18')).default);
const carregarImagem = (src) => new Promise((ok, erro) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = erro; i.src = src; });

export function TelaEditor() {
  const hooks = (() => { try { return JSON.parse(sessionStorage.editorTextos || '[]'); } catch { return []; } })();
  const [formato, setFormato] = useState('4:5'), [modelo, setModelo] = useState('manchete');
  const [textos, setTextos] = useState({ titulo: hooks[0] || 'Escreva aqui o seu gancho principal', sub: 'Acesso imediato · por apenas R$ 19,90' });
  const [img, setImg] = useState(null), [fundo, setFundo] = useState(null), [busca, setBusca] = useState(''), [fotos, setFotos] = useState(null), [ocupado, setOcupado] = useState('');
  const caixa = useRef(), palco = useRef();
  const [W, H] = FORMATOS[formato];
  const m = MODELOS[modelo];
  const cor = fundo || m.fundo;

  useEffect(() => {
    let vivo = true;
    (async () => {
      const K = await carregarKonva();
      if (!vivo || !caixa.current) return;
      const escala = Math.min(caixa.current.clientWidth / W, 620 / H);
      palco.current?.destroy();
      const st = new K.Stage({ container: caixa.current, width: W * escala, height: H * escala, scaleX: escala, scaleY: escala });
      palco.current = st;
      const camada = new K.Layer(); st.add(camada);
      camada.add(new K.Rect({ x: 0, y: 0, width: W, height: H, fill: cor }));
      const imagem = img ? await carregarImagem(img).catch(() => null) : null;
      const tr = new K.Transformer({ rotateEnabled: false, keepRatio: true });
      for (const c of m.camadas(W, H)) {
        if (c.tipo === 'caixa') camada.add(new K.Rect({ x: c.x, y: c.y, width: c.w, height: c.h, fill: c.cor, cornerRadius: c.raio, shadowBlur: 20, shadowOpacity: 0.15 }));
        if (c.tipo === 'imagem' && imagem) {
          let w = c.w, h = c.h, x = c.x, y = c.y;
          const r = imagem.width / imagem.height;
          const cobrir = c.ajuste === 'cobrir';
          if ((w / h > r) === cobrir) { h = w / r; y = c.y + (c.h - h) / 2; } else { w = h * r; x = c.x + (c.w - w) / 2; }
          const n = new K.Image({ image: imagem, x, y, width: w, height: h, draggable: true });
          if (cobrir) { const g = new K.Group({ clip: { x: c.x, y: c.y, width: c.w, height: c.h } }); g.add(n); camada.add(g); } else camada.add(n);
          n.on('click tap', () => tr.nodes([n]));
        }
        if (c.tipo === 'texto') {
          const t = new K.Text({ x: c.x, y: c.y, width: c.w, text: textos[c.id] || '', fontSize: c.tam, fontFamily: 'Inter, Arial, sans-serif', fontStyle: c.peso === '800' || c.peso === '700' ? 'bold' : 'normal',
            fill: c.cor, align: c.alinhar, lineHeight: 1.12, draggable: true });
          t.on('click tap', () => tr.nodes([t]));
          camada.add(t);
        }
      }
      camada.add(tr);
      st.on('click tap', (e) => { if (e.target === st || e.target.getClassName() === 'Rect') tr.nodes([]); });
    })();
    return () => { vivo = false; };
  }, [formato, modelo, textos, img, cor]);

  const exportar = () => {
    const st = palco.current; if (!st) return;
    st.find('Transformer').forEach((t) => t.nodes([]));
    const url = st.toDataURL({ pixelRatio: 1 / st.scaleX(), mimeType: 'image/png' });
    const a = document.createElement('a'); a.href = url; a.download = `criativo-${formato.replace(':', 'x')}.png`; a.click();
  };
  const enviar = (e) => { const f = e.target.files?.[0]; if (f) setImg(URL.createObjectURL(f)); };
  const buscarFotos = async (e) => { e.preventDefault(); try { setFotos(await api('/api/imagens?q=' + encodeURIComponent(busca))); } catch (err) { aviso(err.message); } };
  const removerFundo = async () => {
    if (!img) return;
    setOcupado('Removendo o fundo no navegador (baixa o modelo na primeira vez)…');
    try {
      const { removeBackground } = await import('https://esm.sh/@imgly/background-removal@1.6.0');
      const blob = await removeBackground(img);
      setImg(URL.createObjectURL(blob));
    } catch (err) { aviso('Não foi possível remover o fundo: ' + err.message); }
    setOcupado('');
  };
  return html`<div class="cab"><div><h1>Editor de criativo</h1><p>Monte um criativo estático a partir dos formatos que mais escalam. Clique num elemento para mover e redimensionar.</p></div>
      <button class="pri" onClick=${exportar}><${Ic} n="baixar" /> Baixar PNG ${W}×${H}</button></div>
    <div class="editor">
      <div class="editor-palco" ref=${caixa}></div>
      <div class="col-gap">
        <div class="painel-box"><div class="pb-corpo col-gap">
          <div class="campo">Formato<${Chips} opcoes=${Object.keys(FORMATOS).map((k) => [k, k + (k === '9:16' ? ' (Stories/Reels)' : k === '4:5' ? ' (Feed)' : '')])} valor=${formato} onTroca=${(v) => v && setFormato(v)} /></div>
          <div class="campo">Modelo<${Chips} opcoes=${Object.entries(MODELOS).map(([k, x]) => [k, x.nome])} valor=${modelo} onTroca=${(v) => v && setModelo(v)} /></div>
          <label class="campo">Texto principal<textarea value=${textos.titulo} onInput=${(e) => setTextos({ ...textos, titulo: e.target.value })} /></label>
          ${hooks.length ? html`<div class="campo">Hooks gerados<div class="chips">${hooks.slice(0, 10).map((h) => html`<button class="chip" onClick=${() => setTextos({ ...textos, titulo: h })} title=${h}>${h.slice(0, 40)}${h.length > 40 ? '…' : ''}</button>`)}</div></div>` : null}
          <label class="campo">Texto de apoio<input value=${textos.sub} onInput=${(e) => setTextos({ ...textos, sub: e.target.value })} /></label>
          <label class="campo">Cor de fundo<input type="color" value=${cor} onInput=${(e) => setFundo(e.target.value)} /></label>
        </div></div>
        <div class="painel-box"><div class="pb-cab"><h2>Imagem</h2></div><div class="pb-corpo col-gap">
          <label class="botao" style="cursor:pointer">Enviar imagem<input type="file" accept="image/*" onChange=${enviar} hidden /></label>
          <form class="linha" onSubmit=${buscarFotos}><input value=${busca} onInput=${(e) => setBusca(e.target.value)} placeholder="Buscar foto grátis (ex.: mulher pilates)" style="flex:1" /><button type="submit">Buscar</button></form>
          ${fotos ? (fotos.length ? html`<div class="fotos">${fotos.map((f) => html`<button type="button" onClick=${() => setImg(f.grande)} title=${f.autor}><img src=${f.mini} alt="" loading="lazy" /></button>`)}</div>` : html`<span class="mut peq">Nenhuma foto.</span>`) : null}
          ${img ? html`<button onClick=${removerFundo} disabled=${!!ocupado}>Remover fundo da imagem</button>` : null}
          ${ocupado ? html`<span class="mut peq">${ocupado}</span>` : null}
          <p class="mut peq" style="margin:0">Fotos do Pexels/Unsplash são grátis para anúncios. Use imagens suas ou licenciadas: nunca o criativo de outra pessoa.</p>
        </div></div>
      </div></div>`;
}
