// Foco em tempo real: ao escolher um nicho, o robô começa a buscar ofertas dele na hora (se não buscou nas
// últimas 6 h) e a lista do painel se atualiza sozinha enquanto ele trabalha.
import { useState, useLayoutEffect as useEffect, useRef } from 'preact/hooks';
import { html, api, post, loja, relativo, nomePais } from './base.mjs';

const disparados = new Set(); // não pede o mesmo nicho duas vezes na mesma sessão

export function FocoNicho({ nicho, onAtualizar, onEstado, automatico = true }) {
  const [st, setSt] = useState(null), [enviando, setEnviando] = useState(false);
  const pais = loja.pais, chave = nicho + '|' + pais;
  const tAtualizar = useRef(0), eraRodando = useRef(false);
  const pedir = async (forcar) => {
    setEnviando(true);
    try { const r = await post('/api/foco', { nicho, pais, forcar }); setSt(r); disparados.add(chave); } catch (e) { setSt({ erro: e.message }); }
    setEnviando(false);
  };
  useEffect(() => {
    if (!nicho) return;
    let vivo = true, timer;
    const ciclo = async () => {
      let r; try { r = await api(`/api/foco?nicho=${encodeURIComponent(nicho)}&pais=${pais}`); } catch { r = null; }
      if (!vivo) return;
      if (r) {
        setSt((s) => ({ ...s, ...r }));
        onEstado?.(r.rodando);
        // enquanto o robô trabalha, a lista recarrega a cada ~12 s; ao terminar, uma última vez
        if (r.rodando && Date.now() - tAtualizar.current > 12000) { tAtualizar.current = Date.now(); onAtualizar?.(); }
        if (eraRodando.current && !r.rodando) onAtualizar?.();
        eraRodando.current = r.rodando;
      }
      timer = setTimeout(ciclo, r?.rodando ? 4000 : 20000);
    };
    (async () => {
      if (automatico && !disparados.has(chave)) await pedir(false);
      ciclo();
    })();
    return () => { vivo = false; clearTimeout(timer); };
  }, [nicho, pais]);
  if (!nicho || !st) return null;
  if (st.erro) return html`<div class="foco"><span class="mut">${st.erro}</span></div>`;
  const ultimaLinha = (st.log || []).filter((l) => !/^\s*$/.test(l)).slice(-1)[0] || '';
  if (st.rodando) return html`<div class="foco ao-vivo"><span class="ponto vivo"></span>
    <div><b>Ao vivo: buscando ofertas de ${nicho} em ${nomePais(pais)}</b>
      <div class="mut peq">${st.status === 'pendente' ? (/Na fila/.test(ultimaLinha) ? ultimaLinha : st.viva ? 'O robô já está acordado: começando…' : 'Acordando o robô na nuvem (cerca de 1 minuto)…') : ultimaLinha.trim() || 'Começando…'}</div>
      <div class="mut peq">A lista abaixo se atualiza sozinha enquanto ele trabalha.</div></div></div>`;
  return html`<div class="foco"><div><b>${nicho}</b> <span class="mut peq">${st.ultimaBusca ? `buscado ${relativo(st.ultimaBusca)}` : 'ainda não buscado neste país'}</span>
      ${st.aviso && !st.iniciado ? html`<div class="mut peq">${st.aviso}</div>` : null}</div>
    <button class="bt-p" onClick=${() => pedir(true)} disabled=${enviando}>${enviando ? 'Pedindo…' : 'Buscar de novo agora'}</button></div>`;
}
