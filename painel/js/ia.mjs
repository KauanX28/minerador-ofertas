// IA no navegador: quando o servidor não tem chave (ou a cota acabou), tenta a chave que o usuário salvou neste
// navegador (Gemini ou Groq, chamada direta) e, se houver WebGPU, um modelo pequeno que roda no próprio computador.
// Sem nada disso, a tela mostra o prompt para copiar. O resultado gerado aqui também vai para o cache do servidor.
import { post } from './base.mjs';

export const chaves = {
  get gemini() { return localStorage.chaveGemini || ''; }, set gemini(v) { if (v) localStorage.chaveGemini = v; else delete localStorage.chaveGemini; },
  get groq() { return localStorage.chaveGroq || ''; }, set groq(v) { if (v) localStorage.chaveGroq = v; else delete localStorage.chaveGroq; },
};
export const temWebGPU = () => !!navigator.gpu;

function lerJSON(txt) {
  const t = String(txt || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch { const m = t.match(/[[{][\s\S]*[\]}]/); if (m) return JSON.parse(m[0]); throw new Error('a resposta não veio em JSON'); }
}

async function gemini(prompt) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${chaves.gemini}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }) });
  if (!r.ok) throw new Error('Gemini: HTTP ' + r.status);
  return (await r.json()).candidates?.[0]?.content?.parts?.map((p) => p.text).join('');
}
async function groq(prompt) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + chaves.groq },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }) });
  if (!r.ok) throw new Error('Groq: HTTP ' + r.status);
  return (await r.json()).choices?.[0]?.message?.content;
}

let motorLocal = null;
// Modelo pequeno no navegador (WebLLM). Baixa cerca de 1 GB na primeira vez e guarda no navegador.
export async function local(prompt, aoProgresso = () => {}) {
  if (!motorLocal) {
    const webllm = await import('https://esm.run/@mlc-ai/web-llm');
    motorLocal = await webllm.CreateMLCEngine('Qwen2.5-1.5B-Instruct-q4f16_1-MLC', { initProgressCallback: (p) => aoProgresso(p.text || '') });
  }
  const r = await motorLocal.chat.completions.create({ messages: [{ role: 'user', content: prompt + '\nResponda apenas com o JSON.' }], temperature: 0.7 });
  return r.choices?.[0]?.message?.content;
}

// Recebe a resposta do servidor; se veio sem IA, tenta as alternativas do navegador.
export async function resolver(resp, { usarLocal = false, aoProgresso } = {}) {
  if (!resp?.semIA) return resp;
  const tentativas = [chaves.gemini && ['gemini (sua chave)', gemini], chaves.groq && ['groq (sua chave)', groq], usarLocal && temWebGPU() && ['navegador', (p) => local(p, aoProgresso)]].filter(Boolean);
  const erros = [...(resp.erros || [])];
  for (const [nome, fn] of tentativas) {
    try {
      const resultado = lerJSON(await fn(resp.prompt));
      await post('/api/ia/salvar', { chave: resp.chave, resultado, provedor: nome.split(' ')[0] }).catch(() => {});
      return { resultado, provedor: nome };
    } catch (e) { erros.push(e.message); }
  }
  return { ...resp, erros };
}
