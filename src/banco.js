// Camada de banco: SQLite local (padrão) ou Postgres/Supabase quando DATABASE_URL estiver definida.
// As consultas são escritas uma vez, com `?` como parâmetro; aqui elas são adaptadas para cada banco.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// DATABASE_URL (GitHub Actions / manual) ou POSTGRES_URL (integração Supabase da Vercel).
const URL_BANCO = process.env.DATABASE_URL || process.env.POSTGRES_URL;
export const usaPostgres = !!URL_BANCO;

const ESQUEMA = (pg) => `
CREATE TABLE IF NOT EXISTS anuncios (
  ad_id TEXT PRIMARY KEY, page_id TEXT, page_name TEXT, ativo INTEGER, inicio BIGINT, fim BIGINT,
  dup INTEGER, plataformas TEXT, formato TEXT, texto TEXT, titulo TEXT, link TEXT, dominio TEXT,
  cta TEXT, thumb TEXT, video TEXT, gateway TEXT, checkout TEXT, visto_primeiro BIGINT, visto_ultimo BIGINT, pais TEXT
);
CREATE INDEX IF NOT EXISTS ix_anuncios_page ON anuncios(page_id);
CREATE TABLE IF NOT EXISTS paginas (
  page_id TEXT PRIMARY KEY, nome TEXT, uri TEXT, foto TEXT, curtidas INTEGER, categorias TEXT,
  nichos TEXT DEFAULT '[]', palavras TEXT DEFAULT '[]', atualizado BIGINT, paises TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS historico (page_id TEXT, pais TEXT, data TEXT, ativos INTEGER, PRIMARY KEY (page_id, pais, data));
CREATE TABLE IF NOT EXISTS buscas (
  id ${pg ? 'BIGSERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'}, palavra TEXT, nicho TEXT, pais TEXT,
  total INTEGER, coletados INTEGER, quando BIGINT
);
CREATE TABLE IF NOT EXISTS checkouts (
  checkout TEXT PRIMARY KEY, gateway TEXT, url TEXT, produto TEXT, preco TEXT, analisado BIGINT, ok INTEGER
);
CREATE TABLE IF NOT EXISTS analises (dominio TEXT PRIMARY KEY, url TEXT, dados TEXT, quando BIGINT);
CREATE TABLE IF NOT EXISTS favoritos (
  tipo TEXT, chave TEXT, nome TEXT, nota TEXT DEFAULT '', criado BIGINT, PRIMARY KEY (tipo, chave)
);
CREATE TABLE IF NOT EXISTS ajustes (chave TEXT PRIMARY KEY, valor TEXT);
CREATE TABLE IF NOT EXISTS fila (
  id ${pg ? 'BIGSERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'}, tipo TEXT, args TEXT, descricao TEXT,
  status TEXT DEFAULT 'pendente', log TEXT DEFAULT '', criado BIGINT, inicio BIGINT, fim BIGINT
);
`;

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
  const fazer = (cli) => ({
    all: (q, p = []) => exec(cli, q, p).then((r) => [...r]),
    get: (q, p = []) => exec(cli, q, p).then((r) => r[0]),
    run: (q, p = []) => exec(cli, q, p).then(() => undefined),
  });
  impl = {
    ...fazer(sql),
    tx: (fn) => sql.begin((t) => fn(fazer(t))),
    iniciar: async () => {
      await sql.unsafe(ESQUEMA(true));
      await sql.unsafe('CREATE INDEX IF NOT EXISTS ix_anuncios_gw ON anuncios(gateway, checkout, pais)');
      // No Supabase, tabelas do schema public ficam expostas pela API pública: RLS ligado e sem políticas
      // bloqueia esse acesso (o painel conecta direto no Postgres e não é afetado).
      for (const t of ['anuncios', 'paginas', 'historico', 'buscas', 'checkouts', 'analises', 'favoritos', 'ajustes', 'fila']) {
        await sql.unsafe(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      }
    },
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
    iniciar: async () => {
      db.exec(ESQUEMA(false));
      // Migrações de bancos antigos (antes da separação por país, tudo era Brasil).
      const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
      for (const c of ['gateway', 'checkout', 'pais']) if (!cols('anuncios').includes(c)) db.exec(`ALTER TABLE anuncios ADD COLUMN ${c} TEXT`);
      if (!cols('paginas').includes('paises')) db.exec("ALTER TABLE paginas ADD COLUMN paises TEXT DEFAULT '[]'");
      if (!cols('historico').includes('pais')) {
        db.exec(`ALTER TABLE historico RENAME TO historico_antigo;
          CREATE TABLE historico (page_id TEXT, pais TEXT, data TEXT, ativos INTEGER, PRIMARY KEY (page_id, pais, data));
          INSERT INTO historico SELECT page_id, 'BR', data, ativos FROM historico_antigo; DROP TABLE historico_antigo;
          UPDATE anuncios SET pais = 'BR' WHERE pais IS NULL;
          UPDATE paginas SET paises = '["BR"]' WHERE paises IS NULL OR paises = '[]';`);
      }
      db.exec('DROP INDEX IF EXISTS ix_anuncios_gateway; CREATE INDEX IF NOT EXISTS ix_anuncios_gw ON anuncios(gateway, checkout, pais)');
    },
    fechar: async () => db.close(),
  };
}

export const { all, get, run, tx, fechar } = impl;
let pronto;
export const iniciar = () => (pronto ||= impl.iniciar());
