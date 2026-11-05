// Aplica as migrações pendentes do banco (SQLite local, ou Supabase se DATABASE_URL estiver definida).
// Uso: node --no-warnings src/migrar.js
import { migrar, fechar, VERSAO_ESQUEMA, get } from './banco.js';

const n = await migrar({ log: console.log });
const v = await get('SELECT MAX(versao) v FROM schema_migracoes');
console.log(n ? `${n} migração(ões) aplicada(s).` : 'Nada a migrar.', `Banco na versão ${v.v} (código espera ${VERSAO_ESQUEMA}).`);
await fechar();
