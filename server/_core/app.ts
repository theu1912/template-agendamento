// @ts-nocheck
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";

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

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}), // Ignora cookies de sessão para agendamento público
  })
);
