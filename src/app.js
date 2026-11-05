// API do painel. Usada pelo servidor local (src/server.js) e pela função da Vercel (api/index.js).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  paisesComDados, rankingPaginas, rankingDominios, rankingGateway, resumoGateways, detalhePagina, painelGeral, listaAnalises, listaFavoritos,
} from './score.js';
import { all, get, run, iniciar, agora, lerAnalise, lerConfig, salvarConfig } from './db.js';
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
function filtrarRanking(lista, q) {
  const sim = (v) => v === '1' || v === 'true';
  const busca = String(q.busca || '').toLowerCase();
  const nichos = String(q.nichos || '').split('|').filter(Boolean);
  let r = lista.filter((x) => (!nichos.length || nichos.some((n) => (x.nichos || []).includes(n))) && (!q.status || x.status === q.status) && (!q.funil || x.funil === q.funil) && (!q.formato || x.formato === q.formato)
    && (!sim(q.vsl) || x.temVsl) && (!sim(q.quiz) || x.temQuiz) && (!sim(q.checkout) || x.checkoutConhecido) && (!sim(q.plr) || x.plr)
    && (!sim(q.acelerando) || ['Nova acelerando', 'Escalando agora'].includes(x.status)) && (!sim(q.gringa) || x.semEquivalenteBR)
    && (!busca || [x.nome, x.produto, ...(x.dominios || [])].join(' ').toLowerCase().includes(busca)));
  r = r.sort(ORDENS[q.ordem] || ORDENS.score);
  if (q.ids) { const ids = String(q.ids).split(','); r = lista.filter((x) => ids.includes(x.page_id)); }
  const por = Math.min(Math.max(Number(q.por || 48), 1), 200), pagina = Math.max(Number(q.pagina || 1), 1);
  return { total: r.length, pagina, por, itens: r.slice((pagina - 1) * por, pagina * por) };
}

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NUVEM = !!process.env.VERCEL || process.env.MODO === 'nuvem';

// ----- execução de tarefas -----
// Local: roda o coletor como processo filho. Nuvem: grava na fila e aciona o GitHub Actions.
const local = { rodando: false, tipo: null, descricao: '', log: [], inicio: null, fim: null, codigo: null };

function rodarLocal(tipo, args, descricao) {
  if (local.rodando) return false;
  Object.assign(local, { rodando: true, tipo, descricao, log: [], inicio: Date.now(), fim: null, codigo: null });
  const p = spawn(process.execPath, ['--no-warnings', path.join(raiz, 'src', 'tarefa.js'), tipo, ...args], {
    cwd: raiz, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  const add = (b) => { for (const l of b.toString().split(/\r?\n/)) if (l.trim()) local.log.push(l); local.log = local.log.slice(-500); };
  p.stdout.on('data', add);
  p.stderr.on('data', add);
  p.on('close', (c) => Object.assign(local, { rodando: false, fim: Date.now(), codigo: c }));
  return true;
}

async function acionarGithub() {
  const { GITHUB_TOKEN: token, GITHUB_REPO: repo } = process.env;
  if (!token || !repo) return 'sem GITHUB_TOKEN/GITHUB_REPO: a fila será processada na próxima rodada agendada';
  const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/minerador.yml/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'minerador-ofertas' },
    body: JSON.stringify({ ref: process.env.GITHUB_REF || 'main', inputs: { tarefa: 'fila' } }),
  });
  return r.ok ? 'robô acionado no GitHub Actions (começa em ~1 min)' : `falha ao acionar GitHub (${r.status})`;
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
    desc = b.palavras ? `Minerando: ${b.palavras}` : `Minerando nicho ${b.nicho || 'todos'}`;
  } else if (b.tipo === 'gateway') {
    a.push('--gateway', String(b.gateway)); if (b.max) a.push('--max', String(b.max));
    desc = `Ofertas mais anunciadas em ${b.gateway}`;
  } else if (b.tipo === 'analisar') {
    a.push('--url', String(b.url)); desc = `Raio-X de ${b.url}`;
  } else if (b.tipo === 'atualizar') {
    desc = 'Atualizando contagens';
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
  const rotaPublica = /^\/api\/(publico|midia)\//.test(new URL(req.url, 'http://x').pathname);
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
    await iniciar();

    const pais = String(q.pais || 'BR').toUpperCase();
    if (rota === '/api/paises') return json(res, await paisesComDados());
    if (rota === '/api/painel') return json(res, await painelGeral(pais));
    if (rota === '/api/paginas') {
      const tipos = q.ids ? [] : String(q.tipo ?? 'low').split(',').filter(Boolean);
      const lista = (await rankingPaginas({ pais, nicho: q.nicho || '', min: Number(q.min || 0), minDias: Number(q.dias || 0), gateway: q.gateway || '',
        tipo: tipos.length === 1 ? tipos[0] : '', precoMax: q.ids ? 0 : Number(q.precoMax || 0), semPreco: q.semPreco !== '0', idioma: q.idioma || '' }))
        .filter((x) => tipos.length < 2 || tipos.includes(x.tipo));
      return json(res, filtrarRanking(lista, q));
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
      if (q.texto) { filtros.push('(LOWER(texto) LIKE ? OR LOWER(titulo) LIKE ? OR LOWER(page_name) LIKE ?)'); const t = `%${q.texto.toLowerCase()}%`; p.push(t, t, t); }
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
      const b = await corpo(req);
      const m = montarArgs(b);
      if (!m) return json(res, { erro: 'tipo inválido' }, 400);
      if (!NUVEM) return json(res, { iniciado: rodarLocal(b.tipo, m.args, m.desc), tarefa: local });
      await run('INSERT INTO tarefas (tipo, args, descricao, user_id, origem, criado) VALUES (?, ?, ?, ?, ?, ?)',
        [b.tipo, JSON.stringify(m.args), m.desc, uid(), 'painel', agora()]);
      return json(res, { iniciado: true, aviso: await acionarGithub() });
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
