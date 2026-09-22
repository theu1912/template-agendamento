import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ADMIN_TOKEN_TESTE = "token-de-teste-para-vitest";

function criarContexto(authorizationHeader?: string): TrpcContext {
  return {
    req: {
      headers: authorizationHeader ? { authorization: authorizationHeader } : {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user: null,
  };
}

describe("auth.logout", () => {
  it("retorna sucesso quando o Bearer token bate com ADMIN_TOKEN", async () => {
    process.env.ADMIN_TOKEN = ADMIN_TOKEN_TESTE;

    const ctx = criarContexto(`Bearer ${ADMIN_TOKEN_TESTE}`);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
  });

  it("rejeita com UNAUTHORIZED quando o token está errado", async () => {
    process.env.ADMIN_TOKEN = ADMIN_TOKEN_TESTE;

    const ctx = criarContexto("Bearer token-invalido");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.logout()).rejects.toThrow("Acesso negado.");
  });

  it("rejeita quando ADMIN_TOKEN não está configurado no servidor (fail-closed)", async () => {
    delete process.env.ADMIN_TOKEN;

    const ctx = criarContexto(`Bearer ${ADMIN_TOKEN_TESTE}`);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.logout()).rejects.toThrow("Acesso negado.");

    process.env.ADMIN_TOKEN = ADMIN_TOKEN_TESTE;
  });
});
