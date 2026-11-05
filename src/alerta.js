// Alertas pelo Telegram (grátis). Configure TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID; sem eles, só registra no log.
export async function alertar(texto, { log = console.log } = {}) {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chat } = process.env;
  log(`[alerta] ${texto}`);
  if (!token || !chat) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: `Minerador: ${texto}`, disable_web_page_preview: true }),
    });
    return r.ok;
  } catch { return false; }
}
