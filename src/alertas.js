// Alertas e acompanhamento (Fase 9): Telegram, notificação no navegador (Web Push com VAPID) e e-mail opcional
// (Gmail com senha de app). Gatilhos: acompanhado subiu X%, oferta nova forte no nicho, criativo novo de concorrente
// salvo, raspador quebrado e banco acima de 80% (estes dois já existem no robô). Mais: ofertas do dia num canal do
// Telegram e relatório semanal.
import { all, get, run, agora, lerConfig } from './db.js';
import { alertar } from './alerta.js';
import { rankingPaginas, recomendavel, notaRecomendacao } from './score.js';

// ---------- Web Push (chaves VAPID geradas uma vez e guardadas no banco: nada para configurar) ----------
async function webpush() { try { return (await import('web-push')).default; } catch { return null; } }
export async function chavesVapid() {
  const r = await get("SELECT valor FROM ajustes WHERE chave = 'vapid'");
  if (r) return JSON.parse(r.valor);
  const wp = await webpush();
  if (!wp) return null;
  const k = wp.generateVAPIDKeys();
  await run("INSERT INTO ajustes (chave, valor) VALUES ('vapid', ?) ON CONFLICT(chave) DO NOTHING", [JSON.stringify(k)]);
  return JSON.parse((await get("SELECT valor FROM ajustes WHERE chave = 'vapid'")).valor);
}
export async function inscreverPush(userId, inscricao) {
  if (!inscricao?.endpoint) throw new Error('inscrição inválida');
  await run(`INSERT INTO push_inscricoes (endpoint, user_id, dados, criado) VALUES (?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, dados = excluded.dados`, [inscricao.endpoint, userId, JSON.stringify(inscricao), agora()]);
}
export const sairPush = (endpoint) => run('DELETE FROM push_inscricoes WHERE endpoint = ?', [endpoint]);

async function enviarPush(titulo, corpo, url = '/') {
  const wp = await webpush(); const k = await chavesVapid().catch(() => null);
  if (!wp || !k) return 0;
  wp.setVapidDetails('mailto:alertas@minerador.local', k.publicKey, k.privateKey);
  let n = 0;
  for (const s of await all('SELECT endpoint, dados FROM push_inscricoes')) {
    try { await wp.sendNotification(JSON.parse(s.dados), JSON.stringify({ titulo, corpo, url })); n++; }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await sairPush(s.endpoint); }
  }
  return n;
}

async function enviarEmail(assunto, texto) {
  const { SMTP_USER: u, SMTP_PASS: p, ALERTA_EMAIL: para } = process.env;
  if (!u || !p) return false;
  try {
    const { default: nodemailer } = await import('nodemailer');
    await nodemailer.createTransport({ service: 'gmail', auth: { user: u, pass: p } }).sendMail({ from: u, to: para || u, subject: assunto, text: texto });
    return true;
  } catch { return false; }
}

// Envia por todos os canais configurados.
export async function avisar(titulo, texto, { url = '/', log = () => {}, email = false } = {}) {
  const tg = await alertar(`${titulo}\n${texto}`, { log });
  const push = await enviarPush(titulo, texto, url);
  const em = email ? await enviarEmail('Minerador: ' + titulo, texto) : false;
  return { telegram: tg, push, email: em };
}

// Não repete o mesmo alerta (chave por tipo, página e dia).
async function jaAvisado(chave) {
  if (await get('SELECT 1 FROM alertas_enviados WHERE chave = ?', [chave])) return true;
  await run('INSERT INTO alertas_enviados (chave, quando) VALUES (?, ?) ON CONFLICT(chave) DO NOTHING', [chave, agora()]);
  return false;
}

export async function verificarAlertas({ pais = 'BR', log = () => {} } = {}) {
  const cfg = (await lerConfig()).alertas || {};
  const subiuPct = Number(cfg.subiuPct ?? 30), novaMin = Number(cfg.novaMinimo ?? 20);
  const hoje = new Date().toISOString().slice(0, 10);
  const lista = await rankingPaginas({ pais });
  const porId = new Map(lista.map((p) => [p.page_id, p]));
  const seguidos = new Set((await all("SELECT DISTINCT chave FROM favoritos WHERE tipo = 'pagina'")).map((r) => r.chave));
  let n = 0;
  for (const id of seguidos) {
    const p = porId.get(id); if (!p) continue;
    const base = p.ativos - (p.var7 ?? p.crescimento ?? 0);
    const pct = base > 0 ? Math.round((100 * (p.ativos - base)) / base) : 0;
    if (pct >= subiuPct && !(await jaAvisado(`subiu:${id}:${hoje}`))) { await avisar(`📈 ${p.nome} subiu ${pct}%`, `Foi de ${base} para ${p.ativos} anúncios ativos (${pais}).`, { url: '/oferta/' + id, log }); n++; }
    if ((p.novos7 || 0) >= 3) {
      const novos = await get("SELECT COUNT(*) n FROM anuncios WHERE page_id = ? AND pais = ? AND ativo = 1 AND visto_primeiro >= ?", [id, pais, agora() - 86400]);
      if (Number(novos?.n) >= 2 && !(await jaAvisado(`criativo:${id}:${hoje}`))) { await avisar(`🎬 ${p.nome} lançou ${novos.n} criativos novos`, 'Um anunciante que você acompanha está testando criativos.', { url: '/oferta/' + id + '/criativos', log }); n++; }
    }
  }
  // Oferta nova forte (low ticket) num dos nichos do rodízio.
  for (const p of lista.filter((x) => x.tipo === 'low' && x.dias <= 7 && x.ativos >= novaMin).slice(0, 5)) {
    if (await jaAvisado(`nova:${p.page_id}`)) continue;
    await avisar(`🆕 Oferta nova forte: ${p.nome}`, `${p.ativos} anúncios em ${p.dias} dias${p.preco ? ' · ' + p.preco : ''}${p.nichos?.length ? ' · ' + p.nichos.join(', ') : ''}.`, { url: '/oferta/' + p.page_id, log });
    n++;
  }
  if (n) log(`  alertas enviados: ${n}`);
  return n;
}

// Canal grátis no Telegram com as ofertas do dia (TELEGRAM_CANAL_ID; o bot precisa ser administrador do canal).
export async function ofertasDoDia({ pais = 'BR', log = () => {}, url = process.env.PAINEL_URL || '' } = {}) {
  const canal = process.env.TELEGRAM_CANAL_ID, token = process.env.TELEGRAM_BOT_TOKEN;
  const hoje = new Date().toISOString().slice(0, 10);
  if (!canal || !token || (await jaAvisado(`canal:${pais}:${hoje}`))) return false;
  const top = (await rankingPaginas({ pais, tipo: 'low' })).filter(recomendavel).sort((a, b) => notaRecomendacao(b) - notaRecomendacao(a)).slice(0, 5);
  if (!top.length) return false;
  const texto = `🔥 Ofertas low ticket do dia (${pais})\n\n` + top.map((p, i) => `${i + 1}. ${p.nome}: ${p.ativos} anúncios, ${p.dias} dias${p.preco ? ', ' + p.preco : ''}${p.var7 ? `, ${p.var7 > 0 ? '+' : ''}${p.var7} em 7 dias` : ''}${url ? `\n${url}/oferta/${p.page_id}` : ''}`).join('\n\n');
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: canal, text: texto, disable_web_page_preview: true }) });
  log(`  canal do Telegram: ${r.ok ? 'ofertas do dia publicadas' : 'falhou (o bot é administrador do canal?)'}`);
  return r.ok;
}

// Relatório da semana (também aparece no painel, gerado na hora).
export async function relatorio({ pais = 'BR' } = {}) {
  const lista = await rankingPaginas({ pais, tipo: 'low' });
  const seguidos = new Set((await all("SELECT DISTINCT chave FROM favoritos WHERE tipo = 'pagina'")).map((r) => r.chave));
  const semana = agora() - 7 * 86400;
  const exec = await all('SELECT status, COUNT(*) n FROM execucoes WHERE inicio >= ? GROUP BY status', [semana]).catch(() => []);
  const fmtP = (p) => ({ page_id: p.page_id, nome: p.nome, ativos: p.ativos, var7: p.var7, dias: p.dias, preco: p.preco, status: p.status, oportunidade: p.oportunidade });
  return {
    pais, gerado: agora(),
    novas: lista.filter((p) => p.dias <= 7 && p.ativos >= 10).sort((a, b) => b.ativos - a.ativos).slice(0, 10).map(fmtP),
    altas: lista.filter((p) => (p.var7 ?? 0) > 0).sort((a, b) => b.var7 - a.var7).slice(0, 10).map(fmtP),
    caindo: lista.filter((p) => p.status === 'Saturando/caindo').slice(0, 10).map(fmtP),
    melhoresParaModelar: lista.filter(recomendavel).sort((a, b) => notaRecomendacao(b) - notaRecomendacao(a)).slice(0, 10).map(fmtP),
    seguidos: lista.filter((p) => seguidos.has(p.page_id)).map(fmtP),
    robo: Object.fromEntries(exec.map((e) => [e.status, Number(e.n)])),
  };
}

export async function relatorioSemanal({ pais = 'BR', log = () => {} } = {}) {
  const d = new Date(); const semana = `${d.getUTCFullYear()}-${Math.ceil(((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 864e5 + 1) / 7)}`;
  if (d.getUTCDay() !== 1 || (await jaAvisado(`relatorio:${pais}:${semana}`))) return false;
  const r = await relatorio({ pais });
  const linhas = (t, l) => (l.length ? `\n${t}\n` + l.slice(0, 5).map((p) => `• ${p.nome}: ${p.ativos} anúncios${p.var7 ? ` (${p.var7 > 0 ? '+' : ''}${p.var7} na semana)` : ''}`).join('\n') : '');
  const texto = `Resumo da semana (${pais})` + linhas('🆕 Novas fortes:', r.novas) + linhas('📈 Maiores altas:', r.altas) + linhas('🎯 Melhores para modelar:', r.melhoresParaModelar)
    + `\n🤖 Robô: ${r.robo.ok || 0} rodadas ok, ${r.robo.erro || 0} com erro.`;
  await avisar('📊 Relatório semanal', texto, { url: '/relatorio', log, email: true });
  log('  relatório semanal enviado');
  return true;
}
