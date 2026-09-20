// @ts-nocheck
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import fs from "fs";
import path from "path";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { createAppointment, getAppointments, updateAppointmentStatus, deleteAppointment, updateAppointmentServices, updateAppointmentDateTime } from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Anthropic from '@anthropic-ai/sdk';
import { siteConfig, formatarListaServicos, formatarServicosEspeciais } from "./config/site";

// Inicializa o cliente do Anthropic
const anthropic = new Anthropic();

// Log persistente do detector de "agendamento fantasma" (ver uso abaixo) —
// console.warn sozinho se perde toda vez que o servidor local é reiniciado
// (comum durante dev/demos), tornando o monitoramento inútil na prática.
const LOG_FANTASMA_DIR = path.join(process.cwd(), "logs");
const LOG_FANTASMA_PATH = path.join(LOG_FANTASMA_DIR, "agendamento-fantasma.log");

function registrarAgendamentoFantasma(respostaIA: string) {
  try {
    if (!fs.existsSync(LOG_FANTASMA_DIR)) {
      fs.mkdirSync(LOG_FANTASMA_DIR, { recursive: true });
    }
    const linha = `[${new Date().toISOString()}] ${respostaIA.replace(/\s+/g, " ").trim()}\n`;
    fs.appendFileSync(LOG_FANTASMA_PATH, linha);
  } catch (erroLog) {
    console.error("Falha ao gravar log de agendamento fantasma:", erroLog);
  }
}

export const appRouter = router({
  
  // ROTA DA IA (COM CONTEXTO DINÂMICO, MEMÓRIA E TOOL CALLING)
  chatWithAI: publicProcedure
    .input(z.object({ 
      message: z.string(),
      history: z.array(z.object({
        role: z.string(),
        text: z.string()
      })),
      telefone: z.string().optional(),
      email: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      try {
        const agora = new Date();
        const dataHoje = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        
        const ano = agora.toLocaleString('pt-BR', { year: 'numeric', timeZone: 'America/Sao_Paulo' });
        const mes = agora.toLocaleString('pt-BR', { month: '2-digit', timeZone: 'America/Sao_Paulo' });
        const dia = agora.toLocaleString('pt-BR', { day: '2-digit', timeZone: 'America/Sao_Paulo' });
        const dataIso = `${ano}-${mes}-${dia}`;
        
        const diaSemana = agora.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });
        const horaAtual = agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        const todosAgendamentos = await getAppointments();
        const agendamentosAtivos = todosAgendamentos.filter((app: any) => app.status !== 'cancelado' && app.appointmentDate >= dataIso);

        const ocupadosMap: Record<string, string[]> = {};
        agendamentosAtivos.forEach((app: any) => {
          if (!ocupadosMap[app.appointmentDate]) ocupadosMap[app.appointmentDate] = [];
          if (app.appointmentTime) ocupadosMap[app.appointmentDate].push(app.appointmentTime);
        });

        let stringAgendaOcupada = "";
        for (const [data, horarios] of Object.entries(ocupadosMap)) {
            stringAgendaOcupada += `- Data ${data}: Horários Ocupados -> ${horarios.join(', ')}\n`;
        }
        if (stringAgendaOcupada === "") stringAgendaOcupada = "Nenhum horário ocupado nos próximos dias. Todos os horários estão livres!";

        let dossieCliente = "Cliente Novo. Trate-o com cordialidade para fidelizá-lo e pergunte seu nome para iniciar o atendimento.";
        if (input.telefone) {
          const historicoCliente = todosAgendamentos.filter((app: any) => app.phone === input.telefone && app.status !== 'cancelado');
          if (historicoCliente.length > 0) {
            const ultimoAgendamento = historicoCliente[historicoCliente.length - 1];
            dossieCliente = `CLIENTE RECORRENTE: O nome dele é ${ultimoAgendamento.name}. O último serviço que ele fez foi '${ultimoAgendamento.services}' no dia ${ultimoAgendamento.appointmentDate}. Puxe intimidade, chame-o pelo nome, pergunte de forma natural se ele vai querer o mesmo serviço da última vez e sugira adicionar a barba ou outro serviço extra para complementar o atendimento!`;
          }
        }

        const mensagensClaude = input.history.map((msg) => ({
          role: msg.role === 'ai' ? 'assistant' : 'user',
          content: msg.text
        }));

        mensagensClaude.push({ role: 'user', content: input.message });

       const aiMessage = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 1000,

            system: `Você é a recepcionista real e humana da barbearia ${siteConfig.nomeBarbearia}, em ${siteConfig.cidade}. O seu objetivo é atender os clientes pelo chat como se fosse um WhatsApp.

PROTOCOLO OBRIGATÓRIO DE AGENDAMENTO (SIGA RIGOROSAMENTE A ORDEM):
1. NUNCA realize um agendamento ou acione a ferramenta sem antes perguntar QUAL BARBEIRO o cliente deseja.
2. Os profissionais ativos da ${siteConfig.nomeBarbearia} são: ${siteConfig.profissionais.join(", ")}. Se o cliente não souber, apresente essas opções.
3. REGRA DE CONFLITO: Se o horário solicitado estiver na LISTA DE HORÁRIOS OCUPADOS para o barbeiro escolhido, você NUNCA deve dizer apenas que a barbearia está lotada. Você é OBRIGADA a oferecer duas alternativas:
   - Pergunte se ele aceita ver o próximo horário livre do mesmo barbeiro.
   - Pergunte se ele aceita manter o horário, mas fazer com outro barbeiro livre.
${formatarServicosEspeciais()}
${siteConfig.negarDescontos ? `POLÍTICA DE DESCONTOS (REGRA ABSOLUTA):\nSe qualquer cliente pedir desconto em cortes de cabelo, barba ou outros serviços, NEGUE IMEDIATAMENTE. Diga educadamente que não é possível dar descontos.\n` : ""}
CONTEXTO TEMPORAL:
- Hoje é ${diaSemana}, dia ${dataHoje} (Formato para o banco de dados: ${dataIso}). A hora atual do sistema é ${horaAtual}.

CONTEXTO DO CLIENTE (MEMÓRIA ATIVA):
- Telefone no sistema: ${input.telefone || "Não informado"}.
- Histórico do banco de dados: ${dossieCliente}

REGRAS DE OURO DA CONVERSA:
1. NUNCA pergunte o telefone do cliente, você já tem o número dele no sistema.
2. NUNCA ofereça dias ou horários de forma genérica. Aja naturalmente, pergunte qual dia fica melhor para ele e só então verifique a agenda.
3. Se o cliente pedir um dia/horário que já está na LISTA DE HORÁRIOS OCUPADOS abaixo, RECUSE O AGENDAMENTO informando que o horário acabou de ser reservado e aplique a REGRA DE CONFLITO.

BASE DE CONHECIMENTO (Agenda e Disponibilidade):
- Horário de funcionamento: ${siteConfig.horarioFuncionamento}.
- LISTA DE HORÁRIOS OCUPADOS (Não agende nestes):
${stringAgendaOcupada}

REGRAS ABSOLUTAS GERAIS:
1. NUNCA use formatação de texto (asteriscos, negrito).
2. Responda com frases curtas e diretas.
3. Jamais diga que é uma inteligência artificial.
4. Confirme sempre: nome, dia, hora, barbeiro e serviço. (Não confirme o telefone no chat).
5. REGRA DE DATA (OBRIGATÓRIA): você pode errar contas de "daqui a X dias" ao
   calcular dias da semana. Por isso, toda vez que mencionar uma data — e
   OBRIGATORIAMENTE na mensagem final de confirmação antes de acionar a
   ferramenta — você DEVE escrever a data no formato numérico DD/MM/AAAA
   (ex: 24/07/2026), além do dia da semana se quiser (ex: "Sexta-feira,
   24/07/2026"). Nunca confirme ou acione a ferramenta usando só o dia da
   semana ("sexta que vem") sem também repetir a data numérica completa —
   isso permite ao cliente perceber e corrigir na hora se você calculou o
   dia da semana errado.
6. REGRA DE CONFIRMAÇÃO DE AGENDAMENTO (ABSOLUTA E INEGOCIÁVEL): você NUNCA
   pode dizer que um agendamento foi feito, confirmado, salvo, guardado,
   marcado, reservado ou concluído com sucesso a menos que, NESTE EXATO
   TURNO, você esteja de fato acionando a ferramenta 'agendar_horario'.
   Palavras como "confirmado", "agendado", "reservado" ou "sucesso" só podem
   aparecer na sua resposta se a ferramenta for chamada junto, no mesmo
   turno — nunca como promessa, suposição ou resumo do que "já foi feito"
   antes. Se por qualquer motivo você não for acionar a ferramenta agora
   (ainda falta alguma informação, quer confirmar mais um detalhe, etc.),
   diga claramente que o agendamento AINDA NÃO foi salvo e o que falta para
   concluir — nunca dê a entender que já está pronto sem ter chamado a
   ferramenta. Um cliente que acredita ter um horário marcado quando na
   verdade nada foi salvo é o pior erro possível neste atendimento.
7. REGRA DE CANCELAMENTO/REMARCAÇÃO (ABSOLUTA): você NÃO tem nenhuma
   ferramenta para cancelar ou remarcar um agendamento já existente — só pode
   CRIAR agendamentos novos com 'agendar_horario'. Se o cliente pedir para
   cancelar, desmarcar ou remarcar (mudar data/hora de) um horário já
   marcado, NUNCA tente fazer isso pelo chat nem finja que fez. Oriente-o a
   entrar em contato diretamente pelo WhatsApp da barbearia, ${siteConfig.telefoneExibicao}
   (link: https://wa.me/${siteConfig.whatsappNumero}), para que a equipe
   cancele ou remarque manualmente.

BASE DE CONHECIMENTO (Preços e Serviços):
${formatarListaServicos()}

INSTRUÇÃO DA FERRAMENTA:
Ao acionar a ferramenta 'agendar_horario', calcule o valor total e envie no campo 'totalPrice' (apenas números). Formate a data EXATAMENTE no padrão internacional YYYY-MM-DD. Não é preciso informar o telefone do cliente na ferramenta — o sistema já usa o telefone da sessão automaticamente.`,
          messages: mensagensClaude,
          
          tools: [
            {
              name: "agendar_horario",
              description: "Guarda um novo agendamento na base de dados.",
              input_schema: {
                type: "object",
                properties: {
                  name: { type: "string", description: "O nome do cliente" },
                  date: { type: "string", description: "A data no formato YYYY-MM-DD (ex: 2026-05-18)" },
                  time: { type: "string", description: "A hora do agendamento (ex: 15:00)" },
                  service: { type: "string", description: "O serviço escolhido" },
                  professional: { type: "string", description: `O barbeiro escolhido (${siteConfig.profissionais.join(", ")})` },
                  totalPrice: { type: "string", description: "O preço total calculado. Ex: 60" }
                },
                required: ["name", "date", "time", "service", "professional", "totalPrice"]
              }
            }
          ]
        });

        if (aiMessage.stop_reason === 'tool_use') {
          const toolCall = aiMessage.content.find(c => c.type === 'tool_use');
          
          if (toolCall && toolCall.name === 'agendar_horario') {
            const dadosAgendamento = toolCall.input as any;

            // Telefone vem direto da sessão (input.telefone), não da tool call — o
            // campo agora é opcional no gate do ChatWidget, e confiar no valor já
            // validado pelo servidor evita que o modelo tenha que "inventar" uma
            // string vazia num campo de ferramenta.
            const telefoneSessao = input.telefone || "";

            // --- INÍCIO DA TRAVA DE SEGURANÇA DA IA ---
            const checagemAgendamentos = await getAppointments();
            const horarioJaOcupado = checagemAgendamentos.find((app: any) => 
              app.appointmentDate === dadosAgendamento.date && 
              app.appointmentTime === dadosAgendamento.time && 
              app.professional === dadosAgendamento.professional && 
              app.status !== 'cancelado'
            );

            if (horarioJaOcupado) {
               return { reply: `Poxa, ${dadosAgendamento.name}! Infelizmente o ${dadosAgendamento.professional} acabou de ser reservado nesse exato horário das ${dadosAgendamento.time} no dia ${dadosAgendamento.date}. Para não te deixar na mão, você prefere ver o próximo horário dele ou quer que eu te encaixe agora mesmo com outro barbeiro livre?` };
            }
            // --- FIM DA TRAVA ---

            // 1. Salva no banco de dados (Postgres via Drizzle)
            await createAppointment({
              name: dadosAgendamento.name,
              email: input.email || "Agendado via IA",
              phone: telefoneSessao,
              services: dadosAgendamento.service,
              totalPrice: dadosAgendamento.totalPrice,
              appointmentDate: dadosAgendamento.date,
              appointmentTime: dadosAgendamento.time,
              message: "Agendado via Agente de IA",
              professional: dadosAgendamento.professional, // CORREÇÃO: Variável dinâmica injetada aqui
            });

            // 2. Dispara o Webhook do Make.com
            const webhookUrl = process.env.VITE_WEBHOOK_URL;
            if (webhookUrl) {
              try {
                await fetch(webhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: dadosAgendamento.name,
                    phone: telefoneSessao,
                    email: input.email || "email@naoinformado.com",
                    service: dadosAgendamento.service,
                    date: dadosAgendamento.date,
                    time: dadosAgendamento.time,
                    professional: dadosAgendamento.professional, // CORREÇÃO: Variável dinâmica injetada aqui
                    message: "Agendado pelo Chatbot de IA"
                  })
                });
                console.log("Webhook disparado com sucesso pela IA!");
              } catch (erroWebhook) {
                console.error("Falha ao disparar o webhook do Make:", erroWebhook);
              }
            }

            return {
              reply: `Feito, ${dadosAgendamento.name}! Acabei de guardar o seu agendamento no nosso sistema oficial.`,
              confirmation: {
                name: dadosAgendamento.name,
                service: dadosAgendamento.service,
                professional: dadosAgendamento.professional,
                date: dadosAgendamento.date,
                time: dadosAgendamento.time,
                totalPrice: dadosAgendamento.totalPrice,
              },
            };
          }
        }

        const textResponse = aiMessage.content.find(c => c.type === 'text');
        const respostaTexto = textResponse ? (textResponse as any).text : '';

        // Detector de "agendamento fantasma": chegamos aqui só quando a tool
        // 'agendar_horario' NÃO foi acionada neste turno (o branch acima já
        // teria retornado). Se mesmo assim o texto da IA soa como confirmação
        // de sucesso, nada foi de fato salvo no Postgres nem disparado pro
        // webhook — o cliente pode achar que agendou e a barbearia nunca
        // saber. Só loga (não bloqueia nem tenta corrigir a resposta) pra
        // ficar visível em testes e permitir medir a frequência real.
        const PALAVRAS_SUCESSO_AGENDAMENTO = /\b(confirmad[oa]|agendad[oa]|reservad[oa]|marcad[oa]|com sucesso|guardei (?:o |seu )*agendamento|anotei (?:o |seu )*agendamento)\b/i;
        if (respostaTexto && PALAVRAS_SUCESSO_AGENDAMENTO.test(respostaTexto)) {
          console.warn(`⚠️  POSSÍVEL AGENDAMENTO FANTASMA detectado: a IA respondeu com texto que soa como confirmação de sucesso, mas a tool 'agendar_horario' NÃO foi acionada neste turno (nada foi salvo no Postgres). Resposta da IA: "${respostaTexto}"`);
          registrarAgendamentoFantasma(respostaTexto);
        }

        return { reply: respostaTexto || 'Desculpa, não consegui processar a resposta.' };
        
      } catch (error) {
        console.error("Erro na API do Anthropic:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro interno ao contatar a IA."
        });
      }
    }),
  // ROTA DE AUTENTICAÇÃO
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      const authHeader = ctx?.req?.headers?.authorization?.trim() || '';
      const token = authHeader.replace('Bearer ', '').trim();
      if (token === 'acesso_libertado') return { role: 'admin' };
      return null; 
    }),

    logout: protectedProcedure.mutation(() => {
      return { success: true };
    }),

    login: publicProcedure
      .input(z.object({ password: z.string() }))
      .mutation(({ input }) => {
        const senhaMestra = process.env.ADMIN_PASSWORD?.trim();
        const senhaDigitada = input.password.trim();

        if (!senhaMestra) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "FALHA: A variável ADMIN_PASSWORD não foi carregada pelo .env"
          });
        }

        if (senhaDigitada !== senhaMestra) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Senha incorreta. Tente novamente."
          });
        }
        
        return { success: true };
      }),
  }),

  // ROTA DE AGENDAMENTOS
  appointments: router({
    getAvailableTimes: publicProcedure
      .input(z.object({ date: z.string(), professional: z.string(), excludeId: z.number().optional() }))
      .query(async ({ input }) => {
        const todosAgendamentos = await getAppointments();
        const horariosOcupados = todosAgendamentos
          .filter((app: any) =>
            app.appointmentDate === input.date &&
            app.professional === input.professional &&
            app.status !== 'cancelado' &&
            app.id !== input.excludeId // exclui o próprio agendamento ao remarcar, senão ele "ocupa" o próprio horário antigo
          )
          .map((app: any) => app.appointmentTime);

        const todosHorarios = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"];
        return todosHorarios.map(horario => ({ time: horario, available: !horariosOcupados.includes(horario) }));
      }),

    create: publicProcedure
      .input(z.any()) 
      .mutation(async ({ input }) => {
        // CORREÇÃO: Mapeando as variáveis corretas enviadas pelo front-end (date e time)
        const dataAgendamento = input?.date || input?.appointmentDate;
        const horaAgendamento = input?.time || input?.appointmentTime;
        const profissionalEscolhido = input?.professional || "Qualquer profissional";

        const todosAgendamentos = await getAppointments();
        const horarioOcupado = todosAgendamentos.find((app: any) => 
          app.appointmentDate === dataAgendamento && 
          app.appointmentTime === horaAgendamento && 
          app.professional === profissionalEscolhido && 
          app.status !== 'cancelado'
        );

        if (horarioOcupado) {
          throw new TRPCError({ code: 'CONFLICT', message: 'CONFLITO: Este horário acabou de ser reservado.' });
        }

        const telefoneLimpo = input?.phone ? String(input.phone).replace(/\D/g, '') : "Sem telefone";
        
        // Padronização para o AdminDashboard (igual à IA)
        const servicosBase = Array.isArray(input?.services) ? input.services.join(", ") : (input?.services || "Serviço Padrão");
        const servicosFormatados = servicosBase.includes("(com ") ? servicosBase : `${servicosBase} (com ${profissionalEscolhido})`;

        // 1. Salva o agendamento no banco de dados (Postgres via Drizzle) primeiro
        const novoAgendamento = await createAppointment({
          name: input?.name || "Cliente sem nome",
          email: input?.email || "",
          phone: telefoneLimpo,
          services: servicosFormatados,
          totalPrice: String(input?.totalPrice || "0"),
          appointmentDate: dataAgendamento || "Data não informada",
          appointmentTime: horaAgendamento || "Hora não informada",
          message: input?.message || null,
          professional: profissionalEscolhido,
        });

        // 2. Dispara os dados para o Webhook do Make.com instantaneamente!
        const webhookUrl = process.env.VITE_WEBHOOK_URL;
        if (webhookUrl) {
          try {
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: input?.name || "Cliente sem nome",
                phone: telefoneLimpo,
                email: input?.email || "",
                // Nome do serviço "cru" (sem o profissional embutido no texto),
                // igual ao formato do webhook disparado pelo fluxo da IA —
                // o profissional já vai no campo `professional` abaixo.
                service: servicosBase,
                date: dataAgendamento || "Data não informada",
                time: horaAgendamento || "Hora não informada",
                professional: profissionalEscolhido,
                message: "Agendado via Site Principal"
              })
            });
            console.log("Webhook do Site disparado com sucesso!");
          } catch (erroWebhook) {
            console.error("Falha ao disparar o webhook do Make pelo Site:", erroWebhook);
          }
        }

        return novoAgendamento;
      }),
    
    reschedule: publicProcedure
      .input(z.object({ id: z.number(), appointmentDate: z.string(), appointmentTime: z.string() }))
      .mutation(async ({ input }) => {
        const todosAgendamentos = await getAppointments();
        const agendamentoAtual = todosAgendamentos.find((app: any) => app.id === input.id);
        if (!agendamentoAtual) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Agendamento não encontrado.' });
        }

        // Mesma validação de conflito usada pela IA e pelo formulário do site:
        // não permitir remarcar para um horário já ocupado do mesmo profissional.
        const horarioJaOcupado = todosAgendamentos.find((app: any) =>
          app.id !== input.id &&
          app.appointmentDate === input.appointmentDate &&
          app.appointmentTime === input.appointmentTime &&
          app.professional === agendamentoAtual.professional &&
          app.status !== 'cancelado'
        );

        if (horarioJaOcupado) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Este horário já está ocupado para este profissional.' });
        }

        return await updateAppointmentDateTime(input.id, input.appointmentDate, input.appointmentTime);
      }),

    list: publicProcedure.query(async () => await getAppointments()),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => await deleteAppointment(input.id)),
    updateStatus: publicProcedure.input(z.object({ id: z.number(), status: z.enum(['pendente', 'confirmado', 'concluido', 'cancelado']) })).mutation(async ({ input }) => await updateAppointmentStatus(input.id, input.status)),
    atualizarServicos: publicProcedure.input(z.object({ id: z.number(), novosServicos: z.string(), novoPreco: z.string() })).mutation(async ({ input }) => await updateAppointmentServices(input.id, input.novosServicos, input.novoPreco)),
  }),
});

export type AppRouter = typeof appRouter;