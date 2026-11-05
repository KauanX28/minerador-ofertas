// Prompts para usar no ChatGPT / Claude / Gemini / Lovable. {{NICHO}} e {{CRIATIVO}} são preenchidos pelo painel.
window.PROMPTS = [
  { cat: 'Mineração', titulo: '30 palavras-chave a partir de um criativo escalado', fonte: 'transcreva o criativo (TurboScribe) e peça palavras-chave', criativo: true,
    texto: `Você é especialista em mineração de ofertas na Biblioteca de Anúncios da Meta.
Analise o criativo abaixo e me dê 30 palavras-chave e frases curtas (2 a 5 palavras) que provavelmente aparecem em OUTROS anúncios escalados do mesmo nicho/mecanismo, para eu pesquisar na Biblioteca.
Misture: termos da dor, do mecanismo, do formato do produto, CTAs e frases de prova social. Depois traduza as 10 melhores para espanhol.

CRIATIVO:
{{CRIATIVO}}` },
  { cat: 'Mineração', titulo: 'Palavras-chave do nicho para a Biblioteca', fonte: '',
    texto: `Me ajude a minerar ofertas low ticket na Biblioteca de Anúncios do Facebook no nicho: {{NICHO}}.
Gere 40 termos de pesquisa divididos em: (1) dores e desejos, (2) nome do formato do produto (pack, PDF, desafio, protocolo...), (3) termo do nicho + "quiz"/"teste", (4) frases que o expert falaria no vídeo, (5) versões em espanhol.
Formato: lista simples, um termo por linha, sem explicação.` },
  { cat: 'Mineração', titulo: 'Subnichos a partir de uma oferta validada', fonte: '"a concepção já é validada, ache subnichos"',
    texto: `Esta oferta está escalada e validada: {{NICHO}}.
Liste 25 subnichos/variações onde a MESMA concepção pode ser vendida com pouca concorrência (públicos específicos, idades, profissões, religiões, datas, problemas específicos). Para cada um: público, promessa em 1 linha e nome de produto low ticket.` },
  { cat: 'Modelagem', titulo: 'Modelar (não clonar) uma oferta', fonte: 'clonar te joga no leilão contra quem já escala',
    texto: `Vou colar abaixo a página de vendas de uma oferta low ticket escalada no nicho {{NICHO}}.
1) Explique por que ela converte: promessa, mecanismo, prova, oferta, bônus, garantia, escassez.
2) Liste 10 melhorias concretas (copy, estrutura, oferta, preço ancorado, order bumps).
3) Proponha 3 ÂNGULOS novos (público, mecanismo ou formato diferentes) para eu criar uma oferta própria sem disputar o mesmo leilão.
4) Escreva a nova headline, subheadline e 5 bullets para o melhor ângulo.

PÁGINA:
[COLE AQUI O TEXTO DA PÁGINA]` },
  { cat: 'Modelagem', titulo: 'Order bumps e upsell para aumentar o ticket', fonte: '"rodo minhas ofertas com 4 a 6 order bumps"',
    texto: `Meu produto low ticket é: {{NICHO}} (preço R$ 19,90).
Sugira 6 order bumps (R$ 7 a R$ 19,90) e 2 upsells (R$ 27 a R$ 67) que façam sentido logo após a compra. Para cada um: nome, o que entrega, preço, e a frase de checkout de 1 linha que faz a pessoa marcar a caixa.` },
  { cat: 'Página de vendas', titulo: 'Página de vendas low ticket no Lovable', fonte: 'Lovable tem créditos grátis por dia',
    texto: `Crie uma página de vendas mobile-first, em português do Brasil, para um produto digital low ticket: {{NICHO}}.
Estrutura (nesta ordem):
1. Headline forte com a promessa + subheadline com o mecanismo
2. Imagem/mockup do produto e botão "QUERO AGORA"
3. Para quem é (3 cartões) e o que vai aprender/receber (lista com ícones)
4. Prova social: 6 depoimentos em formato de print de comentário do Facebook/WhatsApp
5. Bônus (3 cartões com valor riscado)
6. Oferta: de R$ 97 por R$ 19,90, "pagamento único", "acesso imediato", selo de garantia de 7 dias
7. Escassez discreta (vagas/tempo limitado) e FAQ com 6 perguntas
8. Rodapé simples
Paleta acolhedora, fontes grandes, botões fixos no mobile. Todos os botões devem apontar para: [LINK DO CHECKOUT].` },
  { cat: 'Página de vendas', titulo: 'Quiz de 8 a 12 perguntas', fonte: 'quiz + VSL; micro-compromissos aumentam a conversão',
    texto: `Crie um quiz de funil para vender um produto low ticket: {{NICHO}}.
- 8 a 12 perguntas, uma por tela, com 3-4 opções curtas e emoji
- Comece fácil (idade, objetivo), depois dor, tentativas que falharam, rotina e urgência
- Inclua 2 telas de "prova social/autoridade" entre as perguntas
- Tela de "analisando suas respostas" e resultado personalizado com o nome do problema + a solução (meu produto)
- Termine com a oferta (preço ancorado, garantia, bônus) e botão para o checkout
Devolva em formato de lista: tela, texto, opções.` },
  { cat: 'Entregável', titulo: 'Criar o entregável (e-book / pack) com IA', fonte: '',
    texto: `Quero criar o entregável de um produto low ticket: {{NICHO}}.
1) Monte o sumário completo (8 a 12 capítulos ou itens do pack) que entregue a promessa de forma prática.
2) Escreva o capítulo 1 completo, em linguagem simples, com passos numerados, checklists e exemplos.
3) Sugira 3 bônus fáceis de produzir (checklist, planilha, guia rápido) e o conteúdo de cada um.
4) Sugira o título do produto e o texto da capa.
Depois eu peço os próximos capítulos um por um.` },
  { cat: 'Criativos', titulo: '10 ganchos (hooks) para os 3 primeiros segundos', fonte: 'O gancho decide o criativo', criativo: true,
    texto: `Com base no criativo/oferta abaixo, escreva 10 ganchos diferentes para os 3 primeiros segundos de um vídeo de anúncio no Instagram/Facebook.
Use ângulos variados: dor, curiosidade, prova, contraintuitivo, "erro comum", identificação com público específico, antes/depois, pergunta direta.
Para cada gancho: texto falado + texto na tela + sugestão de imagem inicial.

OFERTA/CRIATIVO:
{{CRIATIVO}}` },
  { cat: 'Criativos', titulo: 'Roteiro UGC de 30 a 45 segundos', fonte: 'Criativos UGC com IA', criativo: true,
    texto: `Escreva 3 roteiros de vídeo UGC (pessoa comum falando para a câmera, 30 a 45 s) para vender este produto low ticket.
Estrutura: gancho (0-3s) → problema → descoberta/mecanismo → o que vem no produto → prova → CTA "clica em saiba mais".
Linguagem falada, frases curtas, sem parecer anúncio. Indique o que mostrar na tela em cada trecho.

PRODUTO/CRIATIVO DE REFERÊNCIA:
{{CRIATIVO}}` },
  { cat: 'Criativos', titulo: 'Criativos de imagem estática', fonte: 'Criativos em imagem para low ticket', criativo: true,
    texto: `Crie 8 conceitos de criativo em IMAGEM para um produto low ticket com base na referência abaixo.
Para cada um: título grande (até 7 palavras), subtítulo, elementos visuais, cores, e o prompt em inglês para gerar a imagem numa IA de imagem.
Varie: lista de benefícios, antes/depois, mockup do produto, print de depoimento, "X erros que...", oferta com preço.

REFERÊNCIA:
{{CRIATIVO}}` },
  { cat: 'Criativos', titulo: 'Variações de copy do anúncio campeão', fonte: 'Modelar a copy sem copiar', criativo: true,
    texto: `Este é o texto de um anúncio campeão (está duplicado em vários conjuntos). Escreva 5 variações com o MESMO esqueleto persuasivo, mas outras palavras, outro gancho e outra prova. Mantenha o tamanho parecido e termine com CTA.

ANÚNCIO:
{{CRIATIVO}}` },
  { cat: 'Criativos', titulo: 'Criativo em imagem "formato feedback" (quadrado)', fonte: 'a maior parte da escala dele foi com imagem 1080x1080 em formato de depoimento', criativo: true,
    texto: `Preciso de 10 criativos em IMAGEM no "formato feedback" para um produto low ticket.
Requisitos de cada um:
- Formato quadrado 1080x1080
- Texto no topo como se fosse um depoimento real em 1ª pessoa (2 a 3 linhas, linguagem simples, com idade/situação da pessoa)
- Imagem central que mostre o produto (mockup) ou o resultado
- Faixa inferior com a oferta e o CTA (ex.: "30 receitas por R$ 19,90 — clique em Saiba mais")
Entregue: texto do topo, descrição da imagem, texto da faixa e um prompt em inglês para gerar a imagem.

PRODUTO / REFERÊNCIA:
{{CRIATIVO}}` },
  { cat: 'Criativos', titulo: 'Avatar + mockup para UGC com IA', fonte: 'ChatGPT (avatar e mockup) → Grok (vídeo) → ElevenLabs (voz) → DreamFace (lip-sync) → CapCut',
    texto: `Etapa 1 (imagem do avatar): Gere uma foto realista, estilo selfie de celular, de uma pessoa que represente o público de: {{NICHO}}. Luz natural, casa comum, sem aparência de modelo, segurando um celular/tablet mostrando o produto.
Etapa 2 (mockup): Gere a capa/mockup do produto digital "{{NICHO}}" com título grande, cores chamativas e elementos do tema, em perspectiva sobre um tablet.
Etapa 3 (roteiro de 30 s para a voz): escreva a fala em 1ª pessoa, tom de conversa, com gancho nos 3 primeiros segundos, benefício imediato, prova e CTA "clica em saiba mais".` },
  { cat: 'Entregável', titulo: 'Conteúdo do e-book para montar no Gamma', fonte: 'ChatGPT gera o conteúdo, o Gamma diagrama o PDF, o Canva finaliza',
    texto: `Crie o conteúdo completo de um e-book para o produto: {{NICHO}}.
Formato pronto para colar no Gamma (um card por item):
- Capa: título, subtítulo
- Introdução curta (promessa + como usar o material)
- 30 itens práticos (ex.: receitas/atividades/exercícios), cada um com: nome, tempo/dificuldade, lista de materiais/ingredientes, passo a passo numerado e dica
- Página final com próximos passos e espaço para o link de suporte
Linguagem simples, frases curtas, nada de enrolação.` },
  { cat: 'Gringa', titulo: 'Adaptar oferta BR para espanhol', fonte: 'oferta escalada no Brasil rodando em espanhol',
    texto: `Adapte esta oferta low ticket brasileira para o público hispano (México, Colômbia, Argentina, Espanha): {{NICHO}}.
Traduza e LOCALIZE: headline, bullets, depoimentos (nomes e cidades locais), moeda e preço psicológico em dólar (US$ 7 a 17), garantia e CTA. Aponte expressões que não funcionam em espanhol e sugira equivalentes.` },
];
