// Conhecimento do método de mineração e modelagem de low ticket.
// Usado pelo painel: gerador de palavras-chave, prompts de IA, ferramentas e critérios.

window.PALAVRAS = [
  { grupo: 'Preço / ticket', dica: 'Pesquisar o preço acha low tickets direto. Dica: pesquise "R$ 67" para achar ofertas melhores e modele vendendo a R$ 19,90.',
    itens: ['por apenas R$ 10', 'por apenas R$ 9,90', 'R$ 19,90', 'R$ 27', 'R$ 37', 'R$ 47', 'R$ 67', 'de R$ 97 por', 'menos de R$ 1 por dia'] },
  { grupo: 'CTA de low ticket', dica: 'Termos que quase todo anúncio de infoproduto barato usa.',
    itens: ['acesso imediato', 'baixe agora', 'garantia de 7 dias', 'acesso vitalício', 'pagamento único', 'teste grátis', 'receba no e-mail', 'clique em saiba mais'] },
  { grupo: 'Formato do entregável', dica: 'Packs e pacotes são o formato mais rodado (ex.: "pacote por apenas 9,99", "PDF por apenas 10 reais").',
    itens: ['pacote com', 'pack com', '+ de 1000', 'PDF', 'e-book', 'planilha', 'atividades', 'moldes', 'receitas', 'cards', 'kit completo', 'aulas gravadas', 'templates'] },
  { grupo: 'Quiz', dica: 'A Biblioteca busca também o texto falado no vídeo e escrito na imagem. Use "nicho + quiz/teste".',
    itens: ['faça o teste', 'responda o quiz', 'descubra qual', 'teste rápido', 'descubra seu', 'responda 3 perguntas', 'faça o quiz', 'quiz gratuito'] },
  { grupo: 'Infra (links / plataformas)', dica: 'A Biblioteca encontra anúncios pelo link de destino. Domínio de quiz/checkout = quem manda direto.',
    itens: ['pay.hotmart.com', 'pay.kiwify.com.br', 'pay.cakto.com.br', 'pay.kirvano.com', 'chk.eduzz.com', 'pay.hub.la', 'quiz.cakto', 'inlead', 'xquiz', 'twr.', 'hop.clickbank.net', 'buy.stripe.com', 'digistore24.com'] },
  { grupo: 'Mecanismo / gatilho', dica: 'Frases de copy de resposta direta. Use aspas para frase exata.',
    itens: ['a verdadeira razão', 'o segredo', 'método', 'protocolo', 'desafio 21 dias', 'desafio 7 dias', 'mais de 10 mil', 'sem academia', 'em casa', 'o que ninguém te conta'] },
  { grupo: 'Sazonal', dica: 'Datas comemorativas geram ofertas com dezenas de anúncios. Comece a minerar ~30 dias antes da data.',
    itens: ['páscoa', 'dia das mães', 'dia dos pais', 'natal', 'black friday', 'volta às aulas', 'festa junina', 'ano novo'] },
  { grupo: 'Gringa (ES/EN)', dica: 'Comece pelo espanhol — muito infoproduto e menos concorrência. Mude o país para ALL.',
    itens: ['acceso inmediato', 'por solo', 'reto 21 días', 'garantía de 7 días', 'instant access', 'only $', '21 day challenge', 'take the quiz', 'quiz'] },
];

window.CRITERIOS = [
  ['5+ anúncios ativos', 'mínimo para considerar'],
  ['15+ anúncios ativos', 'já vale modelar'],
  ['30–75+ anúncios', 'escalada (ex.: "75 é um ótimo número")'],
  ['Ativo há 2+ semanas', 'filtre a data de início para 14 dias atrás'],
  ['Mais de uma página no mesmo domínio', 'quem escala roda em várias contas'],
  ['Criativo com muitas variações', '"X anúncios usam esse criativo" = escala horizontal'],
  ['Crescimento entre dias', 'acompanhe 5–10 ofertas por 3 dias e fique com a que cresce com consistência'],
  ['Tráfego do site', 'Similarweb: 100 mil+ visitas = alto potencial; acesso mobile = comprador, desktop = afiliado/curioso'],
  ['Está no Reclame Aqui', '"se não chegou no Reclame Aqui, não está escalado"'],
];

window.FERRAMENTAS = [
  { nome: 'Biblioteca de Anúncios da Meta', url: 'https://www.facebook.com/ads/library/', uso: 'Fonte de todas as ferramentas de espionagem', gratis: 'Sim', aqui: 'Minerar / Ofertas escaladas' },
  { nome: 'Semrush (Traffic Analytics)', url: 'https://www.semrush.com/', uso: 'Checkouts mais acessados de cada gateway e páginas que mandam tráfego', gratis: 'Teste de 7 dias', aqui: 'Gateways (por anúncios ativos)' },
  { nome: 'Similarweb', url: 'https://www.similarweb.com/', uso: 'Visitas estimadas do site, país e dispositivo', gratis: 'Extensão grátis', aqui: 'Atalho na Análise de domínio' },
  { nome: 'Minera ROI / Minera Ads', url: 'https://mineraroi.com.br/', uso: 'Extensão que rola a Biblioteca e filtra páginas com 5+ anúncios', gratis: 'Não', aqui: 'Minerar (automático)' },
  { nome: 'Ad Disparo / extensões de filtro', url: 'https://chromewebstore.google.com/search/biblioteca%20de%20anuncios', uso: 'Ordenar a Biblioteca por nº de anúncios', gratis: 'Sim', aqui: 'Ofertas (ranking)' },
  { nome: 'AdHeart', url: 'https://adheart.me/', uso: 'Achar criativos a partir do link da página', gratis: 'Trial (5 buscas)', aqui: 'Análise de domínio → páginas que anunciam' },
  { nome: 'Reclame Aqui', url: 'https://www.reclameaqui.com.br/', uso: 'Pesquisar o nome do gateway e achar produtos que vendem muito', gratis: 'Sim', aqui: 'Atalho na Análise de domínio' },
  { nome: 'Google Ads Transparency', url: 'https://adstransparency.google.com/', uso: 'Ver anúncios no Google por domínio ou CNPJ', gratis: 'Sim', aqui: 'Atalho na Análise de domínio' },
  { nome: 'urlscan.io', url: 'https://urlscan.io/', uso: 'Buscar páginas por código: link de checkout, script de VSL, UTMify', gratis: 'Sim', aqui: 'Atalho na Análise de domínio' },
  { nome: 'TikTok Creative Center', url: 'https://ads.tiktok.com/business/creativecenter/', uso: 'Ganchos e criativos em alta', gratis: 'Sim', aqui: '—' },
  { nome: 'sitemap.xml', url: '', uso: 'Todas as páginas do produtor, ordenadas pela mais recente', gratis: 'Sim', aqui: 'Análise de domínio (automático)' },
  { nome: 'TurboScribe', url: 'https://turboscribe.ai/', uso: 'Transcrever criativo/VSL para extrair palavras-chave com IA', gratis: '3 arquivos/dia', aqui: 'Prompts de IA' },
  { nome: 'Stream Recorder / Video DownloadHelper', url: 'https://chromewebstore.google.com/search/stream%20recorder', uso: 'Baixar VSL e vídeos', gratis: 'Sim', aqui: 'Biblioteca de anúncios (baixar vídeo)' },
  { nome: 'GoFullPage / Save Page WE', url: 'https://chromewebstore.google.com/search/gofullpage', uso: 'Print da página inteira / salvar HTML para estudar estrutura', gratis: 'Sim', aqui: '—' },
  { nome: 'Lovable', url: 'https://lovable.dev/', uso: 'Criar página de vendas com IA', gratis: 'Créditos grátis/dia', aqui: 'Prompts de IA' },
  { nome: 'ChatGPT / Claude / Gemini', url: 'https://gemini.google.com/', uso: 'Palavras-chave, copy, entregável, ganchos, avatar e mockup', gratis: 'Plano grátis', aqui: 'Prompts de IA' },
  { nome: 'Gamma', url: 'https://gamma.app/', uso: 'Montar e-book/PDF com IA a partir do conteúdo', gratis: 'Créditos grátis', aqui: 'Prompts → Entregável' },
  { nome: 'Canva', url: 'https://www.canva.com/', uso: 'Editar PDFs, capas, criativos em imagem 1080x1080', gratis: 'Sim', aqui: '—' },
  { nome: 'CapCut', url: 'https://www.capcut.com/', uso: 'Editar vídeo, legendas automáticas, tela dividida', gratis: 'Sim', aqui: '—' },
  { nome: 'ElevenLabs', url: 'https://elevenlabs.io/', uso: 'Voz da narração / avatar UGC', gratis: 'Créditos grátis/mês', aqui: '—' },
  { nome: 'Grok / Veo / Kling', url: 'https://grok.com/', uso: 'Gerar o vídeo do avatar UGC a partir da imagem', gratis: 'Limitado', aqui: 'Prompts → Criativos' },
  { nome: 'DreamFace', url: 'https://www.dreamfaceapp.com/', uso: 'Sincronizar a voz com o vídeo do avatar (lip-sync)', gratis: 'Limitado', aqui: '—' },
  { nome: 'Pinterest / Google "filetype:pdf"', url: 'https://www.google.com/search?q=atividades+filetype%3Apdf', uso: 'Achar material de domínio público para montar packs', gratis: 'Sim', aqui: '—' },
];

// Estruturas de campanha citadas (para o Plano de campanha das Calculadoras).
window.ESTRUTURAS = {
  abo: {
    nome: 'ABO 1-1-1 por criativo',
    fases: (t, n) => [
      ['Teste', `${n} campanhas ABO 1-1-1 (1 campanha, 1 conjunto, 1 criativo). Orçamento por conjunto: R$ ${Math.max(20, t).toFixed(2)}/dia (R$ 20–25 para ticket até R$ 25). Vendas → evento Compra, público Advantage+, só mobile, Facebook + Instagram.`,
        'Rode 24–48h (evite a madrugada). Sem venda em ~2 dias ou gasto > 1,5 ticket sem venda → desligue. A métrica principal é o CPA.'],
      ['Pré-escala', 'Duplique as campanhas dos criativos que venderam com CPA aceitável (1 a 3 cópias) e suba o orçamento da CÓPIA (ex.: R$ 20 → R$ 30–50). Não mexa na original.',
        'Mantenha 48–72h. Se o CPA e o volume se mantiverem estáveis, vá para a escala.'],
      ['Escala', 'Duplique as campanhas vencedoras e aumente o orçamento aos poucos (~20% por vez, ou dobrar quando o orçamento ainda é baixo).',
        'Bateu o CPA limite no dia? Desligue o conjunto e reative no fim do dia. Suba criativos novos sem parar.'],
    ],
  },
  cbo: {
    nome: 'CBO com gasto mínimo por conjunto',
    fases: (t, n) => [
      ['Teste', `CBO 1-1-1, mas forçando cada conjunto a gastar pelo menos 1–2 tickets/dia (≈ R$ ${(t * 2).toFixed(2)}): "um ABO dentro do CBO". ${n} criativos, um por conjunto.`,
        'Teste por 3 a 7 dias com orçamento baixo, mesmo tendo caixa. Corte quem não vende.'],
      ['Pré-escala', `Duplique o criativo vencedor em 3 campanhas CBO 1-1-1 por conta de anúncio, orçamento ≈ 3 tickets (R$ ${(t * 3).toFixed(2)}), sem bid cap.`,
        'Duplicar 3 vezes funcionou melhor do que duplicar 40. Ao atingir ~10 vendas, suba o orçamento.'],
      ['Escala', 'Suba ~30% quando o orçamento ainda é baixo e 3–5% quando já está alto. Replique a estrutura em novas contas.',
        'Para aguentar a escala, o funil precisa de upsell/downsell e order bumps: "empato no front e lucro no back".'],
    ],
  },
};

// Checklist de lançamento montado a partir dos vídeos.
window.CHECKLIST = [
  ['Oferta', [
    'Oferta modelo com 15+ anúncios ativos e 2+ semanas rodando',
    'Acompanhei a oferta por 3 dias e ela se manteve ou cresceu',
    'Defini um ângulo/público próprio (não é cópia)',
    'Preço entre R$ 9,90 e R$ 29,90 com âncora ("de R$ 97 por...")',
  ]],
  ['Funil', [
    'Criativo alinhado com a 1ª etapa do quiz/página',
    'Quiz: 1ª pergunta fácil e sem pedir nome/e-mail/WhatsApp',
    'Quiz: prova no meio (notícia, estudo, depoimentos em vídeo)',
    'Quiz termina numa página de vendas completa (headline, conexão, benefícios, por que funciona)',
    'Página mobile com prova social, bônus, garantia de 7 dias e FAQ',
  ]],
  ['Checkout', [
    'Pixel instalado na plataforma de vendas e evento Compra testado',
    '4 a 6 order bumps configurados',
    'Upsell/downsell depois da compra',
    'Provas sociais e selo de garantia no checkout',
    'CPA máximo calculado (Calculadoras e plano)',
  ]],
  ['Criativos', [
    'Pelo menos 5 criativos com ganchos diferentes (hook → body → CTA)',
    'Um criativo para cada público (ex.: professoras × mães)',
    'Formatos variados: UGC, imagem quadrada "feedback", tela dividida',
    'Benefícios imediatos do produto no criativo (low ticket é compra por impulso)',
    'Nenhum criativo igual ao do concorrente (evita o mesmo leilão)',
  ]],
  ['Campanha', [
    'Estrutura escolhida (ABO 1-1-1 ou CBO com gasto mínimo)',
    'Orçamento de teste separado (1 ticket por criativo/dia, 2–3 dias)',
    'Regra de corte definida antes de começar',
    'Início de madrugada evitado (5h–8h)',
  ]],
];
