// Copia os dados do banco local (dados/minerador.db) para o Postgres/Supabase.
// Uso (PowerShell):  $env:DATABASE_URL = "postgresql://..."; node --no-warnings src/migrar-para-nuvem.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

if (!process.env.DATABASE_URL) { console.log('Defina DATABASE_URL com a string de conexão do Supabase.'); process.exit(1); }
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const local = new DatabaseSync(path.join(raiz, 'dados', 'minerador.db'), { readOnly: true });
const { iniciar, tx, fechar } = await import('./banco.js'); // usa Postgres por causa da DATABASE_URL
await iniciar();

const TABELAS = {
  paginas: 'page_id', anuncios: 'ad_id', historico_diario: 'page_id, pais, data', checkouts: 'checkout',
  analises: 'dominio', favoritos: 'user_id, tipo, chave', ajustes: 'chave',
};
for (const [tabela, chave] of Object.entries(TABELAS)) {
  const linhas = local.prepare(`SELECT * FROM ${tabela}`).all();
  if (!linhas.length) { console.log(`${tabela}: vazio`); continue; }
  const cols = Object.keys(linhas[0]);
  const sqlIns = `INSERT INTO ${tabela} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ON CONFLICT (${chave}) DO NOTHING`;
  for (let i = 0; i < linhas.length; i += 500) {
    await tx(async (db) => { for (const l of linhas.slice(i, i + 500)) await db.run(sqlIns, cols.map((c) => l[c])); });
  }
  console.log(`${tabela}: ${linhas.length} linhas copiadas`);
}
const buscas = local.prepare('SELECT palavra, nicho, pais, total, coletados, quando FROM buscas').all();
await tx(async (db) => { for (const b of buscas) await db.run('INSERT INTO buscas (palavra, nicho, pais, total, coletados, quando) VALUES (?, ?, ?, ?, ?, ?)', Object.values(b)); });
console.log(`buscas: ${buscas.length} linhas copiadas`);
await fechar();
console.log('Pronto! Os dados locais estão na nuvem.');
