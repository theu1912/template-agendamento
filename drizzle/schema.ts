import { pgTable, serial, varchar, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";

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
