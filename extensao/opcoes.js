const $ = (id) => document.getElementById(id);
chrome.storage.sync.get(['url', 'chave'], (v) => { $('url').value = v.url || ''; $('chave').value = v.chave || ''; });
$('salvar').onclick = async () => {
  const url = $('url').value.trim().replace(/\/+$/, ''), chave = $('chave').value.trim();
  await chrome.storage.sync.set({ url, chave });
  const msg = $('msg');
  try {
    const r = await fetch(url + '/api/extensao/status', { headers: { 'X-Chave': chave } });
    const d = await r.json();
    msg.className = d.ok ? 'ok' : 'erro';
    msg.textContent = d.ok ? 'Conectado. Pode abrir a Biblioteca de Anúncios.' : d.erro || 'Não foi possível conectar.';
  } catch (e) { msg.className = 'erro'; msg.textContent = 'Não foi possível conectar: confira o endereço do painel.'; }
};
