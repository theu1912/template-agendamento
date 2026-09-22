import { initTRPC, TRPCError } from "@trpc/server";
import crypto from "crypto";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Comparação em tempo constante contra o ADMIN_TOKEN real do .env — nunca
// comparar token de admin com !== direto (vaza timing) nem aceitar sem a
// env var definida (fail-closed: sem ADMIN_TOKEN, nenhuma rota protegida libera).
export function tokenAdminValido(tokenRecebido: string): boolean {
  const tokenEsperado = process.env.ADMIN_TOKEN;
  if (!tokenEsperado) return false;

  const bufRecebido = Buffer.from(tokenRecebido);
  const bufEsperado = Buffer.from(tokenEsperado);
  if (bufRecebido.length !== bufEsperado.length) return false;

  return crypto.timingSafeEqual(bufRecebido, bufEsperado);
}

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  const authHeader = ctx.req?.headers?.authorization?.trim() || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!tokenAdminValido(token)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Acesso negado.",
    });
  }

  return next({
    ctx: { ...ctx, user: { role: "admin" } },
  });
});

export const adminProcedure = protectedProcedure;