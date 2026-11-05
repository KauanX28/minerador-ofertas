// Busca por significado: vetores (embeddings) dos anúncios ativos com o modelo multilingual-e5-small (384 dimensões),
// gerados no robô (GitHub Actions) com transformers.js. Grátis: o modelo roda na própria máquina do Actions.
// Na nuvem os vetores ficam numa coluna pgvector; no modo local, em JSON no SQLite.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { all, run, get } from './db.js';
import { usaPostgres, atualizarLote } from './banco.js';

export const MODELO = 'Xenova/multilingual-e5-small';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let extrator = null;

async function carregarModelo() {
  if (extrator) return extrator;
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = path.join(raiz, '.cache', 'modelos'); // o workflow guarda esta pasta entre as rodadas
  extrator = await pipeline('feature-extraction', MODELO, { dtype: 'q8' });
  return extrator;
}

// Texto do anúncio no formato que o e5 espera ("passage: ..."), curto para caber no limite do modelo.
const textoDoAnuncio = (a) => 'passage: ' + `${a.titulo || ''} ${a.texto || ''}`.replace(/\s+/g, ' ').trim().slice(0, 600);

export async function colunaVetorExiste() {
  const r = await get(usaPostgres
    ? "SELECT COUNT(*) n FROM information_schema.columns WHERE table_name = 'anuncios' AND column_name = 'embedding'"
    : "SELECT COUNT(*) n FROM pragma_table_info('anuncios') WHERE name = 'embedding'").catch(() => ({ n: 0 }));
  return Number(r?.n) > 0;
}

// Gera vetores para os anúncios ativos que ainda não têm. Para no limite ou quando o tempo da rodada acabar.
export async function gerarEmbeddings({ limite = 1500, log = () => {}, temTempo = () => true } = {}) {
  if (!(await colunaVetorExiste())) { log('  busca por significado desativada (banco sem coluna de vetor)'); return 0; }
  let modelo;
  try { modelo = await carregarModelo(); } catch (e) { log(`  modelo de embeddings indisponível: ${e.message}`); return 0; }
  const pendentes = await all(`SELECT ad_id, titulo, SUBSTR(texto, 1, 700) texto FROM anuncios
    WHERE ativo = 1 AND embedding IS NULL AND (LENGTH(COALESCE(texto, '')) + LENGTH(COALESCE(titulo, ''))) > 20 ORDER BY dup DESC LIMIT ?`, [limite]);
  if (!pendentes.length) return 0;
  log(`> Busca por significado: gerando vetores de ${pendentes.length} anúncios`);
  let feitos = 0;
  for (let i = 0; i < pendentes.length; i += 32) {
    if (!temTempo(1)) break;
    const lote = pendentes.slice(i, i + 32);
    const saida = await modelo(lote.map(textoDoAnuncio), { pooling: 'mean', normalize: true });
    const vetores = saida.tolist();
    // Grava o lote inteiro num comando só (na nuvem, um UPDATE por anúncio custava uma viagem de rede cada).
    await atualizarLote('anuncios', 'ad_id', [['embedding', usaPostgres ? 'vector' : 'text']],
      lote.map((a, j) => { const v = vetores[j].map((x) => Math.round(x * 1e5) / 1e5); return [a.ad_id, usaPostgres ? '[' + v.join(',') + ']' : JSON.stringify(v)]; }));
    feitos += lote.length;
  }
  log(`  ${feitos} vetores gerados`);
  return feitos;
}

// Anúncios mais parecidos com o vetor da busca (o navegador gera o vetor da frase com o mesmo modelo).
export async function buscarPorSignificado(vetor, pais, limite = 48) {
  if (!Array.isArray(vetor) || vetor.length !== 384 || !vetor.every(Number.isFinite)) throw new Error('vetor inválido');
  const campos = `ad_id, page_id, page_name, ativo, inicio, dup, formato, SUBSTR(texto, 1, 600) texto, titulo, link, cta, gateway,
    CASE WHEN thumb_arquivo IS NOT NULL THEN '/api/midia/' || ad_id ELSE thumb END AS thumb`;
  if (usaPostgres) {
    const v = '[' + vetor.join(',') + ']';
    return all(`SELECT ${campos}, 1 - (embedding <=> ?::vector) similaridade FROM anuncios
      WHERE ativo = 1 AND pais = ? AND embedding IS NOT NULL ORDER BY embedding <=> ?::vector LIMIT ?`, [v, pais, v, limite]);
  }
  // Local: poucos milhares de anúncios, a conta de similaridade em JavaScript é rápida.
  const linhas = await all(`SELECT ${campos}, embedding FROM anuncios WHERE ativo = 1 AND pais = ? AND embedding IS NOT NULL`, [pais]);
  return linhas.map((a) => {
    const e = JSON.parse(a.embedding); let s = 0;
    for (let i = 0; i < 384; i++) s += e[i] * vetor[i];
    delete a.embedding; a.similaridade = s; return a;
  }).sort((a, b) => b.similaridade - a.similaridade).slice(0, limite);
}
