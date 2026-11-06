// Página de vendas e quiz por modelagem: blocos editáveis, prévia ao vivo e exportação em HTML estático
// (o usuário hospeda onde quiser; nada é publicado na Vercel). Textos de checkout, order bump e upsell.
import { useState, useRef, useLayoutEffect as useEffect } from 'preact/hooks';
import { html, api, post, aviso, copiar, navegar, relativo } from '../base.mjs';
import { Ic, Abas, Vazio, Esqueleto } from '../ui.mjs';
import { resolver } from '../ia.mjs';

const NOMES_BLOCO = { hero: 'Topo (promessa)', dor: 'Dor', mecanismo: 'Mecanismo', beneficios: 'Benefícios', prova: 'Prova / depoimentos', oferta: 'Oferta', bonus: 'Bônus', garantia: 'Garantia', faq: 'Perguntas', cta: 'Chamada final' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Repassa os parâmetros de UTM da URL da página para o link do checkout (rastreamento da venda pela origem).
const SCRIPT_UTM = `<script>(function(){var q=location.search;if(!q)return;document.querySelectorAll('a[data-checkout]').forEach(function(a){a.href+=(a.href.indexOf('?')<0?'?':'&')+q.slice(1)})})()<\/script>`;
const CSS_BASE = (cor) => `*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,Arial,sans-serif;color:#111;line-height:1.55;background:#fff}
section{padding:44px 20px}.w{max-width:680px;margin:0 auto}h1{font-size:30px;line-height:1.15;margin:0 0 14px}h2{font-size:24px;line-height:1.2;margin:0 0 12px}
.b{display:block;text-align:center;background:${cor};color:#fff;text-decoration:none;font-weight:800;font-size:18px;padding:18px;border-radius:12px;margin-top:20px;box-shadow:0 8px 20px ${cor}55}
.alt{background:#f5f6f8}ul{padding-left:20px}li{margin:6px 0}.faq b{display:block;margin-top:12px}`;

export function htmlPagina(d) {
  const cor = d.cor || '#16a34a', link = esc(d.checkout || '#');
  const blocos = (d.blocos || []).map((b, i) => {
    const itens = b.itens?.length ? (b.tipo === 'faq' ? `<div class="faq">${b.itens.map((x) => { const [p, ...r] = String(x).split('?'); return `<b>${esc(p)}?</b><p>${esc(r.join('?').trim())}</p>`; }).join('')}</div>` : `<ul>${b.itens.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`) : '';
    const botao = b.botao ? `<a class="b" data-checkout href="${link}">${esc(b.botao)}</a>` : '';
    const t = b.tipo === 'hero' ? `<h1>${esc(b.titulo)}</h1>` : `<h2>${esc(b.titulo)}</h2>`;
    return `<section class="${i % 2 ? 'alt' : ''}"><div class="w">${t}${b.texto ? `<p>${esc(b.texto).replace(/\n/g, '<br>')}</p>` : ''}${itens}${botao}</div></section>`;
  }).join('\n');
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.titulo || d.produto || 'Página')}</title>
<style>${CSS_BASE(cor)}</style>${d.pixel ? `\n${d.pixel}` : ''}</head><body>${blocos}${SCRIPT_UTM}</body></html>`;
}

export function htmlQuiz(d) {
  const cor = d.cor || '#7c3aed', q = d.quiz || {};
  const dados = JSON.stringify({ perguntas: q.perguntas || [], resultado: q.resultado || {}, link: d.checkout || '#' }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(q.titulo || 'Quiz')}</title>
<style>${CSS_BASE(cor)}.bar{height:6px;background:#eee;border-radius:3px;overflow:hidden;margin-bottom:22px}.bar i{display:block;height:100%;background:${cor};transition:width .3s}
.op{display:block;width:100%;text-align:left;padding:16px;margin:10px 0;border:2px solid #e5e7eb;border-radius:12px;background:#fff;font-size:17px;cursor:pointer}.op:hover{border-color:${cor}}</style>${d.pixel ? `\n${d.pixel}` : ''}</head>
<body><section><div class="w" id="q"><h1>${esc(q.titulo)}</h1><p>${esc(q.subtitulo)}</p><a class="b" href="#" id="comecar">Começar</a></div></section>
<script>var D=${dados},i=0,el=document.getElementById('q');
function p(){if(i>=D.perguntas.length)return r();var x=D.perguntas[i];el.innerHTML='<div class="bar"><i style="width:'+(100*i/D.perguntas.length)+'%"></i></div><h2></h2>';el.querySelector('h2').textContent=x.pergunta;
x.opcoes.forEach(function(o){var b=document.createElement('button');b.className='op';b.textContent=o;b.onclick=function(){i++;p()};el.appendChild(b)})}
function r(){var R=D.resultado,q=location.search?((D.link.indexOf('?')<0?'?':'&')+location.search.slice(1)):'';el.innerHTML='<h2></h2><p></p><a class="b"></a>';el.querySelector('h2').textContent=R.titulo||'';el.querySelector('p').textContent=R.texto||'';var a=el.querySelector('a');a.textContent=R.botao||'Quero agora';a.href=D.link+q}
document.getElementById('comecar').onclick=function(e){e.preventDefault();p()};<\/script></body></html>`;
}

const baixar = (conteudo, nome) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conteudo], { type: 'text/html' })); a.download = nome; a.click(); };

export function TelaPaginas() {
  const [lista, setLista] = useState(null);
  useEffect(() => { Promise.all([api('/api/projetos?tipo=pagina'), api('/api/projetos?tipo=quiz')]).then(([a, b]) => setLista([...a, ...b].sort((x, y) => y.atualizado - x.atualizado))).catch(() => setLista([])); }, []);
  const novo = async (tipo) => { const r = await post('/api/projetos', { tipo, titulo: tipo === 'quiz' ? 'Novo quiz' : 'Nova página', dados: { cor: tipo === 'quiz' ? '#7c3aed' : '#16a34a' } }); navegar('/paginas/' + r.id); };
  if (!lista) return html`<${Esqueleto} />`;
  return html`<div class="cab"><div><h1>Página e quiz</h1><p>A IA usa só a estrutura da página de referência (ordem das seções e gatilhos) e escreve tudo novo. Exporte em HTML e hospede onde quiser.</p></div>
      ${lista.length ? html`<div class="linha"><button onClick=${() => novo('quiz')}>Criar quiz</button><button class="pri" onClick=${() => novo('pagina')}>Criar página de vendas</button></div>` : null}</div>
    ${lista.length ? html`<div class="grade-3">${lista.map((p) => html`<a class="painel-box passo" href=${'/paginas/' + p.id}><div><b>${p.titulo}</b><span class="mut peq">${p.tipo === 'quiz' ? 'quiz' : 'página de vendas'} · ${relativo(p.atualizado)}</span></div></a>`)}</div>`
      : html`<div class="painel-box vazio-acao"><b>Nenhuma página ainda</b><p class="mut">Crie uma página de vendas ou um quiz de pré-venda a partir de uma oferta escalada. A IA escreve o texto; você ajusta e baixa o HTML.</p>
          <div class="linha"><button class="pri" onClick=${() => novo('pagina')}>Criar página de vendas</button><button onClick=${() => novo('quiz')}>Criar quiz</button></div></div>`}`;
}

export function TelaPagina({ id }) {
  const [p, setP] = useState(null), [aba, setAba] = useState('conteudo'), [ocupado, setOcupado] = useState(''), [semIA, setSemIA] = useState(null), [colado, setColado] = useState('');
  const [sites, setSites] = useState([]);
  const t = useRef();
  useEffect(() => { api('/api/projetos/' + id).then((r) => setP(r.erro ? null : r)); api('/api/analises').then(setSites).catch(() => {}); }, [id]);
  if (!p) return html`<${Esqueleto} linhas=${8} />`;
  const d = p.dados, quiz = p.tipo === 'quiz';
  const mudar = (patch, titulo) => {
    const n = { ...p, titulo: titulo ?? p.titulo, dados: { ...d, ...patch } }; setP(n);
    clearTimeout(t.current); t.current = setTimeout(() => post('/api/projetos/' + id, { tipo: p.tipo, titulo: n.titulo, dados: n.dados }).catch((e) => aviso(e.message)), 600);
  };
  const ia = async (etapa, aplicar) => {
    setOcupado(etapa); setSemIA(null);
    try { const r = await resolver(await post('/api/projetos/ia', { tipo: p.tipo, etapa, dados: d })); if (r.semIA) setSemIA({ ...r, aplicar }); else aplicar(r.resultado); }
    catch (e) { aviso(e.message); } finally { setOcupado(''); }
  };
  const aplicarConteudo = (r) => (quiz ? mudar({ quiz: r }, r.titulo || p.titulo) : mudar({ blocos: r.blocos || [] }));
  const usarColado = () => { try { const j = JSON.parse(colado.match(/[[{][\s\S]*[\]}]/)?.[0] || colado); semIA.aplicar(j); setSemIA(null); setColado(''); } catch { aviso('Cole exatamente o JSON que a IA devolveu'); } };
  const blocos = d.blocos || [];
  const mudarBloco = (i, patch) => mudar({ blocos: blocos.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const mover = (i, k) => { const n = [...blocos]; const [b] = n.splice(i, 1); n.splice(i + k, 0, b); mudar({ blocos: n }); };
  const arquivo = quiz ? htmlQuiz(d) : htmlPagina(d);
  return html`<div class="cab"><div><div class="migalha"><a href="/paginas">Página e quiz</a> / ${p.titulo}</div><input class="titulo-edit" value=${p.titulo} onInput=${(e) => mudar({}, e.target.value)} aria-label="Nome" /></div>
      <div class="linha"><button onClick=${() => copiar(arquivo)}><${Ic} n="copiar" /> Copiar HTML</button><button class="pri" onClick=${() => baixar(arquivo, (quiz ? 'quiz' : 'pagina') + '.html')}><${Ic} n="baixar" /> Baixar HTML</button></div></div>
    <${Abas} abas=${[['briefing', 'Briefing'], ['conteudo', quiz ? 'Perguntas' : 'Blocos'], ['textos', 'Checkout, bump e upsell'], ['previa', 'Prévia']]} ativa=${aba} onTroca=${setAba} />
    ${semIA ? html`<div class="painel-box" style="margin-bottom:12px"><div class="pb-cab"><b>Sem IA no servidor: copie, cole no ChatGPT/Gemini e cole a resposta</b><button class="bt-p" onClick=${() => copiar(semIA.prompt)}><${Ic} n="copiar" /> Copiar prompt</button></div>
      <div class="pb-corpo col-gap"><pre class="prompt">${semIA.prompt}</pre><textarea value=${colado} onInput=${(e) => setColado(e.target.value)} placeholder="Cole aqui a resposta (JSON)" />
        <button class="pri" style="width:fit-content" onClick=${usarColado} disabled=${!colado.trim()}>Usar esta resposta</button></div></div>` : null}
    ${aba === 'briefing' ? html`<div class="painel-box"><div class="pb-corpo col-gap">
      <label class="campo">Produto<input value=${d.produto || ''} onInput=${(e) => mudar({ produto: e.target.value })} /></label>
      <label class="campo">Público<input value=${d.publico || ''} onInput=${(e) => mudar({ publico: e.target.value })} /></label>
      <label class="campo">Promessa<input value=${d.promessa || ''} onInput=${(e) => mudar({ promessa: e.target.value })} /></label>
      <div class="form-grade"><label class="campo">Preço<input value=${d.preco || ''} onInput=${(e) => mudar({ preco: e.target.value })} placeholder="R$ 19,90" /></label>
        <label class="campo">Cor principal<input type="color" value=${d.cor || '#16a34a'} onInput=${(e) => mudar({ cor: e.target.value })} /></label></div>
      <label class="campo">Link do checkout (as UTMs da página são repassadas sozinhas)<input value=${d.checkout || ''} onInput=${(e) => mudar({ checkout: e.target.value })} placeholder="https://pay.kiwify.com.br/..." /></label>
      <label class="campo">Página de referência (estrutura analisada)<select value=${d.referencia || ''} onChange=${(e) => mudar({ referencia: e.target.value })}><option value="">Nenhuma</option>${sites.map((s) => html`<option value=${s.dominio}>${s.dominio} · ${s.titulo || ''}</option>`)}</select></label>
      <label class="campo">Código do pixel (opcional: cole o script da Meta)<textarea value=${d.pixel || ''} onInput=${(e) => mudar({ pixel: e.target.value })} placeholder="<!-- Meta Pixel Code --> ..." /></label>
      <button class="pri" style="width:fit-content" onClick=${() => { setAba('conteudo'); ia('gerar', aplicarConteudo); }} disabled=${!!ocupado}>${ocupado ? 'Gerando…' : quiz ? 'Gerar quiz com IA' : 'Gerar página com IA'}</button></div></div>` : null}
    ${aba === 'conteudo' && !quiz ? html`<div class="col-gap">${blocos.length ? blocos.map((b, i) => html`<div class="painel-box"><div class="pb-cab"><div class="linha"><span class="tag">${NOMES_BLOCO[b.tipo] || b.tipo}</span></div>
        <div class="linha"><button class="bt-ic" disabled=${i === 0} onClick=${() => mover(i, -1)} title="Subir">↑</button><button class="bt-ic" disabled=${i === blocos.length - 1} onClick=${() => mover(i, 1)} title="Descer">↓</button>
          <button class="bt-ic" title="Remover" onClick=${() => mudar({ blocos: blocos.filter((_, j) => j !== i) })}><${Ic} n="fechar" /></button></div></div>
      <div class="pb-corpo col-gap"><input value=${b.titulo || ''} onInput=${(e) => mudarBloco(i, { titulo: e.target.value })} placeholder="Título" />
        <textarea value=${b.texto || ''} onInput=${(e) => mudarBloco(i, { texto: e.target.value })} placeholder="Texto" />
        <textarea value=${(b.itens || []).join('\n')} onInput=${(e) => mudarBloco(i, { itens: e.target.value.split('\n').filter(Boolean) })} placeholder="Itens (um por linha)" style="min-height:60px" />
        ${['hero', 'oferta', 'cta'].includes(b.tipo) ? html`<input value=${b.botao || ''} onInput=${(e) => mudarBloco(i, { botao: e.target.value })} placeholder="Texto do botão" />` : null}</div></div>`)
      : html`<${Vazio} titulo="Página vazia" texto="Preencha o briefing e gere com IA, ou adicione blocos à mão." />`}
      <div class="linha"><select id="novoBloco">${Object.entries(NOMES_BLOCO).map(([k, n]) => html`<option value=${k}>${n}</option>`)}</select>
        <button onClick=${() => mudar({ blocos: [...blocos, { tipo: document.getElementById('novoBloco').value, titulo: '', texto: '', itens: [] }] })}><${Ic} n="mais" /> Bloco</button></div></div>` : null}
    ${aba === 'conteudo' && quiz ? html`<${EditorQuiz} q=${d.quiz || { perguntas: [], resultado: {} }} onMudar=${(quizN) => mudar({ quiz: quizN })} />` : null}
    ${aba === 'textos' ? html`<div class="painel-box"><div class="pb-cab"><h2>Checkout, order bumps, upsell e e-mail de entrega</h2><button onClick=${() => ia('textos', (r) => mudar({ textos: r }))} disabled=${!!ocupado}>${ocupado === 'textos' ? 'Gerando…' : 'Gerar com IA'}</button></div>
      <div class="pb-corpo">${d.textos ? html`<pre class="prompt">${JSON.stringify(d.textos, null, 2)}</pre><button class="bt-p" onClick=${() => copiar(JSON.stringify(d.textos, null, 2))}><${Ic} n="copiar" /> Copiar tudo</button>`
        : html`<p class="mut">Títulos e selos do checkout, 4 order bumps, upsell, downsell e e-mail de entrega, prontos para colar no gateway.</p>`}</div></div>` : null}
    ${aba === 'previa' ? html`<div class="previa"><iframe title="Prévia" sandbox="allow-scripts" srcdoc=${arquivo}></iframe></div>` : null}`;
}

function EditorQuiz({ q, onMudar }) {
  const ps = q.perguntas || [];
  const mudarP = (i, patch) => onMudar({ ...q, perguntas: ps.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  return html`<div class="col-gap"><div class="painel-box"><div class="pb-corpo col-gap">
      <input value=${q.titulo || ''} onInput=${(e) => onMudar({ ...q, titulo: e.target.value })} placeholder="Título do quiz" />
      <input value=${q.subtitulo || ''} onInput=${(e) => onMudar({ ...q, subtitulo: e.target.value })} placeholder="Subtítulo" /></div></div>
    ${ps.map((x, i) => html`<div class="painel-box"><div class="pb-cab"><b class="peq">Pergunta ${i + 1}</b><button class="bt-ic" onClick=${() => onMudar({ ...q, perguntas: ps.filter((_, j) => j !== i) })}><${Ic} n="fechar" /></button></div>
      <div class="pb-corpo col-gap"><input value=${x.pergunta} onInput=${(e) => mudarP(i, { pergunta: e.target.value })} />
        <textarea value=${(x.opcoes || []).join('\n')} onInput=${(e) => mudarP(i, { opcoes: e.target.value.split('\n').filter(Boolean) })} placeholder="Opções (uma por linha)" style="min-height:70px" /></div></div>`)}
    <button style="width:fit-content" onClick=${() => onMudar({ ...q, perguntas: [...ps, { pergunta: 'Nova pergunta', opcoes: ['Sim', 'Não'] }] })}><${Ic} n="mais" /> Pergunta</button>
    <div class="painel-box"><div class="pb-cab"><b>Resultado</b></div><div class="pb-corpo col-gap">
      <input value=${q.resultado?.titulo || ''} onInput=${(e) => onMudar({ ...q, resultado: { ...q.resultado, titulo: e.target.value } })} placeholder="Título do resultado" />
      <textarea value=${q.resultado?.texto || ''} onInput=${(e) => onMudar({ ...q, resultado: { ...q.resultado, texto: e.target.value } })} placeholder="Texto do resultado" />
      <input value=${q.resultado?.botao || ''} onInput=${(e) => onMudar({ ...q, resultado: { ...q.resultado, botao: e.target.value } })} placeholder="Texto do botão para o checkout" /></div></div></div>`;
}
