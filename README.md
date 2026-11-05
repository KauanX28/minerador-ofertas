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
GitHub Actions (robô com navegador, 2x por dia e quando você clica "Minerar")
        │ grava
        ▼
Supabase (Postgres grátis) ◄── lê ── Vercel (painel online)
```

Tudo no plano grátis. O banco **minerador-ofertas** já foi criado no Supabase (região São Paulo) e o projeto
**minerador-ofertas** já existe na Vercel.

1. **GitHub:** crie um repositório (público = minutos de Actions ilimitados; privado = 2.000 min/mês, suficiente
   para ~3 rodadas por dia) e envie esta pasta.
2. **String de conexão do Supabase:** Supabase → projeto *minerador-ofertas* → **Connect** → *Transaction pooler*.
   Copie a URL (`postgresql://postgres.xxxx:[SENHA]@...pooler.supabase.com:6543/postgres`). Se não souber a senha
   do banco, redefina em *Project Settings → Database*.
3. **GitHub → Settings → Secrets and variables → Actions → New secret:** `DATABASE_URL` = a URL acima.
4. **Vercel → projeto minerador-ofertas → Settings:**
   - *Git*: conecte o repositório do passo 1 (cada `git push` publica o painel).
   - *Environment Variables*: `DATABASE_URL` = a mesma URL.
   - Para o botão **Minerar agora** acionar o robô na hora: crie um *fine-grained token* no GitHub
     (Settings → Developer settings → Personal access tokens) só para esse repositório, com permissão
     **Actions: Read and write**, e adicione `GITHUB_TOKEN` = token e `GITHUB_REPO` = `seu-usuario/seu-repo`.
     Sem isso, os pedidos ficam na fila e rodam na próxima rodada agendada.
5. **Levar os dados que você já minerou** (PowerShell, nesta pasta):
   ```powershell
   $env:DATABASE_URL = "cole-a-url-aqui"; node --no-warnings src/migrar-para-nuvem.js
   ```
6. No GitHub, aba **Actions → minerador → Run workflow** para a primeira rodada.

O painel na Vercel fica protegido pelo login da Vercel (só você acessa). Para liberar para outras pessoas com
senha própria, desligue a *Deployment Protection* e defina `SENHA_PAINEL` nas variáveis da Vercel.

**Rotina automática** (aba Configurações): a cada rodada processa a fila, reconta as páginas acompanhadas,
minera o próximo nicho/país do rodízio e atualiza um gateway.

---

## Limitações

- A Meta não divulga gasto nem faturamento de anúncios comerciais no Brasil. Nenhuma ferramenta tem esse dado; as
  que mostram estão estimando. Aqui os sinais são volume de anúncios ativos, duplicação, tempo rodando e crescimento.
- A Biblioteca não informa o país do anunciante: a separação é pelo país pesquisado (onde o anúncio é exibido).
- Coleta automatizada vai contra os termos da Meta. O robô vai devagar, com pausas aleatórias. Se aparecer captcha
  no computador, rode com "mostrar navegador" e resolva.
- Se a Meta mudar o site, o coletor (`src/scraper.js`) pode precisar de ajuste.
- Links de imagem/vídeo dos criativos expiram em alguns dias; uma nova mineração atualiza.
- O GitHub pausa agendamentos de repositórios sem atividade há 60 dias (basta um commit ou rodar manualmente).
