// Consumo dos planos grátis (Supabase Free, Vercel Hobby, GitHub Free) para a tela "Uso e limites".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { all, get, usaPostgres } from './banco.js';
import { tamanhoStorage } from './midia.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MB = 1024 * 1024;
const inicioMes = () => { const d = new Date(); return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000); };
const mesAtual = () => new Date().toISOString().slice(0, 7);

const item = (nome, usado, limite, unidade, obs) => {
  const pct = limite && usado != null ? Math.round((100 * usado) / limite) : null;
  return { nome, usado, limite, unidade, pct, alerta: pct != null && pct >= 80, obs };
};

export async function usoELimites() {
  // Banco (500 MB no Supabase Free)
  let banco = null, tabelas = [];
  if (usaPostgres) {
    banco = (await get('SELECT pg_database_size(current_database()) AS t')).t;
    tabelas = await all(`SELECT relname AS tabela, pg_total_relation_size(relid) AS bytes FROM pg_catalog.pg_statio_user_tables
      ORDER BY pg_total_relation_size(relid) DESC LIMIT 8`);
  } else {
    const arq = path.join(raiz, 'dados', 'minerador.db');
    banco = ['', '-wal'].reduce((s, x) => s + (fs.existsSync(arq + x) ? fs.statSync(arq + x).size : 0), 0);
  }
  const storage = await tamanhoStorage().catch(() => null);
  const egress = (await get("SELECT COALESCE(SUM(valor), 0) AS t FROM uso_diario WHERE chave = 'egress_midia_bytes' AND data LIKE ?", [mesAtual() + '%'])).t;
  const ia = await all("SELECT chave, SUM(valor) AS t FROM uso_diario WHERE chave LIKE 'ia_%' AND data = ? GROUP BY chave", [new Date().toISOString().slice(0, 10)]);

  // Minutos do GitHub Actions (cada execução do robô registra início e fim)
  const minutos = (await get(`SELECT COALESCE(SUM(CASE WHEN fim > inicio THEN fim - inicio ELSE 0 END), 0) AS s, COUNT(*) AS n
    FROM execucoes WHERE origem = 'actions' AND inicio >= ?`, [inicioMes()]));
  const limiteMin = Number(process.env.LIMITE_MINUTOS_ACTIONS ?? 2000);

  // Saúde do raspador nas últimas 24 h
  const desde = Math.floor(Date.now() / 1000) - 86400;
  const coletas = await all('SELECT status, COUNT(*) AS n FROM coletas WHERE quando >= ? GROUP BY status', [desde]);
  const ultimoErro = await get("SELECT quando, termo, pais, erro FROM coletas WHERE status = 'erro' ORDER BY quando DESC LIMIT 1");
  const execucoes = await all('SELECT origem, tipo, inicio, fim, status, coletas, erros FROM execucoes ORDER BY id DESC LIMIT 8');

  return {
    itens: [
      item('Banco de dados (Supabase)', banco, 500 * MB, 'bytes', 'Limite do plano grátis. Retenção automática apaga anúncios inativos há 60+ dias fora das listas.'),
      item('Storage de miniaturas (Supabase)', storage, 1024 * MB, 'bytes', 'WebP de 320 px. Miniaturas de anúncios inativos há 30+ dias são apagadas.'),
      item('Tráfego de mídia no mês (Supabase)', egress, 5 * 1024 * MB, 'bytes', 'Só o que a CDN da Vercel não tinha em cache. O total da conta aparece no painel do Supabase.'),
      item('Minutos do GitHub Actions no mês', Math.round(minutos.s / 60), limiteMin || null, 'min',
        limiteMin ? `${minutos.n} execuções. Repositório privado: 2.000 min/mês grátis.` : `${minutos.n} execuções. Repositório público: ilimitado.`),
      item('Funções da Vercel', null, 300, 's', 'Cada requisição do painel tem no máximo 300 s; coleta e análise rodam sempre no Actions.'),
      item('Cron jobs da Vercel', 0, 2, 'jobs', 'Agendamentos ficam no GitHub Actions.'),
    ],
    ia: ia.map((r) => ({ chave: r.chave.replace(/^ia_/, ''), hoje: r.t })),
    tabelas,
    raspador: { coletas24h: Object.fromEntries(coletas.map((c) => [c.status, c.n])), ultimoErro, execucoes },
  };
}
