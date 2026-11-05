// Roda na Biblioteca de Anúncios: agrupa os anúncios visíveis por anunciante, soma as variações (o "X anúncios usam
// este criativo"), e mostra um painel com "Salvar no Minerador", "Abrir no painel" e "Analisar site".
(() => {
  const RE_ID = /(Identificação da biblioteca|ID da biblioteca|Library ID|Identificador de la biblioteca|ID de la biblioteca)\s*:?\s*(\d{6,})/i;
  const RE_DUP = /(\d+)\s+(anúncios? usam|ads use|anuncios usan)/i;
  let cfg = { url: '', chave: '' };
  chrome.storage.sync.get(['url', 'chave'], (v) => { cfg = { url: v.url || '', chave: v.chave || '' }; });

  const pais = () => new URL(location.href).searchParams.get('country') || '';
  const idDaPagina = (href) => { try { const u = new URL(href); return u.searchParams.get('id') || (u.pathname.match(/^\/(\d{6,})\/?$/) || [])[1] || null; } catch { return null; } };
  const dominioDe = (href) => { try { const u = new URL(href); const real = u.hostname.endsWith('l.facebook.com') ? new URL(u.searchParams.get('u')) : u; return real.hostname.replace(/^www\./, ''); } catch { return null; } };

  function cartoes() {
    const vistos = new Set(), lista = [];
    for (const el of document.querySelectorAll('span, div')) {
      if (el.childElementCount > 0) continue;
      const m = (el.textContent || '').match(RE_ID);
      if (!m || vistos.has(m[2])) continue;
      vistos.add(m[2]);
      let card = el;
      for (let i = 0; i < 12 && card; i++) { card = card.parentElement; if (card && card.querySelector('a[href*="facebook.com/"]:not([href*="ads/library"])') && card.offsetHeight > 250) break; }
      if (!card) continue;
      const anunciante = [...card.querySelectorAll('a[href*="facebook.com/"]')].find((a) => !/ads\/library|l\.facebook\.com/.test(a.href) && a.textContent.trim().length > 1);
      const destino = card.querySelector('a[href*="l.facebook.com/l.php"]');
      const dup = Number((card.textContent.match(RE_DUP) || [])[1] || 1);
      lista.push({ adId: m[2], nome: anunciante?.textContent.trim() || '?', href: anunciante?.href || '', pageId: anunciante ? idDaPagina(anunciante.href) : null, dup, dominio: destino ? dominioDe(destino.href) : null, card });
    }
    return lista;
  }

  async function chamar(caminho, corpo) {
    if (!cfg.url || !cfg.chave) { alert('Configure o endereço do painel e a chave nas opções da extensão (clique no ícone).'); return null; }
    const r = await fetch(cfg.url + caminho, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Chave': cfg.chave }, body: JSON.stringify(corpo) });
    return r.json();
  }
  const abrir = (caminho) => cfg.url ? window.open(cfg.url + caminho, '_blank') : alert('Configure o endereço do painel nas opções da extensão.');

  function botao(txt, fn, pri) { const b = document.createElement('button'); b.textContent = txt; b.className = 'mnr-bt' + (pri ? ' mnr-pri' : ''); b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); fn(b); }; return b; }

  function desenhar() {
    const lista = cartoes();
    const grupos = new Map();
    for (const c of lista) {
      const k = c.pageId || c.nome;
      if (!grupos.has(k)) grupos.set(k, { ...c, anuncios: 0, variacoes: 0, dominios: {} });
      const g = grupos.get(k); g.anuncios++; g.variacoes += c.dup; if (c.dominio) g.dominios[c.dominio] = (g.dominios[c.dominio] || 0) + 1;
      // selo no próprio card
      if (!c.card.querySelector('.mnr-selo')) { const s = document.createElement('div'); s.className = 'mnr-selo'; c.card.style.position ||= 'relative'; c.card.appendChild(s); }
    }
    for (const c of lista) { const g = grupos.get(c.pageId || c.nome); c.card.querySelector('.mnr-selo').textContent = `${g.anuncios} na tela · ${g.variacoes} variações`; }
    let painel = document.getElementById('mnr-painel');
    if (!painel) { painel = document.createElement('div'); painel.id = 'mnr-painel'; document.body.appendChild(painel); }
    const ordenados = [...grupos.values()].sort((a, b) => b.variacoes - a.variacoes).slice(0, 15);
    painel.innerHTML = `<div class="mnr-cab"><b>Minerador</b><span>${lista.length} anúncios na tela</span><button class="mnr-x" title="Minimizar">–</button></div><div class="mnr-lista"></div>`;
    painel.querySelector('.mnr-x').onclick = () => painel.classList.toggle('mnr-min');
    const corpo = painel.querySelector('.mnr-lista');
    for (const g of ordenados) {
      const dom = Object.entries(g.dominios).sort((a, b) => b[1] - a[1])[0]?.[0];
      const linha = document.createElement('div'); linha.className = 'mnr-linha';
      linha.innerHTML = `<div class="mnr-nome"></div><div class="mnr-num">${g.variacoes} var. · ${g.anuncios} anúncios</div><div class="mnr-acoes"></div>`;
      linha.querySelector('.mnr-nome').textContent = g.nome;
      const acoes = linha.querySelector('.mnr-acoes');
      if (g.pageId) acoes.appendChild(botao('Salvar', async (b) => { const r = await chamar('/api/extensao/salvar', { page_id: g.pageId, nome: g.nome, pais: pais(), anuncios: g.anuncios }); b.textContent = r?.ok ? 'Salvo ✓' : 'Erro'; if (r?.erro) alert(r.erro); }, true));
      acoes.appendChild(botao(g.pageId ? 'Abrir' : 'Buscar', () => abrir(g.pageId ? '/oferta/' + g.pageId : '/ofertas?tipo=&busca=' + encodeURIComponent(g.nome))));
      if (dom) acoes.appendChild(botao('Analisar site', () => abrir('/site/' + encodeURIComponent(dom))));
      corpo.appendChild(linha);
    }
    // Página de um anunciante (todos os anúncios dele): total de resultados e salvar com a contagem.
    const pid = new URL(location.href).searchParams.get('view_all_page_id');
    if (pid) {
      const total = Number(((document.body.innerText.match(/~?\s?([\d.]+)\s+(resultados?|results)/i) || [])[1] || '').replace(/\./g, '')) || null;
      const topo = document.createElement('div'); topo.className = 'mnr-topo';
      topo.innerHTML = `<b>${total ? total + ' anúncios ativos' : 'Anunciante'}</b>`;
      topo.appendChild(botao('Salvar este anunciante no Minerador', async (b) => { const r = await chamar('/api/extensao/salvar', { page_id: pid, nome: ordenados[0]?.nome || '', pais: pais(), anuncios: total }); b.textContent = r?.ok ? 'Salvo ✓ (a contagem entra no histórico)' : 'Erro'; }, true));
      corpo.prepend(topo);
    }
  }

  let t;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(desenhar, 1500); }).observe(document.body, { childList: true, subtree: true });
  setTimeout(desenhar, 2500);
})();
