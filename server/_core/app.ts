// @ts-nocheck
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { seedDadosOperacionaisSeVazio } from "../db";

// Roda no carregamento do módulo — cobre tanto o servidor tradicional
// (server/_core/index.ts) quanto a função serverless da Vercel (api/index.ts,
// que só importa este `app`, nunca chama startServer()). Idempotente (só
// insere se a tabela estiver vazia) e não bloqueia a subida do servidor —
// falha nunca derruba o processo.
//
// Tenta mais de uma vez de propósito: o Postgres serverless (Neon) hiberna
// quando fica ocioso, e a conexão aqui é preguiçosa — a primeira consulta sai
// junto com o boot e pode falhar enquanto o banco ainda está acordando. Numa
// instalação nova isso significaria tabelas vazias sem ninguém perceber: o
// painel sem serviços e o chatbot sem tabela de preços para informar. Loga a
// causa real (erro.cause), porque o Drizzle embrulha o erro do Postgres numa
// mensagem genérica de "Failed query" que não diz o que de fato aconteceu.
async function semearComRetentativa(tentativas = 3, esperaMs = 3000) {
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      await seedDadosOperacionaisSeVazio();
      return;
    } catch (erro: any) {
      const causa = erro?.cause?.message || erro?.message || String(erro);
      if (tentativa === tentativas) {
        console.error(`⚠️ Falha ao semear dados operacionais após ${tentativas} tentativas:`, causa);
        return;
      }
      console.warn(`↻ Semente falhou (tentativa ${tentativa}/${tentativas}), nova tentativa em ${esperaMs / 1000}s:`, causa);
      await new Promise((resolver) => setTimeout(resolver, esperaMs));
    }
  }
}

semearComRetentativa();

// App Express puro (sem .listen()) — reaproveitado tanto pelo servidor
// tradicional (server/_core/index.ts, usado em npm run server / dev local)
// quanto pela função serverless do Vercel (api/index.ts).
export const app = express();

// LIBERAÇÃO DE CONEXÃO (CORS)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Aceita qualquer origem
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  // O SEGREDO ESTÁ AQUI: Se for o "voo de reconhecimento" (preflight), responda OK na hora e pare.
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

app.use(express.json());

// trust proxy: necessário pra req.ip refletir o IP real do visitante atrás
// de um proxy (Vercel, etc.) em vez do IP interno do proxy — usado pelo
// rate limit do chat em routers.ts.
app.set("trust proxy", true);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    // Passa req/res reais pro contexto (necessário para o protectedProcedure
    // ler o header Authorization) — antes retornava {} e descartava a
    // request inteira, o que fazia toda rota protegida rejeitar sempre,
    // mesmo com o token correto.
    createContext: ({ req, res }) => ({ req, res, user: null }),
  })
);
