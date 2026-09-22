import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

// Admin real deste app é validado por Bearer token (ver _core/trpc.ts,
// ADMIN_TOKEN), não por sessão de usuário — "user" fica sempre null aqui.
// O tipo é montado diretamente em app.ts (createContext do Express
// middleware); este arquivo só existe pra centralizar o tipo TrpcContext.
export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};
