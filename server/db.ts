import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { desc, eq } from "drizzle-orm";
import {
  appointments,
  professionals,
  services,
  expenses,
  type InsertAppointment,
  type InsertProfessional,
  type InsertService,
  type InsertExpense,
} from "../drizzle/schema";
// Fonte da semente inicial de profissionais/serviços (ver seedDadosOperacionaisSeVazio
// abaixo) — importado direto do arquivo do client porque é a lista completa/
// correta (client/src/config/site.ts tem 14 serviços; o server/config/site.ts
// tinha uma cópia manual defasada com só 8, um bug real encontrado ao migrar
// esses dados pro banco). É um objeto puro `as const`, sem nada de browser,
// então importa e builda normalmente no server (esbuild/tsx).
import { siteConfig as clientSiteConfig } from "../client/src/config/site";

// Conexão lazy: só abre o Pool no primeiro uso, e falha com mensagem clara
// (não silenciosa) se DATABASE_URL não estiver configurada — mesmo padrão de
// "placeholder óbvio" usado no resto do projeto (ver barbershop-template-stack.md).
let db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "FALHA: DATABASE_URL não foi carregada pelo .env. Configure a connection string do Postgres (Neon) antes de usar agendamentos."
      );
    }
    const pool = new Pool({ connectionString });
    db = drizzle(pool);
  }
  return db;
}

// 1. BUSCAR AGENDAMENTOS
export async function getAppointments() {
  return getDb().select().from(appointments).orderBy(desc(appointments.createdAt));
}

// 2. CRIAR AGENDAMENTO
export async function createAppointment(appointment: InsertAppointment) {
  const [novoAgendamento] = await getDb().insert(appointments).values(appointment).returning();
  console.log("✅ Agendamento salvo no Postgres!");
  return novoAgendamento;
}

// 3. ATUALIZAR SERVIÇOS
export async function updateAppointmentServices(id: number, services: string, totalPrice: string) {
  const [atualizado] = await getDb()
    .update(appointments)
    .set({ services, totalPrice })
    .where(eq(appointments.id, id))
    .returning();

  if (!atualizado) throw new Error("Agendamento não encontrado para atualizar");
  console.log(`✅ Serviços do agendamento ${id} atualizados!`);
  return atualizado;
}

// 3b. REMARCAR (mudar data/horário mantendo o resto do agendamento)
export async function updateAppointmentDateTime(id: number, appointmentDate: string, appointmentTime: string) {
  const [atualizado] = await getDb()
    .update(appointments)
    .set({ appointmentDate, appointmentTime })
    .where(eq(appointments.id, id))
    .returning();

  if (!atualizado) throw new Error("Agendamento não encontrado para remarcar");
  console.log(`📅 Agendamento ${id} remarcado para ${appointmentDate} ${appointmentTime}!`);
  return atualizado;
}

// 4. DELETAR
export async function deleteAppointment(id: number) {
  const deletados = await getDb().delete(appointments).where(eq(appointments.id, id)).returning();

  if (deletados.length === 0) throw new Error("Não foi possível encontrar o agendamento para deletar");
  console.log(`🗑️ Agendamento ${id} removido com sucesso!`);
  return { success: true };
}

// 5. ATUALIZAR STATUS
export async function updateAppointmentStatus(id: number, status: "pendente" | "confirmado" | "concluido" | "cancelado") {
  const [atualizado] = await getDb()
    .update(appointments)
    .set({ status })
    .where(eq(appointments.id, id))
    .returning();

  if (!atualizado) throw new Error("Agendamento não encontrado para atualizar status");
  return atualizado;
}

// ===== PROFISSIONAIS =====
// list() só retorna ativos — usado tanto pelo painel (protectedProcedure)
// quanto pela rota pública de leitura (Home, chatbot), já que "remover" no
// painel é uma desativação (ver comentário em drizzle/schema.ts).
export async function getProfessionals() {
  return getDb().select().from(professionals).where(eq(professionals.ativo, true)).orderBy(professionals.id);
}

export async function createProfessional(dados: Pick<InsertProfessional, "nome" | "comissao" | "especialidade">) {
  const [novo] = await getDb().insert(professionals).values(dados).returning();
  return novo;
}

export async function updateProfessional(id: number, dados: Partial<Pick<InsertProfessional, "nome" | "comissao" | "especialidade">>) {
  const [atualizado] = await getDb().update(professionals).set(dados).where(eq(professionals.id, id)).returning();
  if (!atualizado) throw new Error("Profissional não encontrado para atualizar");
  return atualizado;
}

export async function deactivateProfessional(id: number) {
  const [atualizado] = await getDb().update(professionals).set({ ativo: false }).where(eq(professionals.id, id)).returning();
  if (!atualizado) throw new Error("Profissional não encontrado para remover");
  return { success: true };
}

// ===== SERVIÇOS =====
export async function getServices() {
  return getDb().select().from(services).where(eq(services.ativo, true)).orderBy(services.id);
}

export async function createService(dados: Pick<InsertService, "nome" | "preco">) {
  const [novo] = await getDb().insert(services).values(dados).returning();
  return novo;
}

export async function updateService(id: number, dados: Partial<Pick<InsertService, "nome" | "preco">>) {
  const [atualizado] = await getDb().update(services).set(dados).where(eq(services.id, id)).returning();
  if (!atualizado) throw new Error("Serviço não encontrado para atualizar");
  return atualizado;
}

export async function deactivateService(id: number) {
  const [atualizado] = await getDb().update(services).set({ ativo: false }).where(eq(services.id, id)).returning();
  if (!atualizado) throw new Error("Serviço não encontrado para remover");
  return { success: true };
}

// ===== DESPESAS =====
// Sem coluna `ativo` (ver drizzle/schema.ts) — "remover" aqui é exclusão real,
// mesmo comportamento que o array em localStorage já tinha.
export async function getExpenses() {
  return getDb().select().from(expenses).orderBy(expenses.id);
}

export async function createExpense(dados: Pick<InsertExpense, "descricao" | "valor" | "expiraEm">) {
  const [nova] = await getDb().insert(expenses).values(dados).returning();
  return nova;
}

export async function deleteExpense(id: number) {
  const deletadas = await getDb().delete(expenses).where(eq(expenses.id, id)).returning();
  if (deletadas.length === 0) throw new Error("Despesa não encontrada para remover");
  return { success: true };
}

// ===== SEMENTE INICIAL =====
// Roda no boot do servidor (ver server/_core/app.ts). Só insere quando a
// tabela está vazia — nunca sobrescreve dado já existente. Numa instalação
// nova (banco recém-criado), popula profissionais/serviços a partir do
// client/src/config/site.ts e despesas com os 3 valores que antes eram
// hardcoded em AdminDashboard.tsx.
export async function seedDadosOperacionaisSeVazio() {
  const db = getDb();

  const profissionaisExistentes = await db.select().from(professionals).limit(1);
  if (profissionaisExistentes.length === 0) {
    await db.insert(professionals).values(
      clientSiteConfig.profissionais.map((p) => ({
        nome: p.nome,
        comissao: String(p.comissao),
      }))
    );
    console.log("🌱 Tabela 'professionals' semeada a partir de client/src/config/site.ts");
  }

  const servicosExistentes = await db.select().from(services).limit(1);
  if (servicosExistentes.length === 0) {
    await db.insert(services).values(
      clientSiteConfig.servicos.map((s) => ({
        nome: s.nome,
        preco: String(s.preco),
      }))
    );
    console.log("🌱 Tabela 'services' semeada a partir de client/src/config/site.ts");
  }

  const gastosExistentes = await db.select().from(expenses).limit(1);
  if (gastosExistentes.length === 0) {
    await db.insert(expenses).values([
      { descricao: "Aluguel do Espaço", valor: "1500" },
      { descricao: "Luz e Água", valor: "350" },
      { descricao: "Produtos e Lâminas", valor: "200" },
    ]);
    console.log("🌱 Tabela 'expenses' semeada com os valores padrão");
  }
}
