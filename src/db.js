// Operações de gravação/leitura usadas pelo coletor e pelo painel (funciona em SQLite e Postgres).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { all, get, run, tx, iniciar } from './banco.js';
import { chaveOferta, detectarGateway } from './util.js';

export { all, get, run, iniciar };
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const agora = () => Math.floor(Date.now() / 1000);
export const hoje = () => new Date().toISOString().slice(0, 10);

// Recalcula chave de oferta e gateway de anúncios antigos se as regras em util.js mudarem.
export async function recalcularChaves() {
  const rows = await all('SELECT ad_id, link, dominio, gateway, checkout FROM anuncios WHERE link IS NOT NULL');
  const mudar = rows.map((r) => ({ r, k: chaveOferta(r.link), g: detectarGateway(r.link) }))
    .filter(({ r, k, g }) => k !== r.dominio || (g?.gateway ?? null) !== r.gateway || (g?.checkout ?? null) !== r.checkout);
  if (!mudar.length) return 0;
  await tx(async (t) => {
    for (const { r, k, g } of mudar) {
      await t.run('UPDATE anuncios SET dominio = ?, gateway = ?, checkout = ? WHERE ad_id = ?', [k, g?.gateway ?? null, g?.checkout ?? null, r.ad_id]);
    }
  });
  return mudar.length;
}

const SQL_ANUNCIO = `
INSERT INTO anuncios (ad_id, page_id, page_name, ativo, inicio, fim, dup, plataformas, formato, texto, titulo,
  link, dominio, cta, thumb, video, gateway, checkout, visto_primeiro, visto_ultimo, pais)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(ad_id) DO UPDATE SET ativo=excluded.ativo, fim=excluded.fim, dup=excluded.dup,
  thumb=COALESCE(excluded.thumb, anuncios.thumb), video=COALESCE(excluded.video, anuncios.video),
  page_name=excluded.page_name, visto_ultimo=excluded.visto_ultimo`;

const SQL_PAGINA = `
INSERT INTO paginas (page_id, nome, uri, foto, curtidas, categorias, nichos, palavras, atualizado, paises)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(page_id) DO UPDATE SET nome=excluded.nome, uri=COALESCE(excluded.uri, paginas.uri),
  foto=COALESCE(excluded.foto, paginas.foto), curtidas=COALESCE(excluded.curtidas, paginas.curtidas),
  categorias=excluded.categorias, nichos=excluded.nichos, palavras=excluded.palavras, atualizado=excluded.atualizado,
  paises=excluded.paises`;

function juntar(jsonAtual, novo) {
  const arr = JSON.parse(jsonAtual || '[]');
  if (novo && !arr.includes(novo)) arr.push(novo);
  return JSON.stringify(arr);
}

export async function salvarAnuncios(anuncios, { nicho, palavra, pais } = {}) {
  if (!anuncios.length) return;
  if (!pais) throw new Error('salvarAnuncios precisa do país');
  const t = agora();
  const porPagina = new Map();
  for (const a of anuncios) if (!porPagina.has(a.page_id)) porPagina.set(a.page_id, a);
  await tx(async (db) => {
    for (const a of anuncios) {
      const g = detectarGateway(a.link);
      await db.run(SQL_ANUNCIO, [a.ad_id, a.page_id, a.page_name, a.ativo, a.inicio, a.fim, a.dup, a.plataformas, a.formato,
        a.texto, a.titulo, a.link, a.dominio, a.cta, a.thumb, a.video, g?.gateway ?? null, g?.checkout ?? null, t, t, pais]);
    }
    for (const a of porPagina.values()) {
      const atual = await db.get('SELECT nichos, palavras, paises FROM paginas WHERE page_id = ?', [a.page_id]);
      await db.run(SQL_PAGINA, [a.page_id, a.page_name, a.pagina.uri, a.pagina.foto, a.pagina.curtidas, a.pagina.categorias,
        juntar(atual?.nichos, nicho), juntar(atual?.palavras, palavra), t, juntar(atual?.paises, pais)]);
    }
  });
}

// Marca como inativos os anúncios da página que não apareceram na varredura completa dela.
export async function marcarInativos(pageId, pais, idsAtivos) {
  const ids = new Set(idsAtivos);
  const rows = await all('SELECT ad_id FROM anuncios WHERE page_id = ? AND pais = ? AND ativo = 1', [pageId, pais]);
  const sair = rows.filter((r) => !ids.has(r.ad_id));
  if (sair.length) await tx(async (db) => { for (const r of sair) await db.run('UPDATE anuncios SET ativo = 0 WHERE ad_id = ?', [r.ad_id]); });
}

export const salvarHistorico = (pageId, pais, ativos) => run(
  'INSERT INTO historico (page_id, pais, data, ativos) VALUES (?, ?, ?, ?) ON CONFLICT(page_id, pais, data) DO UPDATE SET ativos = excluded.ativos',
  [pageId, pais, hoje(), ativos]);

export const salvarBusca = ({ palavra, nicho, pais, total, coletados }) => run(
  'INSERT INTO buscas (palavra, nicho, pais, total, coletados, quando) VALUES (?, ?, ?, ?, ?, ?)',
  [palavra, nicho ?? null, pais, total ?? null, coletados, agora()]);

export const salvarCheckout = ({ checkout, gateway, url, produto, preco, ok }) => run(
  `INSERT INTO checkouts (checkout, gateway, url, produto, preco, analisado, ok) VALUES (?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(checkout) DO UPDATE SET url=excluded.url, produto=excluded.produto, preco=excluded.preco,
   analisado=excluded.analisado, ok=excluded.ok`,
  [checkout, gateway, url, produto ?? null, preco ?? null, agora(), ok ? 1 : 0]);

export const salvarAnalise = (dominio, url, dados) => run(
  `INSERT INTO analises (dominio, url, dados, quando) VALUES (?, ?, ?, ?)
   ON CONFLICT(dominio) DO UPDATE SET url=excluded.url, dados=excluded.dados, quando=excluded.quando`,
  [dominio, url, JSON.stringify(dados), agora()]);

export async function lerAnalise(dominio) {
  const r = await get('SELECT dados, quando FROM analises WHERE dominio = ?', [dominio]);
  return r ? { ...JSON.parse(r.dados), quando: r.quando } : null;
}

// Configuração (nichos, palavras, rotina): fica no banco para funcionar também na nuvem.
export async function lerConfig() {
  const r = await get("SELECT valor FROM ajustes WHERE chave = 'config'");
  if (r) return JSON.parse(r.valor);
  return JSON.parse(fs.readFileSync(path.join(raiz, 'config.json'), 'utf8'));
}
export const salvarConfig = (c) => run(
  "INSERT INTO ajustes (chave, valor) VALUES ('config', ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor", [JSON.stringify(c)]);
