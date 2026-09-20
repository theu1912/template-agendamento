import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { desc, eq } from "drizzle-orm";
import { appointments, type InsertAppointment } from "../drizzle/schema";

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
