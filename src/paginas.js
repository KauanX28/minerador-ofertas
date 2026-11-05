// Construtor de página e de quiz por modelagem: a IA lê a ESTRUTURA da referência (seções, ordem, gatilhos)
// e escreve uma página nova em blocos editáveis para o produto do usuário. Nada de copiar textos.
import { gerar } from './ia.js';
import { lerAnalise } from './db.js';

export const TIPOS_BLOCO = ['hero', 'dor', 'mecanismo', 'beneficios', 'prova', 'oferta', 'bonus', 'garantia', 'faq', 'cta'];

async function referencia(dominio) {
  if (!dominio) return null;
  const a = await lerAnalise(String(dominio).replace(/^https?:\/\//, '').split('/')[0]).catch(() => null);
  if (!a) return null;
  return { titulo: a.titulo, descricao: a.descricao, manchetes: (a.manchetes || []).slice(0, 12), precos: (a.precos || []).slice(0, 4),
    gatilhos: { garantia: a.temGarantia, bonus: a.temBonus, depoimentos: a.temDepoimentos, escassez: a.temEscassez }, funil: a.tecnologia };
}

export async function iaPagina(tipo, etapa, d) {
  const ref = await referencia(d.referencia);
  const base = `Produto: ${d.produto || '-'}\nPúblico: ${d.publico || '-'}\nPromessa: ${d.promessa || '-'}\nPreço: ${d.preco || '-'}`;
  const refTxt = ref ? `\nEstrutura da página de referência (use só a ORDEM e os GATILHOS, nunca o texto): ${JSON.stringify(ref).slice(0, 3000)}` : '';
  let prompt, entrada = { tipo, etapa, produto: d.produto, promessa: d.promessa, publico: d.publico, preco: d.preco, ref: d.referencia || null };
  if (tipo === 'pagina' && etapa === 'gerar') {
    prompt = `Você é copywriter de páginas de vendas de infoprodutos low ticket no Brasil. Escreva uma página de vendas NOVA, curta e direta, para celular.
${base}${refTxt}
Responda APENAS JSON em português: {"blocos": [{"tipo": "um de ${TIPOS_BLOCO.join('|')}", "titulo": "...", "texto": "...", "itens": ["..."], "botao": "texto do botão (só em hero, oferta e cta)"}]}
Use de 8 a 11 blocos, começando por "hero" e terminando em "cta". Em "faq", itens no formato "Pergunta? Resposta".`;
  } else if (tipo === 'quiz' && etapa === 'gerar') {
    prompt = `Crie um quiz de pré-venda (6 a 8 perguntas) que leve ao produto abaixo, com micro-compromissos, perguntas fáceis e resultado personalizado.
${base}${refTxt}
Responda APENAS JSON em português: {"titulo": "...", "subtitulo": "...", "perguntas": [{"pergunta": "...", "opcoes": ["...", "..."]}],
 "resultado": {"titulo": "Seu resultado: ...", "texto": "diagnóstico curto que conecta as respostas ao produto", "botao": "..."}}`;
  } else if (etapa === 'textos') {
    entrada = { ...entrada, etapa: 'textos' };
    prompt = `Escreva os textos do checkout de um infoproduto low ticket. ${base}
Responda APENAS JSON em português: {"checkout": {"titulo": "...", "subtitulo": "...", "selos": ["..."], "garantia": "..."},
 "order_bumps": [{"titulo": "Sim, eu quero ...", "descricao": "1 frase", "preco": "R$ ..."}], "upsell": {"titulo": "...", "texto": "3 frases", "botao_sim": "...", "botao_nao": "Não, obrigado..."},
 "downsell": {"titulo": "...", "texto": "...", "botao": "..."}, "email_entrega": {"assunto": "...", "texto": "..."}} com 4 order bumps.`;
  } else throw new Error('etapa inválida');
  return gerar({ tarefa: `${tipo}_${etapa}`, entrada, prompt });
}
