// Transcrição de vídeo com o Whisper do Groq (nível grátis). O vídeo do anúncio vai direto (mp4 até 25 MB);
// se passar disso, extrai só o áudio (MP3 de 32 kbps) com o ffmpeg, quando disponível.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { get, run, agora } from './db.js';

const LIMITE = 24 * 1024 * 1024;
const exec = promisify(execFile);

export const lerTranscricao = async (adId) => (await get('SELECT texto, idioma, fonte, quando FROM transcricoes WHERE ad_id = ?', [adId])) || null;
export async function salvarTranscricao(adId, texto, idioma, fonte) {
  await run(`INSERT INTO transcricoes (ad_id, texto, idioma, fonte, quando) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(ad_id) DO UPDATE SET texto = excluded.texto, idioma = excluded.idioma, fonte = excluded.fonte, quando = excluded.quando`, [adId, String(texto).slice(0, 20000), idioma || null, fonte, agora()]);
}

async function ffmpegBin() {
  try { const m = await import('ffmpeg-static'); return m.default; } catch { return 'ffmpeg'; }
}

export async function transcreverAnuncio(ad, { log = () => {} } = {}) {
  if (!process.env.GROQ_API_KEY) return null;
  const ja = await lerTranscricao(ad.ad_id);
  if (ja) return ja;
  if (!ad.video) return null;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'transc-'));
  try {
    const r = await fetch(ad.video, { signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error(`vídeo indisponível (HTTP ${r.status}): a URL do fbcdn expira, o robô pega uma nova na próxima coleta`);
    let arquivo = path.join(tmp, 'video.mp4');
    fs.writeFileSync(arquivo, Buffer.from(await r.arrayBuffer()));
    if (fs.statSync(arquivo).size > LIMITE) {
      const mp3 = path.join(tmp, 'audio.mp3');
      await exec(await ffmpegBin(), ['-y', '-i', arquivo, '-vn', '-ac', '1', '-b:a', '32k', mp3], { timeout: 120000 });
      arquivo = mp3;
    }
    const form = new FormData();
    form.append('file', new Blob([fs.readFileSync(arquivo)]), path.basename(arquivo));
    form.append('model', process.env.GROQ_WHISPER || 'whisper-large-v3-turbo');
    form.append('response_format', 'verbose_json');
    const t = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: form, signal: AbortSignal.timeout(120000) });
    if (!t.ok) throw new Error(`Whisper HTTP ${t.status}`);
    const d = await t.json();
    await salvarTranscricao(ad.ad_id, d.text || '', d.language, 'groq-whisper');
    await run(`INSERT INTO uso_diario (data, chave, valor) VALUES (?, 'ia_whisper', 1) ON CONFLICT(data, chave) DO UPDATE SET valor = uso_diario.valor + 1`, [new Date().toISOString().slice(0, 10)]).catch(() => {});
    log(`  transcrito ${ad.ad_id} (${(d.text || '').length} caracteres)`);
    return { texto: d.text, idioma: d.language, fonte: 'groq-whisper' };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
