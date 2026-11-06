// Busca ao vivo: ao escolher um nicho ou digitar um termo, o robô começa a buscar na hora e a lista
// se atualiza sozinha enquanto ele trabalha. Sem botão para pedir: escolher já é o pedido.
import { useState, useLayoutEffect as useEffect, useRef } from 'preact/hooks';
import { html, api, post, loja, relativo, nomePais } from './base.mjs';

// Lembra o que já foi pedido nesta sessão (por 15 min) para não pedir o mesmo de novo ao voltar à tela.
const pedidos = new Map();
const JANELA = 15 * 60 * 1000;

export function FocoBusca({ nicho, termo, onAtualizar, onEstado, automatico = true, forcar = true }) {
  const [st, setSt] = useState(null);
  const pais = loja.pais, alvo = termo ? { termo } : { nicho }, nome = termo ? `"${termo}"` : nicho;
  const chave = (termo ? 't:' + termo.toLowerCase() : 'n:' + nicho) + '|' + pais;
  const tAtualizar = useRef(0), eraRodando = useRef(false);
  useEffect(() => {
    if (!nicho && !termo) return;
    let vivo = true, timer;
    setSt(null);
    const qs = new URLSearchParams({ ...alvo, pais }).toString();
    const ciclo = async () => {
      let r; try { r = await api('/api/foco?' + qs); } catch { r = null; }
      if (!vivo) return;
      if (r) {
        setSt((s) => ({ ...s, ...r }));
        onEstado?.(r.rodando);
        // enquanto o robô trabalha, a lista recarrega a cada ~8 s; ao terminar, uma última vez
        if (r.rodando && Date.now() - tAtualizar.current > 8000) { tAtualizar.current = Date.now(); onAtualizar?.(); }
        if (eraRodando.current && !r.rodando) onAtualizar?.();
        eraRodando.current = r.rodando;
      }
      timer = setTimeout(ciclo, r?.rodando ? 3000 : 20000);
    };
    (async () => {
      if (automatico && !(Date.now() - (pedidos.get(chave) || 0) < JANELA)) {
        try { const r = await post('/api/foco', { ...alvo, pais, forcar }); if (vivo) { setSt(r); onEstado?.(r.rodando); } pedidos.set(chave, Date.now()); }
        catch (e) { if (vivo) setSt({ erro: e.message }); }
      }
      if (vivo) ciclo();
    })();
    return () => { vivo = false; clearTimeout(timer); onEstado?.(false); };
  }, [nicho, termo, pais]);
  if ((!nicho && !termo) || !st) return null;
  if (st.erro) return html`<div class="foco" role="status"><span class="mut">Não deu para buscar ${nome} agora: ${st.erro}.</span></div>`;
  const ultimaLinha = (st.log || []).filter((l) => !/^\s*$/.test(l)).slice(-1)[0] || '';
  if (st.rodando) return html`<div class="foco ao-vivo" role="status"><span class="ponto vivo"></span>
    <div><b>Buscando ${nome} agora em ${nomePais(pais)}</b>
      <div class="mut peq">${st.status === 'pendente' ? (/Na fila/.test(ultimaLinha) ? ultimaLinha : st.viva ? 'O robô já está acordado: começando.' : 'Acordando o robô (cerca de 1 minuto).') : ultimaLinha.replace(/^[>\s]+/, '').trim() || 'Começando.'}</div>
      <div class="mut peq">As ofertas novas aparecem abaixo sozinhas, sem recarregar.</div></div></div>`;
  return html`<div class="foco foco-quieto" role="status"><span class="ponto"></span><span><b>${nome}</b> <span class="mut peq">${st.ultimaBusca ? `atualizado ${relativo(st.ultimaBusca)}` : 'o robô ainda não encontrou nada aqui'}</span></span></div>`;
}

// Nome antigo, usado no Início (lá a busca só roda se a última tiver mais de 6 h).
export const FocoNicho = (p) => html`<${FocoBusca} ...${p} />`;
