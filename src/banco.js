// Camada de banco: SQLite local (padrão) ou Postgres/Supabase quando DATABASE_URL estiver definida.
// As consultas são escritas uma vez, com `?` como parâmetro; aqui elas são adaptadas para cada banco.
// O esquema evolui por migrações versionadas (src/migracoes.js), aplicadas só pelo robô/terminal:
// a função da Vercel nunca roda DDL (ALTER/CREATE pedem bloqueio exclusivo e travariam o painel).
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MIGRACOES } from './migracoes.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// DATABASE_URL (GitHub Actions / manual) ou POSTGRES_URL (integração Supabase da Vercel).
const URL_BANCO = process.env.DATABASE_URL || process.env.POSTGRES_URL;
export const usaPostgres = !!URL_BANCO;
export const naVercel = !!process.env.VERCEL;
export const VERSAO_ESQUEMA = MIGRACOES.at(-1).versao;

let impl;

if (usaPostgres) {
  const { default: postgres } = await import('postgres');
  const num = { to: 20, from: [20, 1700], serialize: (x) => String(x), parse: (x) => (x === null ? null : Number(x)) };
  const sql = postgres(URL_BANCO, {
    ssl: process.env.DATABASE_SSL === 'false' ? false : 'require', max: 3, idle_timeout: 20, prepare: false,
    types: { numero: num }, onnotice: () => {},
  });
  const traduzir = (q) => {
    let i = 0;
    return q.replace(/GROUP_CONCAT\(DISTINCT ([\w.]+)\)/gi, "string_agg(DISTINCT $1, ',')").replace(/\?/g, () => '$' + ++i);
  };
  const exec = (cli, q, p) => cli.unsafe(traduzir(q), p.map((v) => (v === undefined ? null : v)));
  // Uma consulta por vez: com várias em paralelo a biblioteca faz "pipelining" na mesma conexão,
  // e o pooler do Supabase (Supavisor, modo transação) deixa a resposta pendurada para sempre.
  let fila = Promise.resolve();
  const emFila = (fn) => { const r = fila.then(fn, fn); fila = r.catch(() => {}); return r; };
  const fazer = (cli, serial) => {
    const rodar = serial ? (q, p) => emFila(() => exec(cli, q, p)) : exec.bind(null, cli);
    return {
      all: (q, p = []) => rodar(q, p).then((r) => [...r]),
      get: (q, p = []) => rodar(q, p).then((r) => r[0]),
      run: (q, p = []) => rodar(q, p).then(() => undefined),
    };
  };
  impl = {
    ...fazer(sql, true),
    tx: (fn) => sql.begin((t) => fn(fazer(t))),
    ddl: (texto) => emFila(() => sql.unsafe(texto)),
    colunas: async (t) => (await sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${t}`).map((r) => r.column_name),
    existe: async (t) => (await sql`SELECT to_regclass(${'public.' + t}) IS NOT NULL AS e`)[0].e,
    fechar: () => sql.end({ timeout: 5 }),
  };
} else {
  const { DatabaseSync } = await import('node:sqlite');
  fs.mkdirSync(path.join(raiz, 'dados'), { recursive: true });
  const db = new DatabaseSync(path.join(raiz, 'dados', 'minerador.db'));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const cache = new Map();
  const st = (q) => { if (!cache.has(q)) cache.set(q, db.prepare(q)); return cache.get(q); };
  const limpa = (p) => p.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v));
  const ops = {
    all: async (q, p = []) => st(q).all(...limpa(p)),
    get: async (q, p = []) => st(q).get(...limpa(p)),
    run: async (q, p = []) => { st(q).run(...limpa(p)); },
  };
  impl = {
    ...ops,
    tx: async (fn) => {
      db.exec('BEGIN');
      try { const r = await fn(ops); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    ddl: async (texto) => { cache.clear(); db.exec(texto); },
    colunas: async (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name),
    existe: async (t) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t),
    fechar: async () => db.close(),
  };
}

export const { all, get, run, tx, fechar } = impl;

// Atualiza muitas linhas de uma vez. No Postgres da nuvem cada comando é uma viagem de rede (~100 ms),
// então 5.000 UPDATEs viravam 10 minutos; em lote são poucos comandos. colunas: [['nome', 'tipo SQL'], ...];
// linhas: [[chave, valor1, valor2, ...], ...].
export async function atualizarLote(tabela, chave, colunas, linhas, tamanho = 400) {
  if (!linhas.length) return;
  if (!usaPostgres) {
    const q = `UPDATE ${tabela} SET ${colunas.map(([c]) => `${c} = ?`).join(', ')} WHERE ${chave} = ?`;
    await tx(async (db) => { for (const [k, ...v] of linhas) await db.run(q, [...v, k]); });
    return;
  }
  for (let i = 0; i < linhas.length; i += tamanho) {
    const lote = linhas.slice(i, i + tamanho);
    const n = colunas.length + 1;
    const valores = lote.map((_, j) => '(' + Array.from({ length: n }, (__, k) => '?').join(', ') + ')').join(', ');
    const nomes = ['k', ...colunas.map(([c]) => c)].join(', ');
    await run(`UPDATE ${tabela} AS t SET ${colunas.map(([c, tipo]) => `${c} = v.${c}::${tipo}`).join(', ')}
      FROM (VALUES ${valores}) AS v(${nomes}) WHERE t.${chave} = v.k::text`, lote.flat().map((x) => (x === undefined ? null : x == null ? null : String(x))));
  }
}

// Insere muitas linhas de uma vez (mesma ideia). Retorna as linhas de RETURNING, se pedido.
export async function inserirLote(tabela, colunas, linhas, { conflito = '', retornar = '', tamanho = 300 } = {}) {
  const saida = [];
  for (let i = 0; i < linhas.length; i += tamanho) {
    const lote = linhas.slice(i, i + tamanho);
    const valores = lote.map(() => '(' + colunas.map(() => '?').join(', ') + ')').join(', ');
    const q = `INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES ${valores} ${conflito}${retornar ? ' RETURNING ' + retornar : ''}`;
    if (retornar) saida.push(...(await all(q, lote.flat()))); else await run(q, lote.flat());
  }
  return saida;
}

// Aplica as migrações pendentes, em ordem, registrando cada uma em schema_migracoes.
export async function migrar({ log = () => {} } = {}) {
  const { ddl, existe, colunas } = impl;
  const ctx = { pg: usaPostgres, ddl, existe, colunas, all, get, run, tx };
  if (usaPostgres) await ddl("SET lock_timeout = '20s'");
  await ddl(`CREATE TABLE IF NOT EXISTS schema_migracoes (versao INTEGER PRIMARY KEY, nome TEXT, aplicada BIGINT)`);
  if (usaPostgres) await ddl('ALTER TABLE schema_migracoes ENABLE ROW LEVEL SECURITY');
  const feitas = new Set((await all('SELECT versao FROM schema_migracoes')).map((r) => r.versao));
  let n = 0;
  for (const m of MIGRACOES) {
    if (feitas.has(m.versao)) continue;
    log(`> Migração ${m.versao}: ${m.nome}`);
    await m.up(ctx);
    await run('INSERT INTO schema_migracoes (versao, nome, aplicada) VALUES (?, ?, ?)', [m.versao, m.nome, Math.floor(Date.now() / 1000)]);
    n++;
  }
  return n;
}

// Na Vercel só confere a versão (sem DDL). No robô e no modo local, aplica o que faltar.
let pronto;
export const iniciar = () => (pronto ||= (async () => {
  if (naVercel) {
    const v = await get('SELECT MAX(versao) v FROM schema_migracoes').catch(() => null);
    if (!v || v.v < VERSAO_ESQUEMA) throw new Error(`Banco na versão ${v?.v ?? 0}, código espera ${VERSAO_ESQUEMA}: rode o workflow "manutencao" (migração).`);
    return;
  }
  await migrar();
})());
