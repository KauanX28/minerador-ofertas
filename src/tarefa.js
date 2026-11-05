// Linha de comando do Minerador. Exemplos:
//   node src/tarefa.js minerar                         (todos os nichos da configuração)
//   node src/tarefa.js minerar --nicho Emagrecimento --pais BR,MX
//   node src/tarefa.js minerar --palavras "renda extra, acesso imediato" --nicho Avulso
//   node src/tarefa.js gateway --gateway kiwify        (ofertas mais anunciadas no gateway)
//   node src/tarefa.js analisar --url exemplo.com.br
//   node src/tarefa.js atualizar                       (reconta anúncios das páginas acompanhadas)
//   node src/tarefa.js rotina                          (monitoramento automático: fila + rodízio de nichos/gateways)
//   node src/tarefa.js fila                            (só os pedidos feitos pelo painel)
//   node src/tarefa.js manutencao                      (retenção do banco, limpeza de miniaturas, alerta de limites)
// Opções gerais: --pais BR | ALL | PT | ES ...   --visivel (mostra o navegador)
import { abrirNavegador, buscarPalavra, buscarPagina, pausa, BloqueioError, EstruturaError, estatisticas, registrarColetas } from './scraper.js';
import {
  all, get, run, iniciar, agora, recalcularChaves, salvarAnuncios, salvarHistorico, salvarBusca, marcarInativos,
  salvarCheckout, salvarAnalise, lerAnalise, lerConfig,
} from './db.js';
import { fechar, usaPostgres } from './banco.js';
import { alertar } from './alerta.js';
import { processarMiniaturas, limparMiniaturas } from './midia.js';
import { usoELimites } from './uso.js';
import { rankingPaginas } from './score.js';
import { analisarPagina, lerCheckout } from './analisador.js';
import { gatewayPorTexto, hostDe, detectarGateway, raizDominio, GATEWAYS } from './util.js';

let log = (...m) => console.log(...m);

function lerArgs(lista) {
  const o = { _: [] };
  for (let i = 0; i < lista.length; i++) {
    if (!lista[i].startsWith('--')) { o._.push(lista[i]); continue; }
    const k = lista[i].slice(2), v = lista[i + 1] !== undefined && !lista[i + 1].startsWith('--') ? lista[++i] : true;
    o[k] = v;
  }
  return o;
}

// ---------- passos reutilizáveis ----------

async function aprofundarPaginas(ctx, o, pageIds, nicho) {
  let i = 0;
  for (const id of pageIds) {
    i++;
    const r = await buscarPagina(ctx, id, { pais: o.pais });
    if (r.total != null) {
      await salvarHistorico(id, o.pais, r.total);
      await salvarAnuncios(r.anuncios, { nicho, pais: o.pais });
      if (r.anuncios.length >= r.total) await marcarInativos(id, o.pais, r.anuncios.map((a) => a.ad_id));
    }
    log(`  [${i}/${pageIds.length}] ${r.anuncios[0]?.page_name || id}: ${r.total ?? '?'} anúncios ativos (${o.pais})`);
    await pausa();
  }
}

// Raio-X do site + conferência de rota na Biblioteca (quantos anúncios e quantas páginas usam o domínio).
async function analisarDominio(ctx, o, url, { aprofundar = 5, max = 80 } = {}) {
  log(`> Analisando ${url} ...`);
  const r = await analisarPagina(ctx, url);
  if (!r.ok) log(`  não abriu: ${r.erro || r.status}`);
  const dominio = r.dominio || hostDe(url);
  if (r.checkouts?.length) {
    const c = r.checkouts[0];
    const info = await lerCheckout(ctx, c.url);
    Object.assign(c, info);
    await salvarCheckout({ ...c, url: c.url });
    log(`  checkout ${c.checkout}: ${info.produto || '?'} | ${info.preco || '?'}`);
  }
  let biblioteca = null;
  if (dominio && !detectarGateway('https://' + dominio + '/x')) {
    const alvo = raizDominio(hostDe(url) || dominio);
    log(`> Conferência de rota: anúncios que levam para ${alvo}`);
    const b = await buscarPalavra(ctx, alvo, { pais: o.pais, maxAnuncios: max, log: () => {} });
    const proprios = b.anuncios.filter((a) => (a.link || '').includes(alvo) || (a.texto || '').includes(alvo));
    await salvarAnuncios(proprios.length ? proprios : b.anuncios, { palavra: alvo, pais: o.pais });
    await salvarBusca({ palavra: alvo, pais: o.pais, total: b.total, coletados: b.anuncios.length });
    const porPagina = new Map();
    for (const a of b.anuncios) {
      const p = porPagina.get(a.page_id) || { page_id: a.page_id, nome: a.page_name, anuncios: 0, inicio: a.inicio };
      p.anuncios += 1; p.inicio = Math.min(p.inicio || Infinity, a.inicio || Infinity);
      porPagina.set(a.page_id, p);
    }
    const paginas = [...porPagina.values()].sort((x, y) => y.anuncios - x.anuncios);
    log(`  ~${b.total ?? '?'} anúncios ativos em ${paginas.length} página(s)`);
    if (aprofundar && paginas.length) await aprofundarPaginas(ctx, o, paginas.slice(0, aprofundar).map((p) => p.page_id));
    biblioteca = { total: b.total, paginas: paginas.slice(0, 15).map((p) => ({ ...p, inicio: Number.isFinite(p.inicio) ? p.inicio : null })) };
  }
  const dados = { ...r, dominio, biblioteca };
  if (dominio) await salvarAnalise(dominio, url, dados);
  return dados;
}

// ---------- tarefas ----------

// Vários países (--pais "BR,MX"): cada um é minerado separado, para não misturar mercados.
async function minerar(ctx, o) {
  const paises = String(o.pais).split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
  if (paises.length > 1) { for (const p of paises) await minerar(ctx, { ...o, pais: p }); return; }
  const config = await lerConfig();
  let tarefas = [];
  if (typeof o.palavras === 'string') {
    tarefas = [{ nicho: typeof o.nicho === 'string' ? o.nicho : 'Avulso', palavras: o.palavras.split(',').map((s) => s.trim()).filter(Boolean) }];
  } else {
    const nichos = typeof o.nicho === 'string' ? [o.nicho] : Object.keys(config.nichos);
    for (const n of nichos) {
      if (!config.nichos[n]) throw new Error(`Nicho "${n}" não existe na configuração`);
      tarefas.push({ nicho: n, palavras: config.nichos[n] });
    }
  }
  const max = Number(o.max || config.maxAnunciosPorPalavra || 150);
  const top = Number(o.top || config.paginasParaAprofundar || 25);
  const sites = Number(o.sites ?? config.sitesParaAnalisar ?? 8);
  for (const { nicho, palavras } of tarefas) {
    log(`\n=== Nicho: ${nicho} (${o.pais}) ===`);
    const contagem = new Map();
    for (const palavra of palavras) {
      log(`> Buscando "${palavra}"...`);
      const r = await buscarPalavra(ctx, palavra, { pais: o.pais, maxAnuncios: max, log });
      await salvarAnuncios(r.anuncios, { nicho, palavra, pais: o.pais });
      await salvarBusca({ palavra, nicho, pais: o.pais, total: r.total, coletados: r.anuncios.length });
      for (const a of r.anuncios) contagem.set(a.page_id, (contagem.get(a.page_id) || 0) + 1 + Math.log2(a.dup || 1));
      log(`  ${r.anuncios.length} anúncios lidos de ~${r.total ?? '?'} no total`);
      await pausa();
    }
    const candidatas = [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, top).map(([id]) => id);
    log(`> Contando anúncios ativos das ${candidatas.length} páginas mais promissoras...`);
    await aprofundarPaginas(ctx, o, candidatas, nicho);

    if (sites > 0) {
      const limite = agora() - 3 * 86400;
      const dominios = (await rankingPaginas({ nicho, pais: o.pais })).flatMap((p) => p.dominios.map((d) => d.split('/')[0]))
        .filter((d, i, arr) => d && arr.indexOf(d) === i && !detectarGateway('https://' + d + '/x'));
      const pend = [];
      for (const d of dominios) { if (((await lerAnalise(d))?.quando || 0) < limite) pend.push(d); if (pend.length >= sites) break; }
      if (pend.length) log(`> Raio-X dos ${pend.length} sites mais escalados (gateway, preço, VSL)...`);
      for (const d of pend) { await analisarDominio(ctx, o, d, { aprofundar: 0, max: 30 }); await pausa(); }
    }
  }
  const nichoFiltro = tarefas.length === 1 ? tarefas[0].nicho : '';
  log(`\n=== TOP ofertas ${nichoFiltro} ===`);
  for (const p of (await rankingPaginas({ nicho: nichoFiltro, pais: o.pais })).slice(0, 12)) {
    log(`  ${String(p.score).padStart(3)} | ${p.status.padEnd(15)} | ${String(p.ativos).padStart(4)} anúncios | ${String(p.dias).padStart(3)} dias | ${p.nome.slice(0, 30)} ${p.dominios[0] ? '→ ' + p.dominios[0] : ''}`);
  }
}

async function gateway(ctx, o) {
  const paises = String(o.pais).split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
  if (paises.length > 1) { for (const p of paises) await gateway(ctx, { ...o, pais: p }); return; }
  const g = gatewayPorTexto(o.gateway || o.url || o._[1]);
  if (!g) throw new Error(`Gateway não reconhecido: ${o.gateway || o.url}. Opções: ${GATEWAYS.map((x) => x.id).join(', ')}`);
  const max = Number(o.max || 300);
  log(`=== Gateway ${g.nome} (${o.pais}) ===`);
  for (const termo of g.busca) {
    log(`> Anúncios que levam para "${termo}"...`);
    const r = await buscarPalavra(ctx, termo, { pais: o.pais, maxAnuncios: max, log });
    await salvarAnuncios(r.anuncios, { palavra: termo, pais: o.pais });
    await salvarBusca({ palavra: termo, nicho: 'gateway:' + g.id, pais: o.pais, total: r.total, coletados: r.anuncios.length });
    log(`  ${r.anuncios.length} anúncios lidos de ~${r.total ?? '?'} no total`);
    await pausa();
  }
  const top = await all(`SELECT checkout, MAX(link) link FROM anuncios WHERE gateway = ? AND pais = ? AND checkout IS NOT NULL AND ativo = 1
    GROUP BY checkout ORDER BY SUM(dup) DESC, COUNT(*) DESC LIMIT ?`, [g.id, o.pais, Number(o.checkouts || 25)]);
  const limite = agora() - 3 * 86400;
  const pendentes = [];
  for (const c of top) if (((await get('SELECT analisado FROM checkouts WHERE checkout = ?', [c.checkout]))?.analisado || 0) < limite) pendentes.push(c);
  log(`> Abrindo ${pendentes.length} checkouts para ler produto e preço...`);
  let i = 0;
  for (const c of pendentes) {
    const info = await lerCheckout(ctx, c.link);
    await salvarCheckout({ checkout: c.checkout, gateway: g.id, url: c.link, ...info });
    log(`  [${++i}/${pendentes.length}] ${c.checkout} → ${info.produto || '?'} | ${info.preco || '?'}${info.ok ? '' : ' (indisponível)'}`);
    await pausa();
  }
  const paginas = (await all(`SELECT page_id FROM anuncios WHERE gateway = ? AND pais = ? AND ativo = 1 GROUP BY page_id ORDER BY SUM(dup) DESC LIMIT ?`,
    [g.id, o.pais, Number(o.paginas || 10)])).map((r) => r.page_id);
  log(`> Contando anúncios ativos das ${paginas.length} páginas que mais anunciam na ${g.nome}...`);
  await aprofundarPaginas(ctx, o, paginas);
  log('Pronto. Veja o ranking na aba Gateways do painel.');
}

async function analisar(ctx, o) {
  const url = o.url || o._[1];
  if (!url || typeof url !== 'string') throw new Error('Informe --url');
  const g = detectarGateway(url.includes('://') ? url : 'https://' + url);
  if (g && !g.checkout) return gateway(ctx, { ...o, gateway: url });
  if (g?.checkout) {
    const info = await lerCheckout(ctx, url);
    await salvarCheckout({ checkout: g.checkout, gateway: g.gateway, url, ...info });
    log(`Checkout ${g.checkout}: ${info.produto || '?'} | ${info.preco || '?'}`);
    log('> Procurando anúncios que levam para esse checkout...');
    const r = await buscarPalavra(ctx, g.checkout, { pais: o.pais, maxAnuncios: 60, log: () => {} });
    await salvarAnuncios(r.anuncios, { palavra: g.checkout, pais: o.pais });
    log(`  ~${r.total ?? '?'} anúncios ativos`);
    return;
  }
  const d = await analisarDominio(ctx, o, url, { aprofundar: Number(o.top ?? 5) });
  log(`\nResumo: ${d.titulo || ''}\n  gateways: ${d.gateways?.join(', ') || '—'} | preços: ${d.precos?.slice(0, 3).join(', ') || '—'}`);
  log(`  VSL: ${d.tecnologia?.vsl?.join(', ') || '—'} | quiz: ${d.tecnologia?.quiz?.join(', ') || '—'} | rastreio: ${d.tecnologia?.rastreio?.join(', ') || '—'}`);
  log(`  sitemap: ${d.sitemap?.length || 0} páginas | Biblioteca: ~${d.biblioteca?.total ?? '?'} anúncios em ${d.biblioteca?.paginas?.length ?? 0} página(s)`);
}

// Reconta cada página no(s) país(es) em que ela é acompanhada.
async function atualizar(ctx, o) {
  const lim = Number(o.limite || 150);
  const pares = await all(`SELECT page_id, pais FROM historico_diario GROUP BY page_id, pais ORDER BY MAX(ativos) DESC LIMIT ?`, [lim]);
  const chave = new Set(pares.map((p) => p.page_id + '|' + p.pais));
  for (const f of await all("SELECT f.chave, p.paises FROM favoritos f LEFT JOIN paginas p ON p.page_id = f.chave WHERE f.tipo = 'pagina'")) {
    for (const pais of JSON.parse(f.paises || '["BR"]')) if (!chave.has(f.chave + '|' + pais)) { pares.unshift({ page_id: f.chave, pais }); chave.add(f.chave + '|' + pais); }
  }
  const porPais = new Map();
  for (const p of pares) { if (!porPais.has(p.pais)) porPais.set(p.pais, []); porPais.get(p.pais).push(p.page_id); }
  for (const [pais, ids] of porPais) {
    log(`> Atualizando contagem de ${ids.length} páginas acompanhadas em ${pais}...`);
    await aprofundarPaginas(ctx, { ...o, pais }, ids);
  }
}

// Executa pedidos feitos pelo painel (tabela `fila`), gravando o log para o painel acompanhar.
// Pega o próximo pedido com trava: dois robôs (Actions e PC local) nunca pegam o mesmo.
async function pegarTarefa() {
  const sql = `UPDATE tarefas SET status = 'rodando', inicio = ?, tentativas = tentativas + 1, origem = ?
    WHERE id = (SELECT id FROM tarefas WHERE status = 'pendente' ORDER BY id LIMIT 1${usaPostgres ? ' FOR UPDATE SKIP LOCKED' : ''})
    RETURNING *`;
  return get(sql, [agora(), ORIGEM]);
}

async function processarFila(ctx, o) {
  // Pedidos presos em "rodando" por mais de 2 h (robô caiu) voltam para a fila.
  await run("UPDATE tarefas SET status = 'pendente' WHERE status = 'rodando' AND inicio < ? AND tentativas < 3", [agora() - 7200]);
  for (;;) {
    const item = await pegarTarefa();
    if (!item) return;
    const linhas = [];
    const logOriginal = log;
    let ultimoFlush = 0;
    log = (...m) => {
      logOriginal(...m); linhas.push(m.join(' '));
      if (Date.now() - ultimoFlush > 4000) { ultimoFlush = Date.now(); run('UPDATE tarefas SET log = ? WHERE id = ?', [linhas.slice(-300).join('\n'), item.id]).catch(() => {}); }
    };
    let status = 'concluido', erro = null;
    try {
      const io = { ...lerArgs(JSON.parse(item.args || '[]')) };
      io.pais = typeof io.pais === 'string' ? io.pais : o.pais;
      await TAREFAS[item.tipo](ctx, io);
    } catch (e) { status = 'erro'; erro = e.message; log(`!! ${e.message}`); if (e instanceof BloqueioError) throw e; }
    finally {
      log = logOriginal;
      await run('UPDATE tarefas SET status = ?, fim = ?, erro = ?, log = ? WHERE id = ?', [status, agora(), erro, linhas.slice(-300).join('\n'), item.id]);
    }
  }
}

// Monitoramento automático (rodado de horas em horas pelo GitHub Actions ou pelo agendador do Windows).
async function rotina(ctx, o) {
  const config = await lerConfig();
  const r = config.rotina || {};
  await processarFila(ctx, o);
  const idx = Number((await get("SELECT valor FROM ajustes WHERE chave = 'rotina_indice'"))?.valor || 0);
  const salvarIdx = () => run("INSERT INTO ajustes (chave, valor) VALUES ('rotina_indice', ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor", [String(idx + 1)]);
  if (r.atualizar !== false) await atualizar(ctx, { ...o, limite: r.paginasParaAtualizar || 80 });
  await processarFila(ctx, o);
  const nichos = (r.nichos?.length ? r.nichos : Object.keys(config.nichos)).filter((n) => config.nichos[n]);
  // Rodízio: cada rodada pega um nicho e um país diferentes (países nunca são misturados).
  const paises = r.paises?.length ? r.paises : [config.pais || 'BR'];
  if (nichos.length) {
    const n = nichos[idx % nichos.length];
    const pais = paises[Math.floor(idx / nichos.length) % paises.length];
    log(`\n>>> Rotina: minerando nicho "${n}" em ${pais}`);
    await minerar(ctx, { ...o, nicho: n, pais });
  }
  await processarFila(ctx, o);
  const gws = r.gateways || GATEWAYS.filter((g) => g.regiao === 'BR').map((g) => g.id);
  if (gws.length) {
    const g = gws[idx % gws.length];
    const pais = paises[idx % paises.length];
    log(`\n>>> Rotina: gateway ${g} em ${pais}`);
    await gateway(ctx, { ...o, gateway: g, pais, max: r.maxPorGateway || 200 });
  }
  await salvarIdx();
  await processarFila(ctx, o);
}

// Retenção para caber nos 500 MB: texto completo só de anúncio ativo ou salvo; inativo há 60+ dias fora das listas é apagado.
async function manutencao(ctx, o) {
  const t = agora();
  const foraDasListas = `NOT EXISTS (SELECT 1 FROM favoritos f WHERE (f.tipo = 'pagina' AND f.chave = anuncios.page_id) OR (f.tipo = 'checkout' AND f.chave = anuncios.checkout))`;
  await limparMiniaturas({ log });
  const apagar = await get(`SELECT COUNT(*) n FROM anuncios WHERE ativo = 0 AND inativo_desde < ? AND thumb_arquivo IS NULL AND ${foraDasListas}`, [t - 60 * 86400]);
  await run(`DELETE FROM anuncios WHERE ativo = 0 AND inativo_desde < ? AND thumb_arquivo IS NULL AND ${foraDasListas}`, [t - 60 * 86400]);
  await run(`UPDATE anuncios SET texto = SUBSTR(texto, 1, 300) WHERE ativo = 0 AND inativo_desde < ? AND LENGTH(texto) > 300 AND ${foraDasListas}`, [t - 7 * 86400]);
  await run('DELETE FROM coletas WHERE quando < ?', [t - 30 * 86400]);
  await run("DELETE FROM tarefas WHERE status <> 'pendente' AND criado < ?", [t - 30 * 86400]);
  await run('DELETE FROM historico_diario WHERE data < ?', [new Date((t - 400 * 86400) * 1000).toISOString().slice(0, 10)]);
  log(`> Retenção: ${apagar.n} anúncios inativos há 60+ dias removidos`);
  const uso = await usoELimites();
  for (const i of uso.itens) if (i.alerta) await alertar(`${i.nome} em ${i.pct}% do limite grátis.`, { log });
  const errosHoje = uso.raspador.coletas24h.erro || 0;
  if (errosHoje >= 5) await alertar(`${errosHoje} coletas com erro nas últimas 24 h. Último: ${uso.raspador.ultimoErro?.erro || '?'}`, { log });
}

const TAREFAS = { minerar, gateway, analisar, atualizar, rotina, manutencao, fila: processarFila };
const SEM_NAVEGADOR = new Set(['manutencao']);
const ORIGEM = process.env.GITHUB_ACTIONS ? 'actions' : 'local';

const o = lerArgs(process.argv.slice(2));
const tipo = o._[0] || 'minerar';
if (!TAREFAS[tipo]) { log(`Tarefa desconhecida: ${tipo}. Use: ${Object.keys(TAREFAS).join(', ')}`); process.exit(1); }

await iniciar();
await recalcularChaves();
o.pais = typeof o.pais === 'string' ? o.pais : (await lerConfig()).pais || 'BR';

// Cada execução e cada coleta ficam registradas (minutos usados e saúde do raspador).
const exec = await get('INSERT INTO execucoes (origem, tipo, inicio, status) VALUES (?, ?, ?, ?) RETURNING id', [ORIGEM, tipo, agora(), 'rodando']);
registrarColetas((c) => run('INSERT INTO coletas (quando, origem, tipo, termo, pais, total, lidos, status, erro, duracao_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [agora(), ORIGEM, c.tipo, c.termo, c.pais, c.total, c.lidos, c.status, c.erro || null, c.duracao_ms]).catch(() => {}));

const navegador = SEM_NAVEGADOR.has(tipo) ? null : await abrirNavegador({ visivel: !!o.visivel });
const inicio = Date.now();
let codigo = 0, falha = null;
try {
  await TAREFAS[tipo](navegador?.ctx, o);
  if (navegador && ['rotina', 'minerar', 'gateway', 'fila'].includes(tipo)) await processarMiniaturas({ log });
} catch (e) {
  codigo = 1; falha = e;
  log(e instanceof BloqueioError ? `\n!! ${e.message}` : `\n!! Erro: ${e.stack || e.message}`);
} finally {
  await navegador?.browser.close();
}
// Raspador quebrado: erro de estrutura, bloqueio ou muitas falhas na mesma execução.
if (falha instanceof EstruturaError || falha instanceof BloqueioError || estatisticas.erros >= 3) {
  await alertar(`raspador com problema (${tipo}, ${ORIGEM}): ${falha?.message || estatisticas.erros + ' coletas falharam'}`, { log });
}
await run('UPDATE execucoes SET fim = ?, status = ?, coletas = ?, erros = ? WHERE id = ?',
  [agora(), codigo ? 'erro' : 'ok', estatisticas.paginas, estatisticas.erros, exec.id]).catch(() => {});
log(`\nConcluído em ${Math.round((Date.now() - inicio) / 1000)}s (${estatisticas.paginas} páginas, ${estatisticas.erros} erros).`);
await fechar();
process.exit(codigo);
