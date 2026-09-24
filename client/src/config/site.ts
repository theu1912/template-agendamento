/**
 * CONFIGURAÇÃO DO CLIENTE
 * ------------------------------------------------------------
 * Este é o ÚNICO arquivo que precisa ser editado para adaptar
 * o site a uma nova barbearia. Troque os valores abaixo e o
 * site inteiro (Home, ChatWidget, AdminLogin, AdminDashboard)
 * se atualiza automaticamente.
 *
 * Campos marcados como PLACEHOLDER devem ser substituídos
 * antes de apresentar a demo para o cliente.
 * ------------------------------------------------------------
 */

export const siteConfig = {
  // Identidade
  nomeBarbearia: "Sua Barbearia",
  nomeBarbeariaCurto: "Sua Barbearia", // usado em espaços menores (header, footer)
  anoFundacao: "2024",
  slogan: "[Seu slogan aqui — ex: Cuidando do seu estilo desde {ANO}]",
  // Texto da seção "A Nossa Essência". NÃO é texto fixo do template — é a
  // história própria de cada barbearia e deve ser preenchida/reescrita pelo
  // dono do negócio (fundação, missão, diferencial). O texto abaixo é apenas
  // um placeholder de exemplo.
  sobre: "[Escreva aqui a história da sua barbearia: quando foi fundada, a missão e o que te diferencia.]",
  // Segundo parágrafo da mesma seção "A Nossa Essência" — também texto livre
  // do dono da barbearia (complemento do campo `sobre` acima), não fixo do template.
  sobreComplemento: "[Complemente aqui com mais detalhes sobre a experiência que os clientes encontram no seu espaço.]",
  // Texto curto do rodapé, abaixo do nome da barbearia. Texto livre do
  // cliente — não deve carregar posicionamento fixo do template (ex:
  // "Barbearia Premium"), já que nem toda barbearia quer esse tom.
  footerDescricao: "[Escreva aqui uma frase curta sobre a sua barbearia para o rodapé.]",

  // Visual
  logoUrl: "/assets/logo_placeholder.png",
  logoAlt: "Logo da barbearia",
  corPrimaria: "#1A1A1A",   // preto/cor de base
  corDestaque: "#800020",   // bordô/cor de destaque (hover, títulos)
  corAcento: "#D4AF37",     // dourado/cor de acento (detalhes, tracking labels)
  heroImageUrl: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=800",

  // Contato
  whatsappNumero: "5500000000000", // formato internacional, só dígitos, ex: 5541999999999
  telefoneExibicao: "(00) 00000-0000",
  email: "contato@suabarbearia.com.br",
  instagramUrl: "https://instagram.com/",

  // Localização — cidade fixada em Curitiba, PR (endereço exato ainda não
  // definido pelo cliente). Fonte única: server/config/site.ts (campo `cidade`)
  // deve refletir a mesma cidade manualmente, pois não há import compartilhado
  // entre client e server (ver barbershop-template-stack.md).
  endereco: "Endereço a definir com o cliente",
  bairroCidade: "Curitiba, PR",
  enderecoCompleto: "Curitiba, PR", // usado no link do Google Maps
  googleMapsEmbedUrl: "https://www.google.com/maps?q=Curitiba%2C+PR&output=embed",
  // Fonte única de horário: NÃO duplicar esse texto em outro lugar do client.
  // Placeholder proposital (não fictício) — deve ser substituído pelo horário
  // real do cliente antes da demo, e replicado manualmente em
  // server/config/site.ts (campo `horarioFuncionamento`).
  horarioFuncionamentoDetalhado: "A definir com o cliente",

  // Horário estruturado por dia da semana, usado só para calcular o badge
  // "Aberto agora" / "Fechado" em Home.tsx (cálculo em texto livre não é
  // possível). PLACEHOLDER de demonstração (Seg-Sáb 09h-19h, fechado
  // domingo) — substituir pelos horários reais do cliente junto com
  // `horarioFuncionamentoDetalhado` acima. Cada dia aceita múltiplos
  // intervalos (ex: para pausa de almoço) ou array vazio se fechado.
  horarioFuncionamentoSemana: {
    dom: [] as { abre: string; fecha: string }[],
    seg: [{ abre: "09:00", fecha: "19:00" }],
    ter: [{ abre: "09:00", fecha: "19:00" }],
    qua: [{ abre: "09:00", fecha: "19:00" }],
    qui: [{ abre: "09:00", fecha: "19:00" }],
    sex: [{ abre: "09:00", fecha: "19:00" }],
    sab: [{ abre: "09:00", fecha: "17:00" }],
  },

  // Números de destaque (seção "A Nossa Essência")
  statsAnosHistoria: "1+",
  statsClientesSatisfeitos: "500+",

  // Tabela de serviços exibida no site e usada como base pelo AdminDashboard.
  // Mantenha sincronizada com server/config/site.ts (usado pelo prompt do bot).
  servicos: [
    { nome: "Cabelo", preco: 60 },
    { nome: "Barba", preco: 60 },
    { nome: "Cabelo & Barba", preco: 110 },
    { nome: "Corte à Máquina", preco: 35 },
    { nome: "Pézinho", preco: 25 },
    { nome: "Sobrancelha Pinça", preco: 40 },
    { nome: "Sobrancelha Navalha", preco: 25 },
    { nome: "Hidratação", preco: 25 },
    { nome: "Remoção de Pêlos do Nariz", preco: 25 },
    { nome: "Remoção de Pêlos da Orelha", preco: 25 },
    { nome: "Terapia Facial", preco: 35 },
    { nome: "Selagem", preco: 100 },
    { nome: "Camuflagem Grisalho", preco: 65 },
    { nome: "Platinado", preco: 220 },
  ],

  // Equipe (exibida no site e usada como base pelo AdminDashboard)
  profissionais: [
    { id: 1, nome: "Profissional 1", comissao: 50 },
    { id: 2, nome: "Profissional 2", comissao: 50 },
    { id: 3, nome: "Profissional 3", comissao: 50 },
  ],

  // Depoimentos (PLACEHOLDER — nomes e textos fictícios, trocar pelas
  // avaliações reais do cliente, ex: recortadas do Google Meu Negócio,
  // antes de apresentar a demo). Usados na seção rotativa "O que dizem
  // nossos clientes".
  depoimentos: [
    { nome: "[Nome do cliente]", texto: "[Cole aqui um depoimento real, por exemplo recortado do Google Meu Negócio.]" },
    { nome: "[Nome do cliente]", texto: "[Outro depoimento real do seu negócio vai aqui.]" },
    { nome: "[Nome do cliente]", texto: "[Mais um exemplo de avaliação de um cliente satisfeito.]" },
  ],

  // Serviço especial opcional (ex: pacote noivo, day spa, combo VIP).
  // Deixe habilitado=false para omitir essa seção inteira do site.
  servicoEspecial: {
    habilitado: false,
    anchorId: "servico-especial",
    tag: "Experiência Premium",
    titulo: "Serviço Especial",
    descricao: "Descreva aqui o diferencial exclusivo da barbearia.",
    itens: [
      { titulo: "Item 1", desc: "Descrição breve do item 1." },
      { titulo: "Item 2", desc: "Descrição breve do item 2." },
      { titulo: "Item 3", desc: "Descrição breve do item 3." },
    ],
    ctaTexto: "SOLICITAR ORÇAMENTO NO WHATSAPP",
    ctaMensagem: "Olá! Tenho interesse no {SERVICO_ESPECIAL} e gostaria de mais informações.",
  },

  // Assinatura do desenvolvedor (mantém sua marca nas demos)
  desenvolvedorNome: "Matheus Machado",
  desenvolvedorWhatsapp: "5541988255734",
  desenvolvedorMensagem: "Olá! Estou interessado em um desenvolvimento de site",
} as const;

// Helpers de mensagens padrão do WhatsApp, já usando os dados acima
export const whatsappMessages = {
  agendar: () =>
    `Olá! Gostaria de agendar um horário na ${siteConfig.nomeBarbeariaCurto}.`,
};
