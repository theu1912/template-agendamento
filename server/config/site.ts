/**
 * CONFIGURAÇÃO DO CLIENTE (SERVER)
 * ------------------------------------------------------------
 * Espelho do client/src/config/site.ts para uso no backend
 * (prompt do chatbot, mensagens de WhatsApp, etc).
 * Mantenha os valores de nomeBarbearia, whatsappNumero e
 * telefoneExibicao sincronizados com o arquivo do client.
 * ------------------------------------------------------------
 */

export const siteConfig = {
  nomeBarbearia: "Sua Barbearia",
  cidade: "Curitiba, PR", // manter sincronizado com client/src/config/site.ts (bairroCidade)
  whatsappNumero: "5500000000000",
  telefoneExibicao: "(00) 00000-0000",

  // Nomes dos profissionais ativos, usados pelo bot para oferecer opções
  profissionais: ["Profissional 1", "Profissional 2", "Profissional 3"],

  // Horário de funcionamento exibido no prompt do bot. Placeholder proposital
  // (não fictício) — replicar manualmente em client/src/config/site.ts
  // (campo `horarioFuncionamentoDetalhado`) quando o cliente definir o horário real.
  horarioFuncionamento: "A definir com o cliente",

  // Tabela de preços usada pelo bot para calcular orçamentos.
  // Ajuste livremente para os serviços reais do cliente.
  servicos: [
    { nome: "Cabelo", preco: 60 },
    { nome: "Barba", preco: 60 },
    { nome: "Cabelo & Barba", preco: 110 },
    { nome: "Corte à Máquina", preco: 35 },
    { nome: "Pézinho", preco: 25 },
    { nome: "Sobrancelha Pinça", preco: 40 },
    { nome: "Sobrancelha Navalha", preco: 25 },
    { nome: "Hidratação", preco: 25 },
  ],

  // Serviços especiais/diferenciais (opcional). Deixe a lista vazia ([])
  // se o cliente não tiver ofertas especiais além do corte/barba padrão —
  // o bloco inteiro é omitido automaticamente do prompt do bot nesse caso.
  servicosEspeciais: [] as Array<{
    nome: string;
    beneficios: string;
  }>,

  // Política de desconto: true = o bot recusa pedidos de desconto educadamente
  negarDescontos: true,
} as const;

export function formatarListaServicos(): string {
  return siteConfig.servicos
    .map((s) => `- ${s.nome}: R$ ${s.preco.toFixed(2).replace(".", ",")}`)
    .join("\n");
}

export function formatarServicosEspeciais(): string {
  if (siteConfig.servicosEspeciais.length === 0) return "";

  const lista = siteConfig.servicosEspeciais
    .map((s, i) => `${i + 1}. ${s.nome}:\n- Benefícios: ${s.beneficios}`)
    .join("\n\n");

  return `\nDIRETRIZES PARA SERVIÇOS ESPECIAIS (REGRA ABSOLUTA):\nSe o cliente abordar algum dos serviços especiais abaixo, explique os benefícios com entusiasmo, mas NUNCA feche o negócio, não agende e não passe valores finais. Ao terminar de explicar os benefícios, você DEVE OBRIGATORIAMENTE direcionar o cliente para falar com um consultor/gerente humano através do WhatsApp ${siteConfig.telefoneExibicao} (enviando o link https://wa.me/${siteConfig.whatsappNumero}) para passar os valores e finalizar a reserva.\n\n${lista}\n`;
}
