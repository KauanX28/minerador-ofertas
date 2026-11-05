// Boas-vindas em 3 passos: nichos, país e nível. Define os filtros padrão do painel.
import { useState } from 'preact/hooks';
import { html, loja, definir, post, navegar, PAISES, aviso } from '../base.mjs';
import { Chips } from '../ui.mjs';

const NIVEIS = [['iniciante', 'Estou começando', 'Mostra dicas em cada tela e o passo a passo do método.'],
  ['vendendo', 'Já vendo', 'Foco em ofertas acelerando e em oportunidades para modelar.'],
  ['avancado', 'Escalo com tráfego', 'Mostra todos os filtros e dados avançados.']];

export function BoasVindas() {
  const p = loja.perfil || {};
  const [passo, setPasso] = useState(1);
  const [nichos, setNichos] = useState(p.nichos || []);
  const [pais, setPais] = useState(p.pais || loja.pais || 'BR');
  const [nivel, setNivel] = useState(p.nivel || 'iniciante');
  const todos = Object.keys(loja.config?.nichos || {});
  const concluir = async () => {
    const perfil = { nichos, pais, nivel, concluido: true };
    await post('/api/prefs', perfil);
    localStorage.paisAtual = pais;
    definir({ perfil, pais });
    aviso('Tudo pronto. Estas são as ofertas para você.');
    navegar('/', { trocar: true });
  };
  return html`<div class="boas-vindas">
    <div class="bv-passos" aria-label="Progresso">${[1, 2, 3].map((n) => html`<span class=${n <= passo ? 'on' : ''}>${n}</span>`)}</div>
    ${passo === 1 ? html`<div class="painel-box"><div class="pb-corpo">
      <h1>Quais nichos te interessam?</h1><p class="mut">Escolha quantos quiser. Dá para mudar depois. Se não souber, pule: mostramos todos.</p>
      <${Chips} opcoes=${todos.map((n) => [n, n])} valor=${nichos} onTroca=${setNichos} multi />
      <div class="bv-rod"><button class="fantasma" onClick=${() => { setNichos([]); setPasso(2); }}>Pular</button><button class="pri" onClick=${() => setPasso(2)}>Continuar</button></div></div></div>` : null}
    ${passo === 2 ? html`<div class="painel-box"><div class="pb-corpo">
      <h1>Em qual país você vai vender?</h1><p class="mut">Cada país tem seus próprios dados: ofertas do Brasil nunca se misturam com as do México.</p>
      <select value=${pais} onChange=${(e) => setPais(e.target.value)} class="grande">${PAISES.map(([c, n]) => html`<option value=${c}>${n}</option>`)}</select>
      <div class="bv-rod"><button class="fantasma" onClick=${() => setPasso(1)}>Voltar</button><button class="pri" onClick=${() => setPasso(3)}>Continuar</button></div></div></div>` : null}
    ${passo === 3 ? html`<div class="painel-box"><div class="pb-corpo">
      <h1>Qual é o seu momento?</h1><p class="mut">Ajusta o que aparece primeiro.</p>
      <div class="bv-niveis">${NIVEIS.map(([k, t, d]) => html`<button type="button" class=${'bv-nivel' + (nivel === k ? ' on' : '')} aria-pressed=${nivel === k} onClick=${() => setNivel(k)}><b>${t}</b><span class="mut peq">${d}</span></button>`)}</div>
      <div class="bv-rod"><button class="fantasma" onClick=${() => setPasso(2)}>Voltar</button><button class="pri" onClick=${concluir}>Ver minhas ofertas</button></div></div></div>` : null}
  </div>`;
}
