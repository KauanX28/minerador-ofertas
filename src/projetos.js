// Projetos do usuário (diário de testes): JSON simples por usuário.
import { all, get, run, agora } from './db.js';
import { uid } from './contexto.js';

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
