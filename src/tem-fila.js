// Checagem rápida (workflow a cada 5 min): existe pedido do painel esperando e nenhum robô de prontidão?
// Escreve "pendente=1" ou "pendente=0" na saída do GitHub Actions. Não abre navegador.
import fs from 'node:fs';
import { get, fechar } from './banco.js';

const pend = Number((await get("SELECT COUNT(*) n FROM tarefas WHERE status = 'pendente'"))?.n || 0);
const vivo = Number((await get("SELECT valor FROM ajustes WHERE chave = 'fila_viva'"))?.valor || 0);
const prontidao = Date.now() / 1000 - vivo < 25;
const sim = pend > 0 && !prontidao ? 1 : 0;
console.log(`pedidos pendentes: ${pend} · robô de prontidão: ${prontidao ? 'sim' : 'não'} → ${sim ? 'acordar' : 'nada a fazer'}`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `pendente=${sim}\n`);
await fechar();
