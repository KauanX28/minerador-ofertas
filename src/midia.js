// Miniaturas próprias: as imagens do fbcdn expiram em poucos dias, então o robô baixa cada miniatura,
// converte para WebP de 320 px (~20 KB) e guarda no Supabase Storage (1 GB grátis). Vídeos não são guardados.
// O painel serve as miniaturas por /api/midia/:ad_id com cache de 1 ano na CDN da Vercel, poupando o tráfego
// de saída do Supabase (5 GB/mês). No modo local (sem Storage) os arquivos ficam em dados/miniaturas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { all, run, get } from './banco.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA_LOCAL = path.join(raiz, 'dados', 'miniaturas');
const URL_SB = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const CHAVE_SERVICO = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = 'miniaturas';
const temStorage = () => !!(URL_SB && CHAVE_SERVICO);
// Chave nova (sb_secret_...) vai só no cabeçalho apikey; a antiga (service_role, JWT) também como Bearer.
const cabecalhos = (extra = {}) => ({ apikey: CHAVE_SERVICO, ...(CHAVE_SERVICO.startsWith('sb_') ? {} : { Authorization: `Bearer ${CHAVE_SERVICO}` }), ...extra });
const hoje = () => new Date().toISOString().slice(0, 10);

async function contarUso(chave, valor) {
  await run(`INSERT INTO uso_diario (data, chave, valor) VALUES (?, ?, ?)
    ON CONFLICT(data, chave) DO UPDATE SET valor = uso_diario.valor + excluded.valor`, [hoje(), chave, valor]).catch(() => {});
}

// ---------- servir (Vercel / servidor local) ----------
export async function servirMiniatura(res, adId) {
  const nome = String(adId).replace(/[^0-9]/g, '');
  const enviar = (buf) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('CDN-Cache-Control', 'public, max-age=31536000, immutable');
    res.end(buf);
  };
  try {
    if (URL_SB) {
      const r = await fetch(`${URL_SB}/storage/v1/object/public/${BUCKET}/ads/${nome}.webp`);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        await contarUso('egress_midia_bytes', buf.length); // só conta quando a CDN da Vercel não tinha em cache
        return enviar(buf);
      }
    } else {
      const arq = path.join(PASTA_LOCAL, `${nome}.webp`);
      if (fs.existsSync(arq)) return enviar(fs.readFileSync(arq));
    }
  } catch { /* cai no 404 */ }
  res.statusCode = 404;
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.end('');
}

// ---------- gerar (robô) ----------
async function gravar(nome, buf) {
  if (!temStorage()) {
    fs.mkdirSync(PASTA_LOCAL, { recursive: true });
    fs.writeFileSync(path.join(PASTA_LOCAL, `${nome}.webp`), buf);
    return true;
  }
  const r = await fetch(`${URL_SB}/storage/v1/object/${BUCKET}/ads/${nome}.webp`, {
    method: 'POST',
    headers: cabecalhos({ 'Content-Type': 'image/webp', 'x-upsert': 'true', 'Cache-Control': '31536000' }),
    body: buf,
  });
  return r.ok;
}

// Converte as miniaturas que ainda não têm cópia própria (prioriza os criativos mais duplicados).
export async function processarMiniaturas({ limite = 250, log = () => {} } = {}) {
  if (URL_SB && !CHAVE_SERVICO) { log('  (miniaturas: defina SUPABASE_SERVICE_ROLE_KEY para guardar no Storage)'); return 0; }
  const { default: sharp } = await import('sharp');
  const { hashImagem } = await import('./classificador.js');
  const agoraS = () => Math.floor(Date.now() / 1000);
  // Falhas recentes (link expirado) não são tentadas de novo por 1 dia.
  const pendentes = await all(`SELECT ad_id, thumb FROM anuncios WHERE ativo = 1 AND thumb IS NOT NULL AND thumb_arquivo IS NULL
    AND (thumb_em IS NULL OR thumb_em < ?) ORDER BY dup DESC, visto_ultimo DESC LIMIT ?`, [agoraS() - 86400, limite]);
  let ok = 0, falhas = 0;
  for (const a of pendentes) {
    try {
      const r = await fetch(a.thumb, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) { falhas++; await run('UPDATE anuncios SET thumb_em = ? WHERE ad_id = ?', [agoraS(), a.ad_id]); continue; }
      const original = Buffer.from(await r.arrayBuffer());
      const webp = await sharp(original).resize({ width: 320, withoutEnlargement: true }).webp({ quality: 55 }).toBuffer();
      const phash = await hashImagem(original).catch(() => null);
      if (await gravar(a.ad_id, webp)) {
        await run('UPDATE anuncios SET thumb_arquivo = ?, thumb_em = ?, phash = ? WHERE ad_id = ?', [`ads/${a.ad_id}.webp`, agoraS(), phash, a.ad_id]);
        ok++;
      } else falhas++;
    } catch { falhas++; await run('UPDATE anuncios SET thumb_em = ? WHERE ad_id = ?', [agoraS(), a.ad_id]).catch(() => {}); }
  }
  if (pendentes.length) log(`  miniaturas: ${ok} salvas, ${falhas} falharam (link expirado ou bloqueado)`);
  // Hash perceptual das miniaturas antigas que ainda não têm (lê a própria cópia).
  const semHash = await all('SELECT ad_id FROM anuncios WHERE thumb_arquivo IS NOT NULL AND phash IS NULL LIMIT ?', [400]);
  for (const a of semHash) {
    try {
      const buf = URL_SB
        ? Buffer.from(await (await fetch(`${URL_SB}/storage/v1/object/public/${BUCKET}/ads/${a.ad_id}.webp`, { signal: AbortSignal.timeout(10000) })).arrayBuffer())
        : fs.readFileSync(path.join(PASTA_LOCAL, `${a.ad_id}.webp`));
      await run('UPDATE anuncios SET phash = ? WHERE ad_id = ?', [await hashImagem(buf), a.ad_id]);
    } catch { await run("UPDATE anuncios SET phash = '-' WHERE ad_id = ?", [a.ad_id]).catch(() => {}); }
  }
  if (semHash.length) log(`  hash de imagem calculado para ${semHash.length} miniaturas antigas`);
  return ok;
}

// Apaga miniaturas de anúncios inativos há mais de 30 dias que não estejam em nenhuma lista.
export async function limparMiniaturas({ log = () => {} } = {}) {
  const limite = Math.floor(Date.now() / 1000) - 30 * 86400;
  const velhos = await all(`SELECT a.ad_id, a.thumb_arquivo FROM anuncios a
    WHERE a.ativo = 0 AND a.inativo_desde < ? AND a.thumb_arquivo IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM favoritos f WHERE (f.tipo = 'pagina' AND f.chave = a.page_id) OR (f.tipo = 'checkout' AND f.chave = a.checkout))
    LIMIT 1000`, [limite]);
  if (!velhos.length) return 0;
  if (temStorage()) {
    const r = await fetch(`${URL_SB}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE', headers: cabecalhos({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefixes: velhos.map((v) => v.thumb_arquivo) }),
    });
    if (!r.ok) { log(`  falha ao apagar miniaturas: ${r.status}`); return 0; }
  } else {
    for (const v of velhos) fs.rmSync(path.join(PASTA_LOCAL, path.basename(v.thumb_arquivo)), { force: true });
  }
  await run(`UPDATE anuncios SET thumb_arquivo = NULL WHERE ad_id IN (${velhos.map(() => '?').join(', ')})`, velhos.map((v) => v.ad_id));
  log(`  miniaturas antigas apagadas: ${velhos.length}`);
  return velhos.length;
}

export async function tamanhoStorage() {
  if (!URL_SB) {
    if (!fs.existsSync(PASTA_LOCAL)) return 0;
    return fs.readdirSync(PASTA_LOCAL).reduce((s, f) => s + fs.statSync(path.join(PASTA_LOCAL, f)).size, 0);
  }
  const r = await get(`SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) AS t FROM storage.objects WHERE bucket_id = ?`, [BUCKET]).catch(() => null);
  return r?.t ?? null;
}
