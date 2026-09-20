// @ts-nocheck
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./trpc";

async function startServer() {
    const app = express();
    const server = createServer(app);

    app.use((req, res, next) => {
       res.header("Access-Control-Allow-Origin", "http://localhost:5173");
       res.header("Access-Control-Allow-Credentials", "true");
       res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
       res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, authorization");

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
        createContext,
      })
    );

    const port = process.env.PORT || 3333;
    server.listen(port, () => {
      console.log(`🚀 Motor da Barbearia rodando na porta ${port}`);
    });
}
startServer().catch(console.error);