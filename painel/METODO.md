# Método: minerar, modelar e escalar low ticket

Guia montado a partir de vídeos de quem roda low ticket no Brasil (Felipe Lona, Andre Luiz, Guilherme Franklim,
Guilherme Asvi, Arthur Oliveira, Guilherme Emanoel, Matheus Lourenço, Matheus Bressan, Carlos Oliveira, Guilherme
Henrique, The Cold, Ana Carolina Reis, entre outros). Ao lado de cada etapa está **onde fazer isso neste painel**.

> **Regra de ouro (todos concordam):** minere para **modelar**, não para clonar. Clonar a página e o criativo te
> coloca no mesmo leilão de quem já gasta R$ 10 mil por dia, e você perde. Copie a *estrutura que funciona*, mude o
> ângulo, o público ou o formato.

---

## 1. O fluxo completo

| # | Etapa | O que fazer | No painel |
|---|---|---|---|
| 1 | Minerar | Achar ofertas com muitos anúncios ativos e rodando há semanas | **Minerar**, **Ofertas escaladas**, **Gateways** |
| 2 | Validar | Conferir rota, nº de páginas, tráfego, Reclame Aqui | **Análise de domínio** |
| 3 | Acompanhar | Separar 5–10 ofertas e ver quem cresce por 3+ dias | **Minhas listas** + Atualizar contagens |
| 4 | Modelar | Entender por que converte e criar um ângulo próprio | **Prompts → Modelagem** |
| 5 | Entregável | Produzir o produto (pack, PDF, desafio) | **Prompts → Entregável** |
| 6 | Página / quiz | Página simples, mobile, com prova, bônus, garantia | **Prompts → Página de vendas** |
| 7 | Checkout | Preço R$ 9,90–29,90, 4–6 order bumps, upsell | **Calculadoras** |
| 8 | Criativos | Modelar os campeões (mais duplicados) | **Biblioteca de anúncios → Modelar** |
| 9 | Testar | Vários criativos, 1 ticket por criativo, 3 dias | **Calculadoras → Orçamento de teste** |
| 10 | Escalar | Duplicar o que vende, novos criativos sem parar | **Calculadoras → Projeção** |

---

## 2. Mineração na Biblioteca de Anúncios (grátis)

**Configuração:** país (Brasil ou *Todos* para gringa) · **Todos os anúncios** · status **Ativos**.

**Como pesquisar** (a Biblioteca procura no texto, na imagem, na fala do vídeo **e no link de destino**):

- **Palavra do nicho** → volume. Use **aspas** para frase exata (Matheus Lourenço).
- **Preço** → low ticket direto: `por apenas R$ 10`, `9,90`, `19,90`. Pesquise **`R$ 67`** para achar ofertas
  melhores e modele vendendo a R$ 19,90 (Guilherme Franklim).
- **Formato** → `pacote`, `pack`, `PDF por apenas`, `baixe agora` (Andre Luiz).
- **Quiz** → `faça o teste`, `responda o quiz`, `nicho + quiz/teste`; domínios `quiz.cakto`, `inlead`, `xquiz`
  (Matheus Bressan).
- **Infra** → domínio do checkout (`pay.cakto.com.br`, `pay.kiwify.com.br`) e do cloaker `twr.` (Arthur Oliveira).
- **Criativo campeão → mais palavras-chave:** transcreva o vídeo (TurboScribe) e peça 30 palavras-chave à IA
  (Arthur Oliveira) — prompt pronto em **Prompts**.
- **Sazonal:** Páscoa, Dia das Mães, Natal... comece ~30 dias antes (Felipe Lona).
- **Gringa:** traduza as palavras para **espanhol**: muito infoproduto e pouca concorrência (Arthur Oliveira).

**Cuidados:** a Biblioteca bloqueia por algumas horas quem carrega demais (Matheus Lourenço, Matheus Bressan). O
minerador vai devagar, com pausas aleatórias.

### Critérios de oferta escalada

| Sinal | Referência |
|---|---|
| 5+ anúncios ativos | mínimo para considerar (Andre Luiz) |
| 15+ anúncios | já vale modelar (Felipe Lona) |
| 30–75+ anúncios | escalada ("75 é um ótimo número", Guilherme Franklim) |
| Ativo há 2+ semanas | filtre a data de início para 14 dias atrás (Matheus Bressan) |
| Mais de uma página no mesmo domínio | "quem escala roda em várias contas" (Arthur Oliveira) |
| Criativo com muitas variações | "X anúncios usam esse criativo" = escala |
| Cresce dia após dia | acompanhe 5–10 ofertas por 3 dias (Guilherme Asvi) |
| Tráfego do site | 100 mil+ visitas = alto potencial (Similarweb, Guilherme Asvi) |
| Aparece no Reclame Aqui | "se não chegou lá, não escalou" (Matheus Lourenço) |

**Armadilha:** 20 anúncios com 6 horas de vida não é escala, é alguém subindo teste. Olhe sempre os dias rodando.

---

## 3. Mineração por gateway (o "hack do Semrush")

Nos vídeos (The Cold, Guilherme Henrique), o Semrush → **Traffic Analytics** é usado com o domínio do checkout
(`pay.hotmart.com`, `pay.kiwify.com.br`, `pay.cakto.com.br`, `checkout.perfectpay.com.br`, Kirvano...). Ele
mostra:

1. **Principais páginas** = os checkouts mais acessados = **as ofertas mais vendidas da plataforma**.
2. **Jornada de tráfego** = os sites que mandam visitas para o checkout = **as páginas de vendas**.

Custa US$ 139–480/mês (há teste de 7 dias). Kiwify, Perfect Pay e Ticto redirecionam o link e escondem o checkout.

**Versão grátis neste painel (aba Gateways):** a Biblioteca encontra anúncios pelo link de destino. Pesquisando o
domínio do checkout, o painel agrupa por checkout, soma as variações de criativo, abre cada checkout para ler
**produto e preço** e conta os anúncios de quem anuncia. Páginas de vendas que usam o gateway aparecem pela Análise de domínio.

**Outras rotas grátis citadas:**
- **Reclame Aqui** + nome do gateway (Kiwify, Kirvano, Hotmart, Perfect Pay, Cakto) → nomes de produtos
  reclamados = produtos que vendem muito (Matheus Lourenço, Felipe Lona, Carlos Oliveira).
- **urlscan.io** → pesquise "códigos padrões": link do checkout, script de VSL (`converteai`), UTMify (Carlos Oliveira).
- **Sites de notícias** (Metrópoles etc.) → anúncios nativos (Taboola) levam a advertoriais e VSLs de quem tem
  muito orçamento (Matheus Lourenço).
- **Google Ads Transparency** → por domínio ou pelo CNPJ do produtor.

---

## 4. Raio-X da oferta (validação)

Checklist (feito automaticamente na aba **Análise de domínio**):

- **Conferência de rota:** o link do anúncio leva mesmo para essa página? Quantos anúncios e **quantas páginas**
  usam o domínio? (The Cold)
- **sitemap.xml:** `site.com/sitemap.xml` lista todas as páginas do produtor; as mais recentes mostram o que ele
  está testando agora (The Cold, Guilherme Asvi).
- **Gateway e checkout:** procure `pay.`, `checkout` no código-fonte; abra o checkout e veja preço, order bumps e
  upsell (Guilherme Asvi).
- **Funil:** quiz, VSL (VTurb/ConverteAI, Panda) ou página direta? Direto para o checkout?
- **Gatilhos:** garantia, bônus, depoimentos, escassez, preço ancorado.
- **Tráfego:** Similarweb (visitas, país, **mobile = comprador**, desktop = afiliado/curioso; Ana Carolina Reis).

---

## 5. Modelagem

- **Entenda a lógica antes de modelar:** mecanismo único, ângulos, "bodies" de criativo que se repetem, público
  (Arthur Oliveira achou oferta que escalava só para público muçulmano: nicho dentro do nicho).
- **Subnichos:** se "crochê" ou "atividades bíblicas" vendem, existem dezenas de variações com menos leilão
  (Guilherme Henrique, Andre Luiz).
- **Melhore o que é fraco:** quiz ruim, página sem prova, checkout sem order bump. "Se o cara não fez, a gente faz"
  (Andre Luiz).
- **Preço:** a maioria testa R$ 9,90–19,90; Felipe Lona sugere R$ 19,90 quando o original está a R$ 12.

## 6. Página, quiz e checkout

- **Página:** simples, clean, mobile, direta (Andre Luiz). Lovable gera a página com IA de graça; troque os
  botões pelo seu link de checkout (Guilherme Emanoel, Andre Luiz, Guilherme Franklim).
- **Estrutura que se repete nas ofertas escaladas:** promessa → para quem é → o que recebe → prova social em
  print → bônus → preço ancorado ("de 97 por 19,90") → garantia de 7 dias → FAQ → escassez.
- **Pop-up de plano premium:** oferecer "básico × completo" ao clicar em comprar aumenta o ticket (Andre Luiz).
- **Checkout:** **4–6 order bumps** (Andre Luiz); provas sociais no checkout (Felipe Lona). Com produto de R$ 10
  sem bump, a taxa da plataforma come boa parte da margem (Guilherme Franklim): use a **Calculadora de CPA**.

### Quiz: 10 ajustes que aumentam a conversão (Matheus Bressan)

- O **criativo precisa continuar na 1ª etapa do quiz**: se o anúncio fala de "teste de violão", a primeira tela
  fala de teste de violão.
- **1ª pergunta fácil** e alinhada ao anúncio. Nada de pedir **nome, e-mail e WhatsApp logo de cara**: é uma
  barreira enorme.
- Insira **notícias e estudos científicos** e **depoimentos (de preferência em vídeo)** entre as perguntas.
- O quiz não vende: ele **eleva a consciência**. A última etapa precisa ser uma **página de vendas completa**
  (headline, subheadline, conexão emocional, benefícios, por que funciona, oferta).
- Quiz costuma ser **mais barato** que VSL no low ticket e mostra **onde as pessoas desistem** (Lucão Ferraz,
  CaktoCast). Funciona também colocar uma **mini-VSL no próprio criativo** e mandar direto para o checkout.

## 7. Entregável

- **Packs em PDF** são os mais fáceis: busque material no Google com `filetype:pdf`, no Pinterest e no Scribd,
  e prefira conteúdo próprio ou de domínio público (Guilherme Emanoel).
- **Com IA:** o ChatGPT escreve o conteúdo (ex.: "50 receitas sem glúten"), o **Gamma** diagrama o e-book e o
  **Canva** finaliza capa e páginas. Exporte em PDF e entregue pela área de membros da plataforma.

## 8. Criativos

- **O criativo é o 80/20 do low ticket** (Kauã Henrique, Lucão Ferraz). Estrutura: **hook (3 s) → body → CTA**.
- Low ticket é **compra por impulso**: mostre os **benefícios imediatos** do produto no criativo.
- **Um criativo por público** (ex.: professoras × mães de crianças autistas) e teste **todos os ângulos**: a
  oferta de Natal do Kauã só estourou no ângulo "figurinhas de Natal".
- Formatos: UGC, **tela dividida**, tela verde, **imagem quadrada 1080×1080 "formato feedback"** (depoimento em
  texto no topo + imagem + oferta; Donatelli Digital escalou mais com imagem do que com vídeo).
- **UGC com IA** (ticomkt): ChatGPT gera o avatar e o mockup → Grok/Veo gera o vídeo → ElevenLabs gera a voz
  → DreamFace sincroniza a boca → CapCut edita e legenda.
- Baixe os criativos **só da oferta escolhida** (Guilherme Asvi) e foque nos **mais duplicados**.
- **Não suba o mesmo vídeo do concorrente:** mesmo criativo = mesmo leilão, e quem paga mais ganha (Felipe Lona).
- Prompts prontos em **Prompts de IA** e no botão **Modelar ** de cada criativo.

## 9. Campanha, teste e escala

O **Plano de campanha** (Calculadoras e plano) monta as três fases com o seu ticket. Estruturas citadas:

| Quem | Teste | Pré-escala | Escala |
|---|---|---|---|
| Guilherme Emanoel | ABO 1-1-1, **1 criativo por campanha**, R$ 20–25/dia (ticket ≤ R$ 25), 24h | duplica os vencedores e sobe a cópia para R$ 30–50, 48–72h | duplica e sobe ~20%; bateu o CPA, desliga o conjunto e reativa no fim do dia |
| Andre Luiz (pós-Andromeda) | ABO por criativo, só mobile, Facebook + Instagram, começa às 5h | — | sem venda em 2 dias, mata o criativo; "tudo é teste": algumas ofertas escalam em CBO, outras em ABO |
| Lucão Ferraz (CaktoCast) | CBO forçando **1–2 tickets por conjunto** ("ABO dentro do CBO"), 3–7 dias | 3 campanhas por conta, sem duplicar demais | +30% com orçamento baixo, +3–5% com orçamento alto |
| Emanuel Victor | CBO 1-1-1 sem bid cap, **3 cópias** do mesmo criativo, orçamento 3× ticket | sobe depois de ~10 vendas | replica em novas contas; o funil (upsell, downsell, bumps) paga a escala |
| Felipe Lona | 3× o ticket por campanha, 10–15 campanhas duplicadas, início às 8h | — | otimiza cortando as que não vendem |
| Guilherme Asvi | cada criativo gasta ≥ 1 ticket e roda 3 dias | — | — |

Comum a todos: objetivo **Vendas**, evento **Compra**, pixel na plataforma de vendas, público aberto/Advantage+,
**CPA é a métrica principal**, e **rode várias ofertas ao mesmo tempo**: "uma hora a oferta para de vender"
(Guilherme Henrique).

---

## 10. Ferramentas citadas (e o que este painel substitui)

Veja a tabela completa em **Calculadoras**. Em resumo:

| Pago | Função | Substituto grátis aqui |
|---|---|---|
| Minera ROI / Minera Ads | rolar a Biblioteca e filtrar páginas com 5+ anúncios | **Minerar** + **Ofertas** |
| Semrush Traffic Analytics | checkouts mais acessados por gateway | **Gateways** |
| AdHeart | criativos a partir do link | **Análise de domínio → páginas que anunciam** + **Biblioteca de anúncios** |
| Swipe files pagos | banco de ofertas e criativos | **Minhas listas** + **Biblioteca de anúncios** |

Limitações honestas: ninguém tem o faturamento real. Ferramentas que mostram "R$ X/dia" estão estimando. Aqui o
volume de anúncios ativos, a duplicação e o crescimento são os sinais, os mesmos que os mineradores usam.
