// Projetos do usuário (entregável, página, quiz, diário de testes): JSON simples por usuário, com IA opcional em cada etapa.
import { all, get, run, agora } from './db.js';
import { uid } from './contexto.js';
import { gerar } from './ia.js';

export async function listarProjetos(tipo) {
  return all('SELECT id, tipo, titulo, atualizado, criado FROM projetos WHERE user_id = ? AND tipo = ? ORDER BY atualizado DESC LIMIT 200', [uid(), tipo]);
}
export async function lerProjeto(id) {
  const r = await get('SELECT * FROM projetos WHERE id = ? AND user_id = ?', [Number(id), uid()]);
  return r ? { ...r, dados: JSON.parse(r.dados || '{}') } : null;
}
export async function salvarProjeto({ id, tipo, titulo, dados }) {
  const json = JSON.stringify(dados || {});
  if (json.length > 400000) throw new Error('projeto grande demais (limite de 400 KB de texto)');
  if (id) {
    await run('UPDATE projetos SET titulo = ?, dados = ?, atualizado = ? WHERE id = ? AND user_id = ?', [String(titulo || '').slice(0, 200), json, agora(), Number(id), uid()]);
    return { id: Number(id) };
  }
  const r = await get('INSERT INTO projetos (user_id, tipo, titulo, dados, criado, atualizado) VALUES (?, ?, ?, ?, ?, ?) RETURNING id', [uid(), tipo, String(titulo || '').slice(0, 200), json, agora(), agora()]);
  return { id: r.id };
}
export const apagarProjeto = (id) => run('DELETE FROM projetos WHERE id = ? AND user_id = ?', [Number(id), uid()]);

// ---------- entregável ----------
const TIPOS_ENTREGAVEL = { ebook: 'e-book', planner: 'planner', checklist: 'checklist', workbook: 'workbook (caderno de exercícios)', desafio: 'desafio de 7 dias' };

export function promptEntregavel(etapa, d) {
  const base = `Produto: ${d.produto || '-'}\nPúblico: ${d.publico || '-'}\nFormato: ${TIPOS_ENTREGAVEL[d.formato] || d.formato}\nPromessa: ${d.promessa || '-'}`;
  const ref = d.referencia ? `\nOferta de referência (só para entender o mercado, não copiar): ${JSON.stringify(d.referencia).slice(0, 2500)}` : '';
  const reclam = d.reclamacoes ? `\nReclamações de clientes de produtos parecidos: ${String(d.reclamacoes).slice(0, 2500)}` : '';
  if (etapa === 'mapa') return `Você é especialista em infoprodutos low ticket. Com base na oferta de referência, monte o MAPA do entregável concorrente e as lacunas para fazer melhor.
${base}${ref}${reclam}
Responda APENAS JSON em português: {"formato_prometido": "...", "modulos": ["..."], "bonus": ["..."], "lacunas": ["o que falta ou decepciona e você pode entregar melhor"], "diferenciais": ["3 diferenciais para o meu produto"]}`;
  if (etapa === 'estrutura') return `Crie a estrutura de um ${TIPOS_ENTREGAVEL[d.formato] || 'e-book'} low ticket (entregável de R$ 9,90 a R$ 47) que cumpra a promessa e supere a concorrência.
${base}${d.mapa ? `\nMapa da concorrência e lacunas: ${JSON.stringify(d.mapa).slice(0, 2000)}` : ''}
Responda APENAS JSON em português: {"titulo": "...", "subtitulo": "...", "capitulos": [{"titulo": "...", "objetivo": "o que a pessoa consegue ao terminar"}]} com 5 a 9 capítulos (ou 7 dias, se for desafio).`;
  if (etapa === 'capitulo') return `Escreva o conteúdo completo do capítulo abaixo de um ${TIPOS_ENTREGAVEL[d.formato] || 'e-book'} chamado "${d.titulo}".
${base}
Capítulo: ${d.capitulo?.titulo} — objetivo: ${d.capitulo?.objetivo || ''}
Escreva em português do Brasil, linguagem simples, prático, com passos, exemplos e, quando fizer sentido, um checklist ou exercício no fim. Entre 600 e 1.200 palavras.
Responda APENAS JSON: {"html": "conteúdo em HTML simples usando <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>"}`;
  if (etapa === 'bonus') return `Para o produto abaixo (low ticket), sugira bônus e order bumps coerentes que aumentem o ticket médio sem confundir a compra.
${base}
Responda APENAS JSON em português: {"bonus": [{"nome": "...", "descricao": "...", "formato": "..."}], "order_bumps": [{"nome": "...", "preco_sugerido": "R$ ...", "por_que_combina": "..."}], "upsell": {"nome": "...", "preco_sugerido": "R$ ...", "descricao": "..."}} com 2 a 3 bônus e 4 a 6 order bumps.`;
  throw new Error('etapa inválida');
}

export async function iaEntregavel(etapa, dados) {
  const prompt = promptEntregavel(etapa, dados);
  const entrada = { etapa, produto: dados.produto, formato: dados.formato, promessa: dados.promessa, publico: dados.publico, capitulo: dados.capitulo?.titulo || null, titulo: dados.titulo || null, ref: dados.referencia?.nome || null };
  return gerar({ tarefa: 'entregavel_' + etapa, entrada, prompt });
}
