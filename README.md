# Minerador de Ofertas (grátis)

Ferramenta de inteligência de anúncios para infoprodutos e low ticket, de qualquer nicho, gateway e país. Faz o que
Minera ROI, SpyROI, PiPiADS e o Traffic Analytics do Semrush fazem, usando a **Biblioteca de Anúncios da Meta**
(pública, sem login):

| Tela | O que faz |
|---|---|
| **Busca global** (topo) | Digite uma palavra-chave, um domínio, um link de checkout ou um gateway: o painel identifica o tipo e abre a tela certa |
| **Painel** | Mais escaladas, *escalando agora* (crescimento entre contagens), novas e fortes, gateways |
| **Ofertas escaladas** | Ranking ordenável por anunciante ou por site/funil, com filtros de nicho, status, gateway, funil, dias e nº de anúncios; exporta CSV |
| **Biblioteca de anúncios** | Todos os anúncios ativos coletados (mais variações = campeões), filtros de texto, formato, CTA, plataforma, gateway e idade; botão **Modelar**; exporta CSV |
| **Gateways** | "Top pages do Semrush" grátis: checkouts mais anunciados em 24 gateways do Brasil (Hotmart, Kiwify, Cakto, Kirvano, Eduzz, Ticto, Perfect Pay, Hubla, Braip...) e internacionais (Stripe, ClickBank, Digistore24, ThriveCart, Systeme.io, Kajabi, Gumroad, Payhip...) com produto e preço |
| **Análise de domínio** | Gateway, checkout, preço, VSL, quiz, pixel, construtor, gatilhos, sitemap.xml e conferência de rota (quantos anúncios e páginas usam o domínio) |
| **Minerar** | Coleta por nicho ou palavras em um ou vários países + sugestões de palavras-chave com os métodos dos mineradores |
| **Minhas listas** | Anunciantes, sites e checkouts salvos, com anotação; anunciantes salvos são recontados a cada atualização |
| **Calculadoras e plano** | CPA máximo/ROAS com taxas e order bumps, orçamento de teste, projeção, plano de campanha (teste → pré-escala → escala) e checklist de lançamento |
| **Prompts de IA** | Prompts para ChatGPT/Claude/Gemini/Lovable: palavras-chave, modelagem, página, quiz, entregável, criativos |
| **Método** | Guia montado a partir de ~30 vídeos de quem roda low ticket |

**Países separados:** o país escolhido no topo vale para todas as telas, e nada é misturado. Minerar vários países
de uma vez coleta cada um separadamente; um mesmo anunciante aparece em cada país com a contagem daquele país.

Tema claro e escuro (botão no topo).

---

## Usar no computador

1. Dê dois cliques em **`Abrir Painel.cmd`** → abre http://localhost:8899
2. Em **Minerar**, escolha o nicho e os países e clique em **Iniciar mineração** (5–10 min por nicho/país).
3. Rode **Atualizar contagens** uma vez por dia para medir quem está crescendo.

Pelo terminal, dentro desta pasta:

```bash
npm run minerar -- --nicho Emagrecimento --pais BR
npm run minerar -- --palavras "renda extra, acceso inmediato" --nicho Avulso --pais MX,CO
npm run gateway -- --gateway kiwify --pais BR
npm run gateway -- --gateway clickbank --pais US
npm run analisar -- --url exemplo.com.br
npm run atualizar
```

Dados locais: `dados/minerador.db` (SQLite).

---

## Hospedagem grátis 24h (Vercel + Supabase + GitHub Actions)

```
GitHub Actions ── robô com navegador (4x/dia + pedidos do painel) ──┐
               └─ manutenção (diária: migração, retenção, alertas)  │ grava
                                                                     ▼
Vercel (painel + login) ── lê / enfileira ──► Supabase (Postgres 500 MB + Storage 1 GB + Auth)
```

Tudo no plano grátis (Vercel Hobby, Supabase Free, GitHub Free). Projeto atual: repositório privado
`KauanX28/minerador-ofertas`, painel em https://minerador-ofertas-weld.vercel.app, banco *minerador-ofertas* (São Paulo).

### Variáveis e segredos

| Onde | Nome | Tipo | Para quê |
|---|---|---|---|
| GitHub (secret) | `DATABASE_URL` | segredo | Conexão do robô com o Postgres (Supabase → Connect → Transaction pooler, porta 6543) |
| GitHub (secret) | `SUPABASE_SERVICE_ROLE_KEY` | segredo | Robô grava as miniaturas no Storage |
| GitHub (secret) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | segredo, opcional | Alertas (raspador quebrado, limites em 80%) |
| GitHub (variable) | `SUPABASE_URL` | público | URL do projeto Supabase |
| GitHub (variable) | `LIMITE_PAGINAS_EXECUCAO` | opcional | Máximo de páginas por execução do robô (padrão 500) |
| Vercel | `DATABASE_URL` | segredo | Conexão do painel com o Postgres |
| Vercel | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | públicos | Login (chave *publishable*, feita para o navegador) |
| Vercel | `EMAILS_PERMITIDOS` | público | E-mails que podem entrar (o primeiro é o dono) |
| Vercel | `GITHUB_TOKEN`, `GITHUB_REPO` | segredo, opcional | "Minerar agora" aciona o robô na hora (token *fine-grained* só deste repositório, permissão Actions: Read and write) |
| Vercel | `LIMITE_MINUTOS_ACTIONS` | opcional | 0 (padrão, repositório público = ilimitado) ou 2000 se o repositório for privado |

Scripts que pedem os segredos sem mostrá-los na tela (rode no PowerShell, nesta pasta):

```powershell
powershell -ExecutionPolicy Bypass -File .\configurar-nuvem.ps1     # DATABASE_URL no GitHub e na Vercel + cópia dos dados locais
powershell -ExecutionPolicy Bypass -File .\configurar-segredos.ps1  # chave de serviço do Supabase e Telegram (opcional)
```

### Chave grátis do Google (opcional): tráfego real e velocidade

A validação de sites usa o Chrome UX Report e o PageSpeed Insights, que pedem uma chave de API grátis, sem cartão:

1. Em https://console.cloud.google.com, crie um projeto.
2. Ative as APIs "Chrome UX Report API" e "PageSpeed Insights API".
3. Em "Credenciais", crie uma "Chave de API".
4. Salve a chave como `GOOGLE_API_KEY` em dois lugares: nos *Secrets* do GitHub (robô) e nas variáveis de ambiente da Vercel (botão "Validar de novo").

Sem a chave, o resto da validação funciona normalmente: Wayback Machine, idade do domínio (RDAP), subdomínios (Cert Spotter / crt.sh) e ranking Tranco.

### IA grátis (opcional): análise de criativos, hooks, roteiros e copies

Sem nenhuma chave, tudo funciona: cada função de IA mostra o prompt pronto para copiar. Com chave, a ferramenta gera sozinha e guarda o resultado no banco (cache: nada é gerado duas vezes). Ordem usada: Gemini → Groq → modelo no navegador (WebGPU) → prompt.

| Onde | Variável | Para quê | Como conseguir (grátis, sem cartão) |
|---|---|---|---|
| GitHub Secrets e Vercel | `GEMINI_API_KEY` | análise e geração | https://aistudio.google.com/apikey |
| GitHub Secrets e Vercel | `GROQ_API_KEY` | reserva da IA e transcrição dos vídeos (Whisper) | https://console.groq.com/keys |

- No nível grátis do Gemini o Google pode usar os textos enviados para melhorar os modelos. Não envie dados pessoais.
- Também dá para salvar uma chave só no navegador, em Configurações → IA. Ela não vai para o servidor.
- Uma vez por dia, o robô transcreve e analisa o criativo campeão das 20 melhores ofertas, dentro da cota grátis.

### Escalar com dados reais (opcional)

- **Anúncios:** crie um app em https://developers.facebook.com/apps (tipo "Empresa", pode ficar em modo de desenvolvimento), adicione "API de Marketing" e gere um token com `ads_read`. Na Vercel, crie `META_ACCESS_TOKEN` e `META_AD_ACCOUNT_ID`. A ferramenta só lê dados; nunca altera campanhas.
- **Vendas reais:** crie `WEBHOOK_TOKEN` na Vercel (uma senha longa). No gateway, cadastre o webhook `https://SEU-SITE.vercel.app/api/webhook/kiwify?token=SEU_TOKEN` (troque o nome do gateway). Nome, e-mail e CPF do comprador não são salvos.

### Alertas, canal de ofertas e relatório (opcional)

- **Telegram:** já configurado pelo `configurar-segredos.ps1`. Você recebe avisos quando um anunciante que acompanha sobe X%, lança criativos novos, quando aparece oferta nova forte, quando o robô quebra e quando o banco passa de 80%. Os limites ficam em Configurações → Alertas.
- **Notificação no navegador (celular e computador):** em Configurações → Alertas, clique em "Ligar notificações". As chaves VAPID são geradas sozinhas.
- **Canal grátis com as ofertas do dia:** crie um canal no Telegram, adicione o seu bot como administrador e salve o id do canal (ex.: `@meucanal`) no secret `TELEGRAM_CANAL_ID`. Para os links abrirem no painel, crie a variável `PAINEL_URL` (Settings → Variables) com o endereço da Vercel.
- **Relatório da semana:** sai toda segunda-feira e também fica no menu Trabalho → Relatório da semana.

### Extensão do Chrome (grátis)

1. Baixe a pasta `extensao` deste repositório (botão "Code" → "Download ZIP" e extraia).
2. Abra `chrome://extensions`, ative o "Modo do desenvolvedor" e clique em "Carregar sem compactação", escolhendo a pasta `extensao`.
3. Clique no ícone da extensão e cole o endereço do painel e a sua chave (Configurações → Extensão do Chrome).
4. Na Biblioteca de Anúncios, cada anunciante ganha um selo com os anúncios na tela, e o painel lateral tem "Salvar", "Abrir" e "Analisar site".

Publicar na Chrome Web Store é opcional (cobra uma taxa única de desenvolvedor); o modo "carregar sem compactação" é grátis.

### Primeiro acesso (login)

O painel online pede login (Supabase Auth). Para criar sua conta sem depender de e-mail de confirmação:
Supabase → *Authentication* → *Users* → **Add user** → *Create new user* → seu e-mail (o mesmo de
`EMAILS_PERMITIDOS`) + senha → marque **Auto Confirm User**. Depois entre no painel com esse e-mail e senha.
Itens salvos antes do login passam automaticamente para o dono no primeiro acesso.

### Banco: migrações versionadas

O esquema evolui por migrações numeradas em `src/migracoes.js` (registradas na tabela `schema_migracoes`).
Elas são aplicadas pelo workflow **manutencao** a cada push que muda o banco, pelo robô e pelo modo local — nunca
pela Vercel. Para aplicar à mão: `node --no-warnings src/migrar.js` (com `DATABASE_URL` definida, aplica no Supabase).

### Limites respeitados (tela "Uso e limites")

- **Banco 500 MB** (alerta em 80%): anúncios inativos há 60+ dias fora das listas são apagados; texto completo só
  enquanto o anúncio está ativo ou salvo; histórico diário agregado.
- **Storage 1 GB:** miniaturas WebP de 320 px (~13 KB); vídeos não são guardados; miniaturas de anúncios inativos
  há 30+ dias fora das listas são apagadas.
- **Tráfego 5 GB/mês:** miniaturas servidas por `/api/midia/:id` com cache de 1 ano na CDN da Vercel.
- **Funções da Vercel:** só leitura e enfileiramento; coleta e análise rodam no Actions.
- **Minutos do Actions:** cada execução registra sua duração; limite de páginas por execução.

### Robô no seu PC (segunda fonte de IP)

Com `DATABASE_URL` definida, o PC consome a mesma fila da nuvem, sem conflito (trava `FOR UPDATE SKIP LOCKED`):

```powershell
$env:DATABASE_URL = "postgresql://..."; node --no-warnings src/tarefa.js fila
```

---

## Como a interface é organizada

O menu segue o caminho de trabalho: **1 Encontrar** (Ofertas, Criativos, Gateways) → **2 Validar** (Análise de site) → **3 Modelar** (Prompts) → **4 Escalar** (Calculadoras), mais **Minhas listas** (funil Minerada → Validando → Modelando → Testando → Escalando → Descartada).

- No primeiro acesso, 3 perguntas (nichos, país e nível) ajustam o que aparece primeiro.
- Cada oferta tem página própria (`/oferta/<id>`) com as abas Visão geral, Criativos, Funil, Página, Checkout, Histórico e Modelar.
- Os filtros ficam na URL: dá para salvar ou compartilhar uma busca.
- A busca do topo completa com anunciantes, sites, checkouts e gateways.
- **Busca por significado** (em Criativos): o robô gera vetores dos anúncios ativos com o modelo `multilingual-e5-small` (pgvector no Supabase). A frase digitada vira vetor no próprio navegador; na primeira vez ele baixa o modelo, cerca de 120 MB, e guarda.
- Instalável como app (PWA) no celular e no computador.

A interface usa Preact + htm sem etapa de build (arquivos em `painel/js`), então o modo local e a Vercel servem os mesmos arquivos.

## Limitações

- A Meta não divulga gasto nem faturamento de anúncios comerciais no Brasil. Nenhuma ferramenta tem esse dado; as
  que mostram estão estimando. Aqui os sinais são volume de anúncios ativos, duplicação, tempo rodando e crescimento.
- A Biblioteca não informa o país do anunciante: a separação é pelo país pesquisado (onde o anúncio é exibido).
- Coleta automatizada vai contra os termos da Meta. O robô vai devagar, com pausas aleatórias. Se aparecer captcha
  no computador, rode com "mostrar navegador" e resolva.
- Se a Meta mudar o site, o coletor (`src/scraper.js`) pode precisar de ajuste.
- Links de imagem/vídeo dos criativos expiram em alguns dias; uma nova mineração atualiza.
- O GitHub pausa agendamentos de repositórios sem atividade há 60 dias (basta um commit ou rodar manualmente).
