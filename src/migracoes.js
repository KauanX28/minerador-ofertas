// Migrações versionadas do banco (SQLite local e Postgres/Supabase).
// Regras: nunca apagar dados existentes; cada migração é idempotente o suficiente para bancos antigos;
// a ordem é a do array. Aplicadas por `node src/migrar.js`, pelo robô e pelo modo local — nunca pela Vercel.

const id = (pg) => (pg ? 'BIGSERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT');
const rls = async (ctx, tabelas) => { if (ctx.pg) for (const t of tabelas) await ctx.ddl(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`); };

export const MIGRACOES = [
  {
    versao: 1,
    nome: 'esquema inicial (anúncios, páginas, histórico, buscas, checkouts, análises, favoritos, ajustes, fila)',
    up: async (ctx) => {
      const { pg, ddl, existe, colunas } = ctx;
      await ddl(`
        CREATE TABLE IF NOT EXISTS anuncios (
          ad_id TEXT PRIMARY KEY, page_id TEXT, page_name TEXT, ativo INTEGER, inicio BIGINT, fim BIGINT,
          dup INTEGER, plataformas TEXT, formato TEXT, texto TEXT, titulo TEXT, link TEXT, dominio TEXT,
          cta TEXT, thumb TEXT, video TEXT, gateway TEXT, checkout TEXT, visto_primeiro BIGINT, visto_ultimo BIGINT, pais TEXT);
        CREATE INDEX IF NOT EXISTS ix_anuncios_page ON anuncios(page_id);
        CREATE TABLE IF NOT EXISTS paginas (
          page_id TEXT PRIMARY KEY, nome TEXT, uri TEXT, foto TEXT, curtidas INTEGER, categorias TEXT,
          nichos TEXT DEFAULT '[]', palavras TEXT DEFAULT '[]', atualizado BIGINT, paises TEXT DEFAULT '[]');
        CREATE TABLE IF NOT EXISTS historico (page_id TEXT, pais TEXT, data TEXT, ativos INTEGER, PRIMARY KEY (page_id, pais, data));
        CREATE TABLE IF NOT EXISTS buscas (id ${id(pg)}, palavra TEXT, nicho TEXT, pais TEXT, total INTEGER, coletados INTEGER, quando BIGINT);
        CREATE TABLE IF NOT EXISTS checkouts (checkout TEXT PRIMARY KEY, gateway TEXT, url TEXT, produto TEXT, preco TEXT, analisado BIGINT, ok INTEGER);
        CREATE TABLE IF NOT EXISTS analises (dominio TEXT PRIMARY KEY, url TEXT, dados TEXT, quando BIGINT);
        CREATE TABLE IF NOT EXISTS favoritos (tipo TEXT, chave TEXT, nome TEXT, nota TEXT DEFAULT '', criado BIGINT, PRIMARY KEY (tipo, chave));
        CREATE TABLE IF NOT EXISTS ajustes (chave TEXT PRIMARY KEY, valor TEXT);
        CREATE TABLE IF NOT EXISTS fila (id ${id(pg)}, tipo TEXT, args TEXT, descricao TEXT,
          status TEXT DEFAULT 'pendente', log TEXT DEFAULT '', criado BIGINT, inicio BIGINT, fim BIGINT);`);
      // Bancos SQLite antigos (antes de gateway e da separação por país).
      if (!pg) {
        const cA = await colunas('anuncios');
        for (const c of ['gateway', 'checkout', 'pais']) if (!cA.includes(c)) await ddl(`ALTER TABLE anuncios ADD COLUMN ${c} TEXT`);
        if (!(await colunas('paginas')).includes('paises')) await ddl("ALTER TABLE paginas ADD COLUMN paises TEXT DEFAULT '[]'");
        if (!(await colunas('historico')).includes('pais')) {
          await ddl(`ALTER TABLE historico RENAME TO historico_antigo;
            CREATE TABLE historico (page_id TEXT, pais TEXT, data TEXT, ativos INTEGER, PRIMARY KEY (page_id, pais, data));
            INSERT INTO historico SELECT page_id, 'BR', data, ativos FROM historico_antigo; DROP TABLE historico_antigo;
            UPDATE anuncios SET pais = 'BR' WHERE pais IS NULL;
            UPDATE paginas SET paises = '["BR"]' WHERE paises IS NULL OR paises = '[]';`);
        }
        await ddl('DROP INDEX IF EXISTS ix_anuncios_gateway');
      }
      await ddl('CREATE INDEX IF NOT EXISTS ix_anuncios_gw ON anuncios(gateway, checkout, pais)');
      if (await existe('fila')) await rls(ctx, ['anuncios', 'paginas', 'historico', 'buscas', 'checkouts', 'analises', 'favoritos', 'ajustes', 'fila']);
    },
  },
  {
    versao: 2,
    nome: 'fase 0: tarefas com trava, histórico diário, favoritos por usuário, coletas, execuções, uso e mídia',
    up: async (ctx) => {
      const { pg, ddl, existe, colunas } = ctx;
      // Histórico agregado por dia (mesmo formato, nome definitivo).
      if (await existe('historico') && !(await existe('historico_diario'))) await ddl('ALTER TABLE historico RENAME TO historico_diario');
      await ddl(`CREATE TABLE IF NOT EXISTS historico_diario (page_id TEXT, pais TEXT, data TEXT, ativos INTEGER, PRIMARY KEY (page_id, pais, data));
        CREATE INDEX IF NOT EXISTS ix_hist_pais_data ON historico_diario(pais, data);`);

      // Fila de tarefas consumida com SELECT ... FOR UPDATE SKIP LOCKED (Postgres).
      await ddl(`CREATE TABLE IF NOT EXISTS tarefas (
          id ${id(pg)}, tipo TEXT NOT NULL, args TEXT DEFAULT '[]', descricao TEXT, status TEXT DEFAULT 'pendente',
          log TEXT DEFAULT '', erro TEXT, tentativas INTEGER DEFAULT 0, user_id TEXT, origem TEXT,
          criado BIGINT, inicio BIGINT, fim BIGINT);
        CREATE INDEX IF NOT EXISTS ix_tarefas_status ON tarefas(status, id);`);
      if (await existe('fila')) {
        await ddl(`INSERT INTO tarefas (tipo, args, descricao, status, log, criado, inicio, fim)
          SELECT tipo, args, descricao, status, log, criado, inicio, fim FROM fila; DROP TABLE fila;`);
      }

      // Favoritos passam a pertencer a um usuário ('' = itens antigos do dono) e ganham etapa e tags.
      if (!(await colunas('favoritos')).includes('user_id')) {
        await ddl(`CREATE TABLE favoritos_v2 (user_id TEXT NOT NULL DEFAULT '', tipo TEXT NOT NULL, chave TEXT NOT NULL, nome TEXT,
            nota TEXT DEFAULT '', etapa TEXT DEFAULT 'minerada', tags TEXT DEFAULT '[]', criado BIGINT, atualizado BIGINT,
            PRIMARY KEY (user_id, tipo, chave));
          INSERT INTO favoritos_v2 (user_id, tipo, chave, nome, nota, criado, atualizado) SELECT '', tipo, chave, nome, nota, criado, criado FROM favoritos;
          DROP TABLE favoritos; ALTER TABLE favoritos_v2 RENAME TO favoritos;`);
      }

      // Anúncios: quando ficou inativo e miniatura própria no Storage.
      const cA = await colunas('anuncios');
      for (const [c, t] of [['inativo_desde', 'BIGINT'], ['thumb_arquivo', 'TEXT'], ['thumb_em', 'BIGINT']]) {
        if (!cA.includes(c)) await ddl(`ALTER TABLE anuncios ADD COLUMN ${c} ${t}`);
      }
      await ddl(`CREATE INDEX IF NOT EXISTS ix_anuncios_ativo_pais ON anuncios(ativo, pais);
        CREATE INDEX IF NOT EXISTS ix_anuncios_inativo ON anuncios(inativo_desde);`);

      // Registro de cada coleta (para detectar quebra do raspador) e de cada execução do robô (minutos usados).
      await ddl(`CREATE TABLE IF NOT EXISTS coletas (id ${id(pg)}, quando BIGINT, origem TEXT, tipo TEXT, termo TEXT, pais TEXT,
          total INTEGER, lidos INTEGER, status TEXT, erro TEXT, duracao_ms INTEGER);
        CREATE INDEX IF NOT EXISTS ix_coletas_quando ON coletas(quando);
        CREATE TABLE IF NOT EXISTS execucoes (id ${id(pg)}, origem TEXT, tipo TEXT, inicio BIGINT, fim BIGINT, status TEXT, coletas INTEGER DEFAULT 0, erros INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS prefs (user_id TEXT NOT NULL, chave TEXT NOT NULL, valor TEXT, PRIMARY KEY (user_id, chave));
        CREATE TABLE IF NOT EXISTS uso_diario (data TEXT NOT NULL, chave TEXT NOT NULL, valor BIGINT DEFAULT 0, PRIMARY KEY (data, chave));`);
      await rls(ctx, ['historico_diario', 'tarefas', 'favoritos', 'coletas', 'execucoes', 'prefs', 'uso_diario']);
    },
  },
  {
    versao: 3,
    nome: 'fase 1: tipo de oferta, idioma, preço em reais, hash de criativo, ofertas por checkout, câmbio',
    up: async (ctx) => {
      const { pg, ddl, colunas } = ctx;
      const add = async (tabela, defs) => {
        const cs = await colunas(tabela);
        for (const [c, t] of defs) if (!cs.includes(c)) await ddl(`ALTER TABLE ${tabela} ADD COLUMN ${c} ${t}`);
      };
      await add('anuncios', [['idioma', 'TEXT'], ['phash', 'TEXT'], ['texto_hash', 'TEXT'], ['link_final', 'TEXT']]);
      await add('paginas', [['tipo', 'TEXT'], ['tipo_motivo', 'TEXT'], ['idioma', 'TEXT'], ['classificado', 'BIGINT']]);
      await add('checkouts', [['preco_valor', 'REAL'], ['moeda', 'TEXT'], ['preco_brl', 'REAL']]);
      await ddl(`CREATE INDEX IF NOT EXISTS ix_anuncios_phash ON anuncios(phash);
        CREATE INDEX IF NOT EXISTS ix_anuncios_texto_hash ON anuncios(texto_hash);
        CREATE TABLE IF NOT EXISTS cambio (moeda TEXT NOT NULL, data TEXT NOT NULL, brl REAL, PRIMARY KEY (moeda, data));
        CREATE TABLE IF NOT EXISTS ofertas (
          id ${id(pg)}, chave TEXT UNIQUE NOT NULL, tipo_chave TEXT, pais TEXT, gateway TEXT, produto TEXT, preco TEXT, preco_brl REAL,
          tipo TEXT, idioma TEXT, paginas INTEGER, dominios TEXT DEFAULT '[]', anuncios INTEGER, ativos_paginas INTEGER,
          inicio BIGINT, thumb TEXT, atualizado BIGINT);
        CREATE INDEX IF NOT EXISTS ix_ofertas_pais ON ofertas(pais, tipo);
        CREATE TABLE IF NOT EXISTS oferta_membros (oferta_id BIGINT NOT NULL, page_id TEXT NOT NULL, dominio TEXT, PRIMARY KEY (oferta_id, page_id));`);
      await rls(ctx, ['cambio', 'ofertas', 'oferta_membros']);
    },
  },
  {
    versao: 4,
    nome: 'fase 3: pastas nas listas de trabalho',
    up: async ({ ddl, colunas }) => {
      if (!(await colunas('favoritos')).includes('pasta')) await ddl("ALTER TABLE favoritos ADD COLUMN pasta TEXT DEFAULT ''");
      await ddl('CREATE INDEX IF NOT EXISTS ix_paginas_nome ON paginas(nome)');
    },
  },
  {
    versao: 5,
    nome: 'fase 3: busca por significado (vetores dos anúncios ativos)',
    up: async ({ pg, ddl, colunas }) => {
      if ((await colunas('anuncios')).includes('embedding')) return;
      if (!pg) { await ddl('ALTER TABLE anuncios ADD COLUMN embedding TEXT'); return; }
      // pgvector é grátis no Supabase. Se o banco não tiver a extensão, a busca por significado fica desligada.
      try { await ddl('CREATE EXTENSION IF NOT EXISTS vector'); } catch (e) { console.log('  pgvector indisponível: ' + e.message); return; }
      await ddl('ALTER TABLE anuncios ADD COLUMN embedding vector(384)');
      await ddl('CREATE INDEX IF NOT EXISTS ix_anuncios_embedding ON anuncios USING hnsw (embedding vector_cosine_ops)');
    },
  },
  {
    versao: 6,
    nome: 'fase 4: validação do site (tráfego, Wayback, idade, subdomínios, Tranco) e order bumps',
    up: async (ctx) => {
      const { ddl, colunas } = ctx;
      await ddl('CREATE TABLE IF NOT EXISTS validacoes (dominio TEXT PRIMARY KEY, dados TEXT, quando BIGINT)');
      if (!(await colunas('checkouts')).includes('bumps')) await ddl('ALTER TABLE checkouts ADD COLUMN bumps TEXT');
      await rls(ctx, ['validacoes']);
    },
  },
];
