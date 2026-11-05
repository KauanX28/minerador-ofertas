// Login com Supabase Auth (plano grátis). O navegador entra com e-mail/senha ou link mágico e manda o token;
// aqui o token é conferido no próprio Supabase (com cache curto) e o e-mail precisa estar autorizado.
// Variáveis: SUPABASE_URL, SUPABASE_ANON_KEY (chave pública "publishable") e EMAILS_PERMITIDOS (lista separada por vírgula).
// Sem SUPABASE_URL (modo local) o login fica desligado e o usuário é o dono ('').

const URL_SB = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const CHAVE_PUBLICA = process.env.SUPABASE_ANON_KEY || '';
const PERMITIDOS = (process.env.EMAILS_PERMITIDOS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
export const DONO = PERMITIDOS[0] || null;

export const authAtiva = () => !!(URL_SB && CHAVE_PUBLICA && (process.env.VERCEL || process.env.EXIGIR_LOGIN === '1'));
export const configPublica = () => ({ auth: authAtiva(), supabaseUrl: URL_SB || null, anonKey: authAtiva() ? CHAVE_PUBLICA : null });

const cache = new Map(); // token -> { usuario, ate }

export async function verificar(req) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!m) return { erro: 'login necessário', status: 401 };
  const token = m[1];
  const c = cache.get(token);
  if (c && c.ate > Date.now()) return { usuario: c.usuario };
  const r = await fetch(`${URL_SB}/auth/v1/user`, { headers: { apikey: CHAVE_PUBLICA, Authorization: `Bearer ${token}` } });
  if (!r.ok) return { erro: 'sessão expirada, entre de novo', status: 401 };
  const u = await r.json();
  const email = String(u.email || '').toLowerCase();
  if (!PERMITIDOS.length || !PERMITIDOS.includes(email)) return { erro: `o e-mail ${email} não tem acesso a este painel`, status: 403 };
  const usuario = { id: u.id, email, dono: email === DONO };
  cache.set(token, { usuario, ate: Date.now() + 5 * 60 * 1000 });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return { usuario };
}
