import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  const authHeader = ctx.req?.headers?.authorization?.trim() || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (token !== "acesso_libertado") {
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