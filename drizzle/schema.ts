import { pgTable, serial, varchar, text, timestamp, numeric, pgEnum, boolean } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pendente",
  "confirmado",
  "concluido",
  "cancelado",
]);

/**
 * Tabela de usuários, herdada do template original (scaffold de auth por
 * OAuth). Nenhum código deste app a usa hoje — auth real é via ADMIN_TOKEN
 * (ver server/_core/trpc.ts). Mantida sem alteração estrutural: existe de
 * verdade no Postgres em produção e não deve ser removida sem confirmação
 * explícita (decisão registrada no log do projeto).
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Identificador externo único por usuário (herdado do fluxo de OAuth original). */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de agendamentos da barbearia
 */
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  services: text("services").notNull(),
  totalPrice: numeric("totalPrice", { precision: 10, scale: 2 }).notNull(),
  appointmentDate: varchar("appointmentDate", { length: 10 }).notNull(),
  appointmentTime: varchar("appointmentTime", { length: 5 }).notNull(),
  professional: varchar("professional", { length: 255 }),
  status: appointmentStatusEnum("status").default("pendente").notNull(),
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Dados operacionais (profissionais, serviços/preços, despesas fixas).
 * Antes viviam só no localStorage do navegador do dono (AdminDashboard.tsx) —
 * migrados pra cá porque não sincronizavam entre dispositivos nem chegavam ao
 * prompt do chatbot. client/src/config/site.ts (profissionais/servicos)
 * agora serve só de semente inicial, usada uma única vez quando estas tabelas
 * estão vazias (ver server/db.ts, seedDadosOperacionaisSeVazio) — depois
 * disso o banco é a fonte da verdade, gerenciado pelo painel.
 */
export const professionals = pgTable("professionals", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  comissao: numeric("comissao", { precision: 5, scale: 2 }).notNull().default("50"),
  especialidade: varchar("especialidade", { length: 255 }),
  // "Remover" no painel apenas desativa (nunca apaga a linha) — agendamentos
  // antigos guardam o nome do profissional como texto solto, não como FK,
  // então isso é só pra sumir da lista ativa sem perder histórico.
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Professional = typeof professionals.$inferSelect;
export type InsertProfessional = typeof professionals.$inferInsert;

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  preco: numeric("preco", { precision: 10, scale: 2 }).notNull(),
  // Mesmo raciocínio de professionals.ativo acima.
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  // Data de expiração opcional, formato "YYYY-MM-DD" (mesmo padrão de
  // appointments.appointmentDate) — null quando a despesa não expira.
  expiraEm: varchar("expiraEm", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;
