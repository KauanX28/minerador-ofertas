// Configurações com gerenciador visual de nichos (palavras por idioma), bloqueio e rotina do robô.
import { useState } from 'preact/hooks';
import { html, loja, definir, post, aviso, PAISES } from '../base.mjs';
import { Ic, Chips } from '../ui.mjs';
import { chaves, temWebGPU } from '../ia.mjs';
import { PainelAlertas, PainelExtensao } from './alertas.mjs';
import { useDados } from '../base.mjs';

const IDIOMAS = [['pt', 'Português'], ['es', 'Espanhol'], ['en', 'Inglês']];
const normalizar = (v) => (Array.isArray(v) ? { pt: v } : { ...v });

function ListaPalavras({ palavras, onTroca, placeholder }) {
  const [nova, setNova] = useState('');
  const add = () => { const ps = nova.split(',').map((s) => s.trim()).filter((s) => s && !palavras.includes(s)); if (ps.length) onTroca([...palavras, ...ps]); setNova(''); };
  return html`<div class="chips editaveis">${palavras.map((p) => html`<span class="chip on">${p}<button type="button" aria-label=${'Remover ' + p} onClick=${() => onTroca(palavras.filter((x) => x !== p))}>×</button></span>`)}
    <input value=${nova} onInput=${(e) => setNova(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} onBlur=${add} placeholder=${placeholder || '+ palavra (Enter)'} /></div>`;
}

// IA grátis: o que o servidor tem e as chaves que ficam só neste navegador.
function PainelIA() {
  const est = useDados('/api/ia/estado');
  const [g, setG] = useState(chaves.gemini), [q, setQ] = useState(chaves.groq);
  const p = est.dados?.provedores || {};
  return html`<div class="painel-box"><div class="pb-cab"><h2>IA (grátis)</h2></div><div class="pb-corpo col-gap">
    <div class="peq">No servidor: Gemini ${p.gemini ? '✓' : '—'} · Groq ${p.groq ? '✓' : '—'} ${!p.gemini && !p.groq ? html`<span class="mut">(configure GEMINI_API_KEY ou GROQ_API_KEY; veja o README)</span>` : null}</div>
    <p class="mut peq" style="margin:0">Ou salve sua própria chave grátis aqui. Ela fica só neste navegador e é usada quando o servidor não tem IA.
      Pegue em <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a> ou <a href="https://console.groq.com/keys" target="_blank" rel="noopener">Groq</a>, sem cartão.</p>
    <div class="form-grade"><label class="campo">Chave do Gemini<input type="password" value=${g} onInput=${(e) => setG(e.target.value)} autocomplete="off" /></label>
      <label class="campo">Chave do Groq<input type="password" value=${q} onInput=${(e) => setQ(e.target.value)} autocomplete="off" /></label></div>
    <div class="linha"><button onClick=${() => { chaves.gemini = g.trim(); chaves.groq = q.trim(); aviso('Chaves salvas neste navegador'); }}>Salvar chaves no navegador</button>
      <span class="mut peq">${temWebGPU() ? 'Seu navegador também roda um modelo local (WebGPU).' : ''}</span></div>
    <p class="mut peq" style="margin:0">${est.dados?.aviso || ''}</p></div></div>`;
}

export function TelaConfig() {
  const { gateways, nuvem, ...base } = loja.config;
  const [c, setC] = useState(JSON.parse(JSON.stringify({ ...base, nichos: Object.fromEntries(Object.entries(base.nichos).map(([k, v]) => [k, normalizar(v)])) })));
  const [aberto, setAberto] = useState(Object.keys(c.nichos)[0] || ''), [lang, setLang] = useState('pt'), [novoNicho, setNovoNicho] = useState(''), [sujo, setSujo] = useState(false);
  const mudar = (patch) => { setC({ ...c, ...patch }); setSujo(true); };
  const rot = c.rotina || {};
  const mudarRot = (patch) => mudar({ rotina: { ...rot, ...patch } });
  const salvar = async () => {
    const nichos = Object.fromEntries(Object.entries(c.nichos).filter(([, v]) => Object.values(v).some((l) => l.length)));
    if (!Object.keys(nichos).length) return aviso('Deixe pelo menos um nicho com palavras');
    const nova = { ...c, nichos };
    await post('/api/config', nova);
    definir({ config: { ...loja.config, ...nova } });
    setSujo(false); aviso('Configurações salvas');
  };
  const num = (rotulo, valor, onChange, dica) => html`<label class="campo">${rotulo}<input type="number" value=${valor} onInput=${(e) => onChange(Number(e.target.value))} />${dica ? html`<small class="mut">${dica}</small>` : null}</label>`;
  return html`
    <div class="cab"><div><h1>Configurações</h1><p>Nichos que o robô minera, o que ignorar e a rotina automática.</p></div>
      <button class="pri" onClick=${salvar} disabled=${!sujo}>${sujo ? 'Salvar alterações' : 'Tudo salvo'}</button></div>
    <div class="grade-config">
      <div class="painel-box"><div class="pb-cab"><h2>Nichos e palavras-chave</h2><span class="mut peq">${Object.keys(c.nichos).length} nichos</span></div>
        <div class="nichos">
          <div class="nichos-lista">${Object.keys(c.nichos).map((n) => html`<button class=${n === aberto ? 'ativo' : ''} onClick=${() => setAberto(n)}>${n}<small class="mut">${Object.values(c.nichos[n]).flat().length}</small></button>`)}
            <form class="nicho-novo" onSubmit=${(e) => { e.preventDefault(); const n = novoNicho.trim(); if (!n || c.nichos[n]) return; mudar({ nichos: { ...c.nichos, [n]: { pt: [], es: [], en: [] } } }); setAberto(n); setNovoNicho(''); }}>
              <input value=${novoNicho} onInput=${(e) => setNovoNicho(e.target.value)} placeholder="+ novo nicho" aria-label="Novo nicho" /></form></div>
          ${aberto && c.nichos[aberto] ? html`<div class="nicho-edit">
            <div class="linha" style="justify-content:space-between"><b>${aberto}</b><button class="fantasma peq" onClick=${() => { const { [aberto]: _, ...resto } = c.nichos; mudar({ nichos: resto }); setAberto(Object.keys(resto)[0] || ''); }}>Excluir nicho</button></div>
            <p class="mut peq">Cada país é buscado no idioma dele: Brasil e Portugal em português, América Latina e Espanha em espanhol, EUA e Reino Unido em inglês.</p>
            <div class="abas">${IDIOMAS.map(([k, n]) => html`<button class=${k === lang ? 'ativo' : ''} onClick=${() => setLang(k)}>${n} <small class="mut">${(c.nichos[aberto][k] || []).length}</small></button>`)}</div>
            <${ListaPalavras} palavras=${c.nichos[aberto][lang] || []} onTroca=${(ps) => mudar({ nichos: { ...c.nichos, [aberto]: { ...c.nichos[aberto], [lang]: ps } } })} />
          </div>` : null}</div></div>
      <div class="col-gap">
        <div class="painel-box"><div class="pb-cab"><h2>Low ticket</h2></div><div class="pb-corpo"><div class="form-grade">
          ${num('Preço máximo de low ticket (R$)', c.precoMaxLowTicket ?? 97, (v) => mudar({ precoMaxLowTicket: v }))}
          ${num('Filtro de preço padrão (R$)', c.precoMaxFiltro ?? 47, (v) => mudar({ precoMaxFiltro: v }))}</div></div></div>
        <${PainelAlertas} config=${c} mudar=${mudar} />
        <${PainelIA} />
        <${PainelExtensao} />
        <div class="painel-box"><div class="pb-cab"><h2>Anunciantes ignorados</h2></div><div class="pb-corpo">
          <p class="mut peq" style="margin-top:0">Marcas e apps que aparecem em toda busca e não são ofertas para modelar. Vale nome ou site. Aplica na próxima rodada do robô.</p>
          <${ListaPalavras} palavras=${c.bloqueio || []} onTroca=${(b) => mudar({ bloqueio: b })} placeholder="+ marca ou site" /></div></div>
        <div class="painel-box"><div class="pb-cab"><h2>Rotina automática</h2><span class="mut peq">${nuvem ? '4x por dia no GitHub Actions' : 'modo local'}</span></div><div class="pb-corpo col-gap">
          <div class="form-grade">${num('Minutos por rodada', rot.minutosPorRodada ?? 40, (v) => mudarRot({ minutosPorRodada: v }))}
            ${num('Anunciantes recontados', rot.paginasParaAtualizar ?? 35, (v) => mudarRot({ paginasParaAtualizar: v }))}
            ${num('Top de cada nicho recontado', rot.topPorNicho ?? 15, (v) => mudarRot({ topPorNicho: v }))}
            ${num('Anúncios lidos por gateway', rot.maxPorGateway ?? 120, (v) => mudarRot({ maxPorGateway: v }))}
            ${num('Analisar site a partir de (anúncios)', c.minAnunciosParaAnalisar ?? 8, (v) => mudar({ minAnunciosParaAnalisar: v }))}
            ${num('Anúncios lidos por palavra', c.maxAnunciosPorPalavra ?? 80, (v) => mudar({ maxAnunciosPorPalavra: v }))}</div>
          <div class="campo">Países no rodízio<${Chips} opcoes=${PAISES.map(([k]) => [k, k])} valor=${rot.paises || ['BR']} onTroca=${(paises) => mudarRot({ paises })} multi /></div>
          <div class="campo">Gateways no rodízio<${Chips} opcoes=${gateways.map((g) => [g.id, g.nome])} valor=${rot.gateways || gateways.filter((g) => g.regiao === 'BR').map((g) => g.id)} onTroca=${(gws) => mudarRot({ gateways: gws })} multi /></div>
        </div></div>
      </div></div>`;
}
