// Camada de IA com custo zero. Ordem: Gemini (nível grátis do AI Studio) → Groq (nível grátis) → sem IA.
// Sem chave ou com a cota esgotada, devolve o prompt pronto para copiar (a interface ainda pode tentar o modelo no navegador).
// Cache obrigatório: cada resultado fica salvo em ia_cache e nunca é gerado duas vezes.
import crypto from 'node:crypto';
import { get, run, agora } from './db.js';

const GEMINI_MODELOS = (process.env.GEMINI_MODELO || 'gemini-2.5-flash,gemini-2.0-flash').split(',');
const GROQ_MODELOS = (process.env.GROQ_MODELO || 'llama-3.3-70b-versatile,llama-3.1-8b-instant').split(',');
const hoje = () => new Date().toISOString().slice(0, 10);

export const provedores = () => ({ gemini: !!process.env.GEMINI_API_KEY, groq: !!process.env.GROQ_API_KEY });
export const chaveCache = (tarefa, entrada) => tarefa + ':' + crypto.createHash('sha1').update(typeof entrada === 'string' ? entrada : JSON.stringify(entrada)).digest('hex').slice(0, 24);

export async function lerCache(chave) {
  const r = await get('SELECT saida, provedor, quando FROM ia_cache WHERE chave = ?', [chave]);
  return r ? { resultado: JSON.parse(r.saida), provedor: r.provedor, quando: r.quando, doCache: true } : null;
}
export async function salvarCache(chave, tarefa, resultado, provedor) {
  await run(`INSERT INTO ia_cache (chave, tarefa, saida, provedor, quando) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(chave) DO UPDATE SET saida = excluded.saida, provedor = excluded.provedor, quando = excluded.quando`, [chave, tarefa, JSON.stringify(resultado), provedor, agora()]);
}
async function contar(nome) {
  await run(`INSERT INTO uso_diario (data, chave, valor) VALUES (?, ?, 1) ON CONFLICT(data, chave) DO UPDATE SET valor = uso_diario.valor + 1`, [hoje(), 'ia_' + nome]).catch(() => {});
}

// Extrai JSON mesmo se o modelo cercar com ```json.
function lerJSON(txt) {
  const t = String(txt || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch { const m = t.match(/[[{][\s\S]*[\]}]/); if (m) return JSON.parse(m[0]); throw new Error('resposta da IA não é JSON'); }
}

async function gemini(prompt, json) {
  const k = process.env.GEMINI_API_KEY;
  let ultimo;
  for (const modelo of GEMINI_MODELOS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${k}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(50000),
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, ...(json ? { responseMimeType: 'application/json' } : {}) } }),
    });
    if (r.status === 404) { ultimo = new Error(`modelo ${modelo} indisponível`); continue; }
    if (!r.ok) throw new Error(`Gemini HTTP ${r.status}${r.status === 429 ? ' (cota grátis do dia esgotada)' : ''}`);
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  }
  throw ultimo;
}

async function groq(prompt, json) {
  let ultimo;
  for (const modelo of GROQ_MODELOS) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, signal: AbortSignal.timeout(50000),
      body: JSON.stringify({ model: modelo, temperature: 0.8, messages: [{ role: 'user', content: prompt }], ...(json ? { response_format: { type: 'json_object' } } : {}) }),
    });
    if (r.status === 404 || r.status === 400) { ultimo = new Error(`modelo ${modelo} indisponível`); continue; }
    if (!r.ok) throw new Error(`Groq HTTP ${r.status}${r.status === 429 ? ' (cota grátis esgotada)' : ''}`);
    const d = await r.json();
    return d.choices?.[0]?.message?.content || '';
  }
  throw ultimo;
}

// Gera (ou lê do cache). validar(resultado) pode lançar erro para recusar resposta incompleta.
export async function gerar({ tarefa, entrada, prompt, json = true, validar = () => {} }) {
  const chave = chaveCache(tarefa, entrada);
  const cache = await lerCache(chave);
  if (cache) return cache;
  const p = provedores(), erros = [];
  for (const [nome, fn] of [['gemini', gemini], ['groq', groq]]) {
    if (!p[nome]) continue;
    try {
      const txt = await fn(prompt, json);
      const resultado = json ? lerJSON(txt) : txt;
      validar(resultado);
      await contar(nome);
      await salvarCache(chave, tarefa, resultado, nome);
      return { resultado, provedor: nome, doCache: false };
    } catch (e) { erros.push(`${nome}: ${e.message}`); }
  }
  return { semIA: true, prompt, chave, erros };
}

// ---------- tarefas de IA ----------
export const AVISO_GEMINI = 'No nível grátis do Gemini o Google pode usar os textos enviados para melhorar os modelos. Não envie dados pessoais.';

export function promptAnaliseCriativo(ad, transcricao) {
  return `Você é um estrategista de anúncios de infoprodutos low ticket. Analise o criativo abaixo (anúncio da Biblioteca de Anúncios da Meta, ${ad.dup || 1} cópias ativas, ${ad.dias ?? '?'} dias no ar).
Responda APENAS um JSON em português do Brasil com estas chaves:
{"hook": "a frase/ideia dos 3 primeiros segundos", "angulo": "o ângulo de venda", "promessa": "a promessa principal", "publico": "quem é o público e o momento de vida",
 "dor": "a dor ou desejo explorado", "mecanismo": "o mecanismo ou método único (se houver)", "objecoes": ["objeções que o criativo quebra"],
 "provas": ["provas e gatilhos usados"], "cta": "a chamada para ação", "formato": "formato do criativo (UGC, depoimento, tela dividida, texto na tela...)",
 "estrutura": [{"tempo": "0-3s", "parte": "hook", "descricao": "..."}], "por_que_funciona": "2 frases", "como_modelar": ["3 ideias para criar uma versão NOVA sem copiar"]}

Título: ${ad.titulo || '-'}
Texto do anúncio: ${(ad.texto || '').slice(0, 2500)}
${transcricao ? `Transcrição do vídeo: ${transcricao.slice(0, 6000)}` : 'Sem transcrição do vídeo (analise pelo texto).'}`;
}

export const validarAnalise = (r) => { if (!r || typeof r !== 'object' || !r.hook || !r.promessa) throw new Error('análise incompleta'); };

const GERADORES = {
  hooks: ['10 hooks', 'Escreva 10 hooks (ganchos dos 3 primeiros segundos) novos e variados: pergunta, choque, curiosidade, prova, contraste. JSON: {"hooks": ["..."]}'],
  roteiros: ['3 roteiros', 'Escreva 3 roteiros de vídeo de 30 a 45 segundos com tempos. JSON: {"roteiros": [{"titulo": "...", "cenas": [{"tempo": "0-3s", "fala": "...", "visual": "..."}]}]}'],
  copies: ['5 copies', 'Escreva 5 textos de anúncio (legenda) curtos, cada um com título de até 40 caracteres. JSON: {"copies": [{"titulo": "...", "texto": "..."}]}'],
  ugc: ['brief de UGC', 'Escreva um brief para uma criadora de conteúdo UGC gravar o vídeo: perfil da pessoa, cenário, roupa, tom, falas-chave, takes e o que evitar. JSON: {"perfil": "...", "cenario": "...", "tom": "...", "falas": ["..."], "takes": ["..."], "evitar": ["..."]}'],
  storyboard: ['storyboard', 'Monte um storyboard de 6 a 8 quadros para um vídeo curto. JSON: {"quadros": [{"n": 1, "tempo": "0-3s", "imagem": "o que aparece", "texto_tela": "...", "fala": "..."}]}'],
};
export const TIPOS_GERACAO = Object.fromEntries(Object.entries(GERADORES).map(([k, v]) => [k, v[0]]));

export function promptGeracao(tipo, analise, produto) {
  const [, pedido] = GERADORES[tipo] || GERADORES.hooks;
  return `Você é copywriter de anúncios de infoprodutos low ticket no Brasil. Use a análise de um criativo vencedor apenas como REFERÊNCIA de estrutura e ângulo:
${JSON.stringify(analise).slice(0, 4000)}

Crie material NOVO para o produto: ${produto || '[produto do usuário]'}. Modelar, nunca copiar: não repita frases, nomes ou promessas da referência.
${pedido}
Responda APENAS o JSON, em português do Brasil.`;
}
