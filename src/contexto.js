// Contexto da requisição (usuário logado), acessível em qualquer função sem passar parâmetro.
// No modo local e no robô não há login: o usuário é '' (dono).
import { AsyncLocalStorage } from 'node:async_hooks';

const armazenamento = new AsyncLocalStorage();
export const comUsuario = (usuario, fn) => armazenamento.run({ usuario }, fn);
export const usuarioAtual = () => armazenamento.getStore()?.usuario || { id: '', email: null };
export const uid = () => usuarioAtual().id || '';
