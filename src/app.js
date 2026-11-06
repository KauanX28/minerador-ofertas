// API do painel. Usada pelo servidor local (src/server.js) e pela função da Vercel (api/index.js).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  paisesComDados, rankingPaginas, recomendavel, notaRecomendacao, rankingDominios, rankingGateway, resumoGateways, detalhePagina, painelGeral, listaAnalises, listaFavoritos,
} from './score.js';
import { all, get, run, iniciar, agora, lerAnalise, lerConfig, salvarConfig } from './db.js';
import { usaPostgres } from './banco.js';
import { GATEWAYS, linksExternos, hostDe } from './util.js';
import { authAtiva, configPublica, verificar } from './auth.js';
import { comUsuario, uid } from './contexto.js';
import { servirMiniatura } from './midia.js';
import { usoELimites } from './uso.js';

// Filtros, ordenação e paginação do ranking feitos no servidor (a interface recebe só a página pedida).
const ORDENS = {
  score: (a, b) => b.score - a.score, oportunidade: (a, b) => b.oportunidade - a.oportunidade, ativos: (a, b) => b.ativos - a.ativos,
  crescimento: (a, b) => (b.var7 ?? b.crescimento ?? -1e9) - (a.var7 ?? a.crescimento ?? -1e9), novos: (a, b) => a.dias - b.dias || b.score - a.score,
  dias: (a, b) => b.dias - a.dias, preco: (a, b) => (a.precoBrl ?? 1e9) - (b.precoBrl ?? 1e9),
};
// Busca por palavras: todas precisam aparecer, em qualquer ordem, sem ligar para acento, maiúscula ou plural
// ("atividades biblicas" acha "Atividades bíblicas" e "+100 atividades para a escola bíblica").
const PARADA_BUSCA = new Set('de da do das dos para com em e a o as os um uma no na nos nas por pra'.split(' '));
const semAcentoBusca = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function termosBusca(t) {
  const ws = semAcentoBusca(t).split(/[^a-z0-9$]+/).filter((w) => w.length >= 2 && !PARADA_BUSCA.has(w)).map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w));
  return ws.length ? ws : semAcentoBusca(t).trim() ? [semAcentoBusca(t).trim()] : [];
}
// Comparação sem acento no banco (Postgres); no modo local (SQLite) só ignora maiúsculas.
const semAcentoSql = (c) => (usaPostgres ? `translate(LOWER(${c}), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')` : `LOWER(${c})`);
function filtroTermos(texto) {
  const f = [], p = [];
  for (const w of termosBusca(texto)) {
    f.push(`(${semAcentoSql('texto')} LIKE ? OR ${semAcentoSql('titulo')} LIKE ? OR ${semAcentoSql('page_name')} LIKE ?)`);
    p.push(`%${w}%`, `%${w}%`, `%${w}%`);
  }
  return { f, p };
}
// Anunciantes com pelo menos um anúncio ativo que tem todas as palavras buscadas (não só o nome ou o primeiro anúncio).
async function paginasComTermos(texto, pais) {
  const { f, p } = filtroTermos(texto);
  if (!f.length) return null;
  return new Set((await all(`SELECT DISTINCT page_id FROM anuncios WHERE ativo = 1 AND pais = ? AND ${f.join(' AND ')}`, [pais, ...p])).map((r) => r.page_id));
}
function filtrarRanking(lista, q, idsBusca = null) {
  const sim = (v) => v === '1' || v === 'true';
  const semAcento = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const termos = termosBusca(q.busca);
  const nichos = String(q.nichos || '').split('|').filter(Boolean);
  const verMarcas = q.marcas === '1' || String(q.tipo || '').split(',').includes('marca');
  let r = lista.filter((x) => (verMarcas || x.tipo !== 'marca') && (!nichos.length || nichos.some((n) => (x.nichos || []).includes(n))) && (!q.status || x.status === q.status) && (!q.funil || x.funil === q.funil) && (!q.formato || x.formato === q.formato)
    && (!sim(q.vsl) || x.temVsl) && (!sim(q.quiz) || x.temQuiz) && (!sim(q.checkout) || x.checkoutConhecido) && (!sim(q.plr) || x.plr)
    && (!sim(q.acelerando) || ['Nova acelerando', 'Escalando agora'].includes(x.status)) && (!sim(q.gringa) || x.semEquivalenteBR)
    && (!termos.length || idsBusca?.has(x.page_id) || ((h) => termos.every((w) => h.includes(w)))(semAcento([x.nome, x.produto, x.titulo, x.texto, ...(x.dominios || [])].join(' ')))));
  if (q.ordem === 'oportunidade') r = r.filter(recomendavel);
  r = r.sort(q.ordem === 'oportunidade' ? (a, b) => notaRecomendacao(b) - notaRecomendacao(a) : ORDENS[q.ordem] || ORDENS.score);
  if (q.ids) { const ids = String(q.ids).split(','); r = lista.filter((x) => ids.includes(x.page_id)); }
  const por = Math.min(Math.max(Number(q.por || 48), 1), 200), pagina = Math.max(Number(q.pagina || 1), 1);
  return { total: r.length, pagina, por, itens: r.slice((pagina - 1) * por, pagina * por) };
}

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NUVEM = !!process.env.VERCEL || process.env.MODO === 'nuvem';

// ----- execução de tarefas -----
// Local: roda o coletor como processo filho. Nuvem: grava na fila e aciona o GitHub Actions.
const local = { rodando: false, tipo: null, descricao: '', log: [], inicio: null, fim: null, codigo: null, fila: [] };

// No modo local roda um pedido por vez; os outros esperam numa fila e começam sozinhos em seguida.
function rodarLocal(tipo, args, descricao, { enfileirar = false } = {}) {
  if (local.rodando) {
    if (!enfileirar) return false;
    if (local.descricao !== descricao && !local.fila.some((x) => x.descricao === descricao)) local.fila.push({ tipo, args, descricao, foco: enfileirar });
    return true;
  }
  Object.assign(local, { rodando: true, tipo, descricao, log: [], inicio: Date.now(), fim: null, codigo: null });
  const p = spawn(process.execPath, ['--no-warnings', path.join(raiz, 'src', 'tarefa.js'), tipo, ...args], {
    cwd: raiz, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  const add = (b) => { for (const l of b.toString().split(/\r?\n/)) if (l.trim()) local.log.push(l); local.log = local.log.slice(-500); };
  p.stdout.on('data', add);
  p.stderr.on('data', add);
  p.on('close', (c) => {
    Object.assign(local, { rodando: false, fim: Date.now(), codigo: c });
    const prox = local.fila.shift();
    if (prox) rodarLocal(prox.tipo, prox.args, prox.descricao);
  });
  return true;
}

async function acionarGithub() {
  const { GITHUB_TOKEN: token, GITHUB_REPO: repo } = process.env;
  const vivo = Number((await get("SELECT valor FROM ajustes WHERE chave = 'fila_viva'").catch(() => null))?.valor || 0);
  if (Date.now() / 1000 - vivo < 25) return 'o robô já está de prontidão: começa em segundos';
  if (!token || !repo) return 'Pedido anotado: o robô começa em 5 a 15 minutos. Para começar na hora, faça o passo 0 do configurar-chaves.ps1 (token do GitHub).';
  const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/minerador.yml/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'minerador-ofertas' },
    body: JSON.stringify({ ref: process.env.GITHUB_REF || 'main', inputs: { tarefa: 'fila' } }),
  });
  return r.ok ? 'robô acionado (começa em cerca de 1 minuto; depois fica de prontidão por 10 minutos)' : `falha ao acionar GitHub (${r.status})`;
}

// Põe um pedido na fila (nuvem) ou roda na hora (modo local).
async function enfileirar(b, origem = 'painel') {
  const m = montarArgs(b);
  if (!m) return { erro: 'tipo inválido' };
  if (!NUVEM) {
    if (origem === 'foco') local.fila = local.fila.filter((x) => x.descricao === m.desc || !x.foco);
    const naFila = local.rodando && local.descricao !== m.desc;
    return { iniciado: rodarLocal(b.tipo, m.args, m.desc, { enfileirar: origem === 'foco' }), tarefa: local, aviso: naFila && origem === 'foco' ? 'na fila: começa quando o robô terminar a busca atual' : undefined };
  }
  // Pedido ao vivo novo substitui os pedidos ao vivo que ainda esperam na fila (vale o último nicho ou termo escolhido).
  if (origem === 'foco') await run("DELETE FROM tarefas WHERE origem = 'foco' AND status = 'pendente' AND descricao <> ?", [m.desc]);
  const ja = await get("SELECT id FROM tarefas WHERE descricao = ? AND status IN ('pendente', 'rodando')", [m.desc]);
  if (!ja) await run('INSERT INTO tarefas (tipo, args, descricao, user_id, origem, criado) VALUES (?, ?, ?, ?, ?, ?)', [b.tipo, JSON.stringify(m.args), m.desc, uid(), origem, agora()]);
  return { iniciado: true, aviso: await acionarGithub() };
}

async function estadoTarefa() {
  if (!NUVEM) return local;
  const f = await get('SELECT * FROM tarefas ORDER BY id DESC LIMIT 1');
  const pend = await get("SELECT COUNT(*) n FROM tarefas WHERE status IN ('pendente','rodando')");
  if (!f) return { rodando: false, log: [], fila: 0 };
  return {
    rodando: ['pendente', 'rodando'].includes(f.status), status: f.status, tipo: f.tipo, descricao: f.descricao,
    log: (f.log || (f.status === 'pendente' ? 'Na fila: aguardando o robô na nuvem começar...' : '')).split('\n'),
    inicio: f.inicio ? f.inicio * 1000 : null, fim: f.fim ? f.fim * 1000 : null, fila: pend.n, nuvem: true,
  };
}

function montarArgs(b) {
  const a = [];
  if (b.pais) a.push('--pais', String(b.pais));
  if (b.visivel && !NUVEM) a.push('--visivel');
  let desc = '';
  if (b.tipo === 'minerar') {
    if (b.palavras) a.push('--palavras', String(b.palavras), '--nicho', String(b.nicho || 'Avulso'));
    else if (b.nicho) a.push('--nicho', String(b.nicho));
    if (b.max) a.push('--max', String(b.max));
    if (b.top) a.push('--top', String(b.top)); if (b.sites != null) a.push('--sites', String(b.sites));
    desc = b.palavras ? `Minerando: ${b.palavras}` : `Minerando nicho ${b.nicho || 'todos'} (${String(b.pais || 'BR').toUpperCase()})`;
  } else if (b.tipo === 'gateway') {
    a.push('--gateway', String(b.gateway)); if (b.max) a.push('--max', String(b.max));
    desc = `Ofertas mais anunciadas em ${b.gateway}`;
  } else if (b.tipo === 'analisar') {
    a.push('--url', String(b.url)); desc = `Raio-X de ${b.url}`;
  } else if (b.tipo === 'atualizar') {
    desc = 'Atualizando contagens';
  } else if (b.tipo === 'renovar') {
    // Os links de vídeo do Facebook expiram: recoleta o anunciante para trazer links novos.
    if (!/^\d{5,}$/.test(String(b.pagina || ''))) return null;
    a.push('--pagina', String(b.pagina)); desc = 'Renovando vídeos e imagens de um anunciante';
  } else return null;
  return { args: a, desc };
}

// ----- utilidades HTTP -----
const json = (res, dados, status = 200) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(dados));
};
const corpo = (req) => new Promise((ok) => {
  if (req.body && typeof req.body === 'object') return ok(req.body);
  let d = ''; req.on('data', (c) => (d += c));
  req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch { ok({}); } });
});
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

function servirEstatico(res, rota) {
  const base = path.join(raiz, 'painel');
  let alvo = path.normalize(path.join(base, rota === '/' ? 'index.html' : decodeURIComponent(rota)));
  if (!alvo.startsWith(base)) return false;
  if ((!fs.existsSync(alvo) || fs.statSync(alvo).isDirectory()) && !path.extname(rota)) alvo = path.join(base, 'index.html'); // rota da SPA
  if (!fs.existsSync(alvo) || fs.statSync(alvo).isDirectory()) return false;
  res.statusCode = 200;
  res.setHeader('Content-Type', TIPOS[path.extname(alvo)] || 'application/octet-stream');
  res.end(fs.readFileSync(alvo));
  return true;
}

// Itens salvos antes do login existir (user_id = '') passam para o dono no primeiro acesso dele.
let legadoMigrado = false;
async function migrarLegado(usuario) {
  if (legadoMigrado || !usuario.dono) return;
  legadoMigrado = true;
  await run("UPDATE favoritos SET user_id = ? WHERE user_id = ''", [usuario.id]);
}

export async function handler(req, res) {
  const rotaPublica = /^\/api\/(publico|midia|webhook|extensao)\//.test(new URL(req.url, 'http://x').pathname);
  if (!authAtiva() || rotaPublica || !req.url.startsWith('/api/')) return comUsuario(null, () => atender(req, res));
  const v = await verificar(req).catch((e) => ({ erro: 'falha ao validar login: ' + e.message, status: 401 }));
  if (v.erro) return json(res, { erro: v.erro, precisaLogin: true }, v.status);
  return comUsuario(v.usuario, async () => { await migrarLegado(v.usuario).catch(() => {}); return atender(req, res); });
}

async function atender(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const q = Object.fromEntries(url.searchParams);
  const rota = url.pathname;
  try {
    if (!rota.startsWith('/api/')) {
      if (servirEstatico(res, rota)) return;
      res.statusCode = 404; return res.end('não encontrado');
    }
    if (rota === '/api/publico/config') return json(res, configPublica());
    if (rota.startsWith('/api/midia/')) return servirMiniatura(res, decodeURIComponent(rota.split('/').pop()));
    if (rota.startsWith('/api/extensao/')) {
      // Extensão do Chrome: autentica pela chave pessoal criada no painel (Configurações → Extensão).
      res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Chave'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
      await iniciar();
      const chave = String(req.headers['x-chave'] || '');
      const dono = chave.length >= 20 ? await get("SELECT user_id FROM prefs WHERE chave = 'extensao' AND valor = ?", [chave]) : null;
      if (!dono) return json(res, { erro: 'chave da extensão inválida: copie a chave em Configurações → Extensão' }, 401);
      return comUsuario({ id: dono.user_id }, async () => {
        if (rota === '/api/extensao/salvar' && req.method === 'POST') {
          const b = await corpo(req);
          if (!b.page_id) return json(res, { erro: 'page_id obrigatório' }, 400);
          await run(`INSERT INTO favoritos (user_id, tipo, chave, nome, nota, criado, atualizado) VALUES (?, 'pagina', ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, tipo, chave) DO UPDATE SET nome = excluded.nome, atualizado = excluded.atualizado`, [uid(), String(b.page_id), String(b.nome || '').slice(0, 140), 'salvo pela extensão', agora(), agora()]);
          if (b.pais && b.anuncios) await run(`INSERT INTO historico_diario (page_id, pais, data, ativos) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING`,
            [String(b.page_id), String(b.pais).toUpperCase().slice(0, 2), new Date().toISOString().slice(0, 10), Number(b.anuncios) || 0]).catch(() => {});
          return json(res, { ok: true });
        }
        if (rota === '/api/extensao/status') return json(res, { ok: true });
        return json(res, { erro: 'rota não encontrada' }, 404);
      });
    }
    if (rota.startsWith('/api/webhook/') && req.method === 'POST') {
      // Webhook do gateway: protegido pelo token secreto na URL (WEBHOOK_TOKEN). Não guarda nome, e-mail nem CPF do comprador.
      if (!process.env.WEBHOOK_TOKEN || q.token !== process.env.WEBHOOK_TOKEN) return json(res, { erro: 'token inválido' }, 403);
      await iniciar();
      const { registrarVenda } = await import('./vendas.js');
      return json(res, await registrarVenda(rota.split('/')[3].toLowerCase().slice(0, 20), await corpo(req)));
    }
    await iniciar();

    const pais = String(q.pais || 'BR').toUpperCase();
    if (rota === '/api/paises') return json(res, await paisesComDados());
    if (rota === '/api/painel') return json(res, await painelGeral(pais));
    if (rota === '/api/paginas') {
      let tipos = q.ids ? [] : String(q.tipo ?? 'low').split(',').filter(Boolean);
      // Numa busca, anunciantes ainda sem classificação entram junto com os low ticket (muitos têm poucos sinais no começo).
      if (q.busca && tipos.length === 1 && tipos[0] === 'low') tipos = ['low', 'indefinido'];
      const lista = (await rankingPaginas({ pais, nicho: q.nicho || '', min: Number(q.min || 0), minDias: Number(q.dias || 0), gateway: q.gateway || '',
        tipo: tipos.length === 1 ? tipos[0] : '', precoMax: q.ids ? 0 : Number(q.precoMax || 0), semPreco: q.semPreco !== '0', idioma: q.idioma || '' }))
        .filter((x) => tipos.length < 2 || tipos.includes(x.tipo));
      return json(res, filtrarRanking(lista, q, q.busca ? await paginasComTermos(q.busca, pais) : null));
    }
    if (rota === '/api/busca') {
      // Autocompletar da busca global: anunciantes, sites, checkouts e gateways num resultado só.
      const t = `%${String(q.q || '').toLowerCase().trim()}%`;
      if (t.length < 4) return json(res, { anunciantes: [], dominios: [], checkouts: [], gateways: [] });
      const [anunciantes, dominios, checkouts] = await Promise.all([
        all(`SELECT p.page_id, p.nome, p.foto, MAX(h.ativos) ativos FROM paginas p LEFT JOIN historico_diario h ON h.page_id = p.page_id AND h.pais = ?
          WHERE LOWER(p.nome) LIKE ? GROUP BY p.page_id, p.nome, p.foto ORDER BY MAX(h.ativos) DESC LIMIT 6`, [pais, t]),
        all(`SELECT dominio, COUNT(*) n FROM anuncios WHERE ativo = 1 AND pais = ? AND LOWER(dominio) LIKE ? GROUP BY dominio ORDER BY COUNT(*) DESC LIMIT 5`, [pais, t]),
        all('SELECT checkout, gateway, produto, preco FROM checkouts WHERE LOWER(checkout) LIKE ? OR LOWER(produto) LIKE ? LIMIT 5', [t, t]),
      ]);
      const gws = GATEWAYS.filter((g) => `${g.id} ${g.nome} ${g.raiz}`.toLowerCase().includes(t.slice(1, -1))).slice(0, 4).map((g) => ({ id: g.id, nome: g.nome }));
      return json(res, { anunciantes, dominios, checkouts, gateways: gws });
    }
    if (rota === '/api/busca-semantica' && req.method === 'POST') {
      const b = await corpo(req);
      const { buscarPorSignificado, colunaVetorExiste } = await import('./embeddings.js');
      if (!(await colunaVetorExiste())) return json(res, { erro: 'Busca por significado ainda não ativada no banco.' }, 400);
      return json(res, await buscarPorSignificado(b.vetor, String(b.pais || pais).toUpperCase(), Math.min(Number(b.limite || 48), 120)));
    }
    if (rota === '/api/validacao') {
      // Validação do site com APIs públicas grátis. GET lê a última; POST roda de novo (leva de 5 a 40 s).
      const { validarDominio, lerValidacao } = await import('./validacao.js');
      if (req.method === 'POST') { const b = await corpo(req); if (!b.dominio) return json(res, { erro: 'informe o domínio' }, 400); return json(res, await validarDominio(b.dominio)); }
      return json(res, (q.dominio && (await lerValidacao(q.dominio))) || null);
    }
    if (rota.startsWith('/api/ia/')) {
      const ia = await import('./ia.js');
      const { lerTranscricao, salvarTranscricao } = await import('./transcricao.js');
      const anuncio = async (adId) => {
        const a = await get('SELECT ad_id, titulo, texto, dup, inicio, video, page_name FROM anuncios WHERE ad_id = ?', [String(adId)]);
        if (a) a.dias = a.inicio ? Math.floor((Date.now() / 1000 - a.inicio) / 86400) : null;
        return a;
      };
      if (rota === '/api/ia/estado') return json(res, { provedores: ia.provedores(), aviso: ia.AVISO_GEMINI, tipos: ia.TIPOS_GERACAO });
      if (rota === '/api/ia/criativo') {
        const b = req.method === 'POST' ? await corpo(req) : q;
        const a = await anuncio(b.ad_id);
        if (!a) return json(res, { erro: 'anúncio não encontrado' }, 404);
        const tr = await lerTranscricao(a.ad_id);
        const entrada = { ad_id: a.ad_id, tr: !!tr };
        if (req.method !== 'POST') return json(res, { ...((await ia.lerCache(ia.chaveCache('criativo', entrada))) || {}), transcricao: tr });
        return json(res, { ...(await ia.gerar({ tarefa: 'criativo', entrada, prompt: ia.promptAnaliseCriativo(a, tr?.texto), validar: ia.validarAnalise })), transcricao: tr });
      }
      if (rota === '/api/ia/gerar' && req.method === 'POST') {
        const b = await corpo(req);
        if (!ia.TIPOS_GERACAO[b.tipo]) return json(res, { erro: 'tipo inválido' }, 400);
        const entrada = { tipo: b.tipo, ad_id: b.ad_id || null, produto: String(b.produto || '').slice(0, 300), base: b.ad_id ? null : b.analise };
        let analise = b.analise;
        if (b.ad_id && !analise) { const tr = await lerTranscricao(b.ad_id); analise = (await ia.lerCache(ia.chaveCache('criativo', { ad_id: String(b.ad_id), tr: !!tr })))?.resultado; }
        if (!analise) return json(res, { erro: 'analise o criativo primeiro' }, 400);
        return json(res, await ia.gerar({ tarefa: 'gerar_' + b.tipo, entrada, prompt: ia.promptGeracao(b.tipo, analise, entrada.produto) }));
      }
      if (rota === '/api/ia/salvar' && req.method === 'POST') {
        // Resultado gerado no navegador (chave do próprio usuário ou modelo local) também vai para o cache.
        const b = await corpo(req);
        if (!/^[a-z_]+:[0-9a-f]{24}$/.test(String(b.chave || '')) || !b.resultado) return json(res, { erro: 'dados inválidos' }, 400);
        await ia.salvarCache(b.chave, String(b.chave).split(':')[0], b.resultado, String(b.provedor || 'navegador').slice(0, 20));
        return json(res, { ok: true });
      }
      if (rota === '/api/ia/transcricao' && req.method === 'POST') {
        const b = await corpo(req);
        if (!b.ad_id || !b.texto) return json(res, { erro: 'dados inválidos' }, 400);
        await salvarTranscricao(String(b.ad_id), String(b.texto), b.idioma, String(b.fonte || 'navegador').slice(0, 20));
        return json(res, { ok: true });
      }
      return json(res, { erro: 'rota de IA não encontrada' }, 404);
    }
    if (rota === '/api/padroes' || rota === '/api/padroes/resumo') {
      // Padrões vencedores do nicho: hooks, formatos e CTAs mais duplicados (SQL) + resumo semanal por IA (cache).
      const b = req.method === 'POST' ? await corpo(req) : q;
      const nicho = String(b.nicho || '');
      const ads = await all(`SELECT a.texto, a.titulo, a.dup, a.formato, a.cta, a.inicio, a.texto_hash FROM anuncios a JOIN paginas p ON p.page_id = a.page_id
        WHERE a.ativo = 1 AND a.pais = ? AND COALESCE(p.tipo, 'indefinido') IN ('low', 'info_alto', 'indefinido') ${nicho ? 'AND p.nichos LIKE ?' : ''}
        ORDER BY a.dup DESC LIMIT 500`, nicho ? [pais, `%"${nicho}"%`] : [pais]);
      const vistos = new Set(), hooks = [], formatos = {}, ctas = {}, palavras = {};
      const PARADA = new Set('a o e de da do das dos que para com em um uma no na os as por se seu sua você mais não é ao à como já ou'.split(' '));
      for (const a of ads) {
        formatos[a.formato || '?'] = (formatos[a.formato || '?'] || 0) + (a.dup || 1);
        if (a.cta) ctas[a.cta] = (ctas[a.cta] || 0) + (a.dup || 1);
        if (!a.texto || vistos.has(a.texto_hash)) continue;
        vistos.add(a.texto_hash);
        const h = String(a.texto).split(/(?<=[.!?])\s|\n/)[0].trim().slice(0, 160);
        if (h.length > 12 && hooks.length < 15) hooks.push({ hook: h, dup: a.dup || 1, dias: a.inicio ? Math.floor((Date.now() / 1000 - a.inicio) / 86400) : null });
        for (const w of h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]{4,}/g) || []) if (!PARADA.has(w)) palavras[w] = (palavras[w] || 0) + 1;
      }
      const ordem = (o, n) => Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, n);
      const top20 = ads.slice(0, 20).filter((a) => a.inicio);
      const dados = { nicho, total: ads.length, hooks, formatos: ordem(formatos, 6), ctas: ordem(ctas, 8), palavras: ordem(palavras, 20),
        idadeMediaTop: top20.length ? Math.round(top20.reduce((s, a) => s + (Date.now() / 1000 - a.inicio) / 86400, 0) / top20.length) : null };
      const ia = await import('./ia.js');
      const semana = new Date(); semana.setDate(semana.getDate() - semana.getDay());
      const entrada = { nicho, pais, semana: semana.toISOString().slice(0, 10) };
      if (rota === '/api/padroes') return json(res, { ...dados, resumo: (await ia.lerCache(ia.chaveCache('padroes', entrada)))?.resultado || null });
      const prompt = `Você analisa anúncios de infoprodutos low ticket. Com estes dados dos criativos mais duplicados do nicho "${nicho || 'todos'}" (${pais}), resuma os padrões vencedores.
Responda APENAS JSON em português: {"resumo": "3 frases", "estruturas_de_hook": ["5 fórmulas de hook com lacunas, ex.: 'Como [resultado] sem [sacrifício]'"], "formatos": "o que mais funciona", "ctas": "o que mais funciona", "o_que_testar": ["3 testes"]}
Dados: ${JSON.stringify(dados).slice(0, 6000)}`;
      return json(res, await ia.gerar({ tarefa: 'padroes', entrada, prompt }));
    }
    if (rota.startsWith('/api/projetos')) {
      // Projetos do usuário (hoje: diário de testes): /api/projetos?tipo=teste, /api/projetos/123 (GET/POST/DELETE).
      const pj = await import('./projetos.js');
      const idP = rota.split('/')[3];
      if (!idP) {
        if (req.method === 'POST') { const b = await corpo(req); return json(res, await pj.salvarProjeto(b)); }
        return json(res, await pj.listarProjetos(String(q.tipo || 'teste')));
      }
      if (req.method === 'DELETE') { await pj.apagarProjeto(idP); return json(res, { ok: true }); }
      if (req.method === 'POST') { const b = await corpo(req); return json(res, await pj.salvarProjeto({ ...b, id: idP })); }
      return json(res, (await pj.lerProjeto(idP)) || { erro: 'não encontrado' }, 200);
    }
    if (rota === '/api/vendas/resumo') { const { resumoVendas } = await import('./vendas.js'); return json(res, { ...(await resumoVendas(Number(q.dias || 30))), webhook: !!process.env.WEBHOOK_TOKEN }); }
    if (rota.startsWith('/api/meta/')) {
      const meta = await import('./meta.js');
      if (!meta.metaConfigurada()) return json(res, { semConfig: true });
      if (rota === '/api/meta/conta') return json(res, await meta.checkupConta());
      if (rota === '/api/meta/desempenho') return json(res, await meta.desempenho({ dias: Number(q.dias || 7), ticket: Number(q.ticket || 0), cpaAlvo: Number(q.cpaAlvo || 0), cpaMax: Number(q.cpaMax || 0) }));
      return json(res, { erro: 'rota não encontrada' }, 404);
    }
    if (rota === '/api/extensao-chave') {
      // Gera (ou mostra) a chave pessoal da extensão do Chrome.
      let r = await get("SELECT valor FROM prefs WHERE user_id = ? AND chave = 'extensao'", [uid()]);
      if (!r || req.method === 'POST') {
        const nova = (await import('node:crypto')).randomBytes(24).toString('base64url');
        await run("INSERT INTO prefs (user_id, chave, valor) VALUES (?, 'extensao', ?) ON CONFLICT(user_id, chave) DO UPDATE SET valor = excluded.valor", [uid(), nova]);
        r = { valor: nova };
      }
      return json(res, { chave: r.valor });
    }
    if (rota.startsWith('/api/push/') || rota === '/api/alertas/teste' || rota === '/api/relatorio') {
      const al = await import('./alertas.js');
      if (rota === '/api/push/chave') { const k = await al.chavesVapid(); return json(res, { chave: k?.publicKey || null }); }
      if (rota === '/api/push/inscrever' && req.method === 'POST') { await al.inscreverPush(uid(), (await corpo(req)).inscricao); return json(res, { ok: true }); }
      if (rota === '/api/push/sair' && req.method === 'POST') { await al.sairPush((await corpo(req)).endpoint); return json(res, { ok: true }); }
      if (rota === '/api/alertas/teste' && req.method === 'POST') return json(res, await al.avisar('🔔 Teste de alerta', 'Se você está lendo isto, os alertas estão funcionando.'));
      if (rota === '/api/relatorio') return json(res, { ...(await al.relatorio({ pais })), telegram: !!process.env.TELEGRAM_BOT_TOKEN, canal: !!process.env.TELEGRAM_CANAL_ID});
    }
    if (rota === '/api/ocultar' && req.method === 'POST') {
      // Esconde um anunciante para sempre: entra na lista de bloqueio e some das listas na hora.
      const b = await corpo(req);
      const pg = b.page_id ? await get('SELECT page_id, nome FROM paginas WHERE page_id = ?', [String(b.page_id)]) : null;
      if (!pg) return json(res, { erro: 'anunciante não encontrado' }, 404);
      const cfg = await lerConfig();
      const lista = cfg.bloqueio || [];
      if (!lista.some((x) => x.toLowerCase() === pg.nome.toLowerCase())) await salvarConfig({ ...cfg, bloqueio: [...lista, pg.nome] });
      await run("UPDATE paginas SET tipo = 'marca', tipo_motivo = 'ocultado por você' WHERE page_id = ?", [pg.page_id]);
      return json(res, { ok: true, nome: pg.nome });
    }
    if (rota === '/api/prefs' && req.method === 'GET') {
      const r = await get("SELECT valor FROM prefs WHERE user_id = ? AND chave = 'perfil'", [uid()]);
      return json(res, r ? JSON.parse(r.valor) : {});
    }
    if (rota === '/api/prefs' && req.method === 'POST') {
      const b = await corpo(req);
      await run("INSERT INTO prefs (user_id, chave, valor) VALUES (?, 'perfil', ?) ON CONFLICT(user_id, chave) DO UPDATE SET valor = excluded.valor", [uid(), JSON.stringify(b)]);
      return json(res, { ok: true });
    }
    if (rota === '/api/ofertas-agrupadas') {
      // Oferta = checkout (ou site): várias páginas no mesmo checkout aparecem juntas.
      const f = ['pais = ?'], p = [pais];
      const tiposCk = String(q.tipo ?? 'low').split(',').filter(Boolean);
      if (tiposCk.length) { f.push(`COALESCE(tipo, 'indefinido') IN (${tiposCk.map(() => '?').join(', ')})`); p.push(...tiposCk); }
      if (Number(q.precoMax)) { f.push(q.semPreco !== '0' ? '(preco_brl IS NULL OR preco_brl <= ?)' : 'preco_brl <= ?'); p.push(Number(q.precoMax)); }
      if (q.idioma) { f.push('(idioma IS NULL OR idioma = ?)'); p.push(q.idioma); }
      if (q.gateway) { f.push('gateway = ?'); p.push(q.gateway); }
      const lista = await all(`SELECT * FROM ofertas WHERE ${f.join(' AND ')} ORDER BY ativos_paginas DESC, anuncios DESC LIMIT 300`, p);
      const membros = lista.length ? await all(`SELECT m.oferta_id, m.page_id, p.nome FROM oferta_membros m JOIN paginas p ON p.page_id = m.page_id
        WHERE m.oferta_id IN (${lista.map(() => '?').join(', ')})`, lista.map((o) => o.id)) : [];
      for (const o of lista) { o.dominios = JSON.parse(o.dominios || '[]'); o.membros = membros.filter((m) => m.oferta_id === o.id); }
      return json(res, lista);
    }
    if (rota === '/api/ofertas') return json(res, await rankingDominios({ pais, nicho: q.nicho || '' }));
    if (rota.startsWith('/api/pagina/')) return json(res, await detalhePagina(decodeURIComponent(rota.split('/').pop()), pais));
    if (rota === '/api/gateways') return json(res, await resumoGateways(pais));
    if (rota.startsWith('/api/gateway/')) return json(res, await rankingGateway(decodeURIComponent(rota.split('/').pop()), pais));
    if (rota === '/api/analises') return json(res, await listaAnalises());
    if (rota === '/api/analise') {
      const d = hostDe(q.url || '');
      return json(res, { dados: d ? await lerAnalise(d) : null, links: d ? linksExternos(d, q.nome || '') : null });
    }
    if (rota === '/api/links') return json(res, linksExternos(q.dominio || '', q.nome || ''));
    if (rota === '/api/anuncios') {
      // Biblioteca de criativos salvos (swipe): filtros por texto, formato e mínimo de duplicações.
      const filtros = ['ativo = 1', 'pais = ?'], p = [pais];
      if (q.marcas !== '1') filtros.push("page_id NOT IN (SELECT page_id FROM paginas WHERE tipo = 'marca')");
      if (q.texto) {
        const { f, p: pt } = filtroTermos(q.texto); filtros.push(...f); p.push(...pt);
      }
      if (q.formato) { filtros.push('formato = ?'); p.push(q.formato); }
      if (q.dup) { filtros.push('dup >= ?'); p.push(Number(q.dup)); }
      if (q.cta) { filtros.push('LOWER(cta) LIKE ?'); p.push(`%${q.cta.toLowerCase()}%`); }
      if (q.plataforma) { filtros.push('plataformas LIKE ?'); p.push(`%${q.plataforma}%`); }
      if (q.gateway) { filtros.push('gateway = ?'); p.push(q.gateway); }
      if (q.dias) { filtros.push('inicio <= ?'); p.push(Math.floor(Date.now() / 1000) - Number(q.dias) * 86400); }
      const ordem = q.ordem === 'novos' ? 'inicio DESC' : q.ordem === 'antigos' ? 'inicio ASC' : 'dup DESC, inicio ASC';
      p.push(Math.min(Number(q.limite || 120), 300));
      return json(res, await all(`SELECT ad_id, page_id, page_name, ativo, inicio, dup, formato, plataformas, SUBSTR(texto, 1, 600) texto, titulo, link, cta, CASE WHEN thumb_arquivo IS NOT NULL THEN '/api/midia/' || ad_id ELSE thumb END AS thumb, video, gateway
        FROM anuncios WHERE ${filtros.join(' AND ')} ORDER BY ${ordem} LIMIT ?`, p));
    }

    if (rota === '/api/favoritos' && req.method === 'GET') return json(res, await listaFavoritos(pais));
    if (rota === '/api/favoritos' && req.method === 'POST') {
      const b = await corpo(req);
      if (!b.tipo || !b.chave) return json(res, { erro: 'tipo e chave obrigatórios' }, 400);
      const chave = [uid(), b.tipo, String(b.chave)];
      if (b.remover) { await run('DELETE FROM favoritos WHERE user_id = ? AND tipo = ? AND chave = ?', chave); return json(res, { ok: true }); }
      const atual = await get('SELECT * FROM favoritos WHERE user_id = ? AND tipo = ? AND chave = ?', chave);
      // Atualização parcial: só muda o que veio (etapa do funil, tags, pasta, nota ou nome).
      const v = { nome: b.nome ?? atual?.nome ?? '', nota: b.nota ?? atual?.nota ?? '', etapa: b.etapa ?? atual?.etapa ?? 'minerada',
        tags: JSON.stringify(b.tags ?? JSON.parse(atual?.tags || '[]')), pasta: b.pasta ?? atual?.pasta ?? '' };
      await run(`INSERT INTO favoritos (user_id, tipo, chave, nome, nota, etapa, tags, pasta, criado, atualizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, tipo, chave) DO UPDATE SET nome = excluded.nome, nota = excluded.nota, etapa = excluded.etapa, tags = excluded.tags,
          pasta = excluded.pasta, atualizado = excluded.atualizado`, [...chave, v.nome, v.nota, v.etapa, v.tags, v.pasta, agora(), agora()]);
      return json(res, { ok: true });
    }

    if (rota === '/api/config' && req.method === 'GET') return json(res, { ...(await lerConfig()), gateways: GATEWAYS, nuvem: NUVEM });
    if (rota === '/api/config' && req.method === 'POST') {
      const c = await corpo(req);
      if (!c.nichos || typeof c.nichos !== 'object') return json(res, { erro: 'config inválida' }, 400);
      delete c.gateways; delete c.nuvem;
      await salvarConfig(c);
      return json(res, { ok: true });
    }

    if (rota === '/api/tarefa' && req.method === 'POST') {
      const r = await enfileirar(await corpo(req));
      return json(res, r, r.erro ? 400 : 200);
    }
    if (rota === '/api/foco') {
      // Foco num nicho ou num termo digitado: o robô busca na hora e o painel mostra os resultados chegando.
      // Sem "forcar", só busca se a última busca tiver mais de 6 h; com "forcar" (o usuário escolheu agora), só evita repetir em menos de 15 min.
      const b = req.method === 'POST' ? await corpo(req) : q;
      const termo = String(b.termo || '').trim().slice(0, 80);
      const nicho = termo ? '' : String(b.nicho || ''), paisF = String(b.pais || pais).toUpperCase();
      if (!nicho && !termo) return json(res, { erro: 'informe o nicho ou o termo' }, 400);
      const desc = termo ? `Minerando: ${termo}` : `Minerando nicho ${nicho} (${paisF})`;
      const tarefa = NUVEM ? await get('SELECT id, status, log, inicio, fim, criado FROM tarefas WHERE descricao = ? ORDER BY id DESC LIMIT 1', [desc])
        : local.descricao === desc ? { status: local.rodando ? 'rodando' : 'concluido', log: local.log.join('\n'), inicio: local.inicio / 1000, fim: local.fim ? local.fim / 1000 : null }
        : local.fila.some((x) => x.descricao === desc) ? { status: 'pendente', log: `Na fila: o robô está terminando "${local.descricao}"` } : null;
      if (NUVEM && tarefa?.status === 'pendente') {
        const ativa = await get("SELECT descricao FROM tarefas WHERE status = 'rodando' ORDER BY id DESC LIMIT 1");
        if (ativa) tarefa.log = `Na fila: o robô está terminando "${ativa.descricao.replace(/^Minerando:? /, '')}"`;
      }
      const ultima = (termo ? await get('SELECT MAX(quando) q FROM buscas WHERE LOWER(palavra) = LOWER(?) AND pais = ?', [termo, paisF])
        : await get('SELECT MAX(quando) q FROM buscas WHERE nicho = ? AND pais = ?', [nicho, paisF]))?.q || null;
      const estado = { nicho, termo, pais: paisF, ultimaBusca: ultima, status: tarefa?.status || null, rodando: ['pendente', 'rodando'].includes(tarefa?.status),
        log: String(tarefa?.log || '').split('\n').filter(Boolean).slice(-6), viva: Date.now() / 1000 - Number((await get("SELECT valor FROM ajustes WHERE chave = 'fila_viva'"))?.valor || 0) < 25 };
      if (req.method !== 'POST') return json(res, estado);
      if (estado.rodando) return json(res, { ...estado, aviso: 'o robô já está buscando este nicho' });
      if (ultima && agora() - ultima < (b.forcar ? 15 * 60 : 6 * 3600)) return json(res, { ...estado, recente: true });
      if (nicho && !(await lerConfig()).nichos?.[nicho]) return json(res, { erro: 'nicho não existe nas Configurações' }, 400);
      // Busca ao vivo é leve (sem raio-X de sites, 8 anunciantes contados): os anúncios aparecem em 1 a 2 minutos.
      // O raio-X dos sites fica para as rodadas automáticas do robô.
      const r = await enfileirar(termo ? { tipo: 'minerar', palavras: termo, nicho: 'Avulso', pais: paisF, top: 8, sites: 0 }
        : { tipo: 'minerar', nicho, pais: paisF, top: 8, sites: 0 }, 'foco');
      return json(res, { ...estado, ...r, rodando: !!r.iniciado, status: 'pendente' });
    }
    if (rota === '/api/tarefa') return json(res, await estadoTarefa());
    if (rota === '/api/historico-tarefas') return json(res, await all('SELECT id, tipo, descricao, status, erro, criado, inicio, fim FROM tarefas ORDER BY id DESC LIMIT 30'));
    if (rota === '/api/uso') return json(res, await usoELimites());

    return json(res, { erro: 'rota não encontrada' }, 404);
  } catch (e) {
    console.error(e);
    return json(res, { erro: String(e?.message || e) }, 500);
  }
}
