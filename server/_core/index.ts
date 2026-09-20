// @ts-nocheck
import "dotenv/config";
import { createServer } from "http";
import { app } from "./app";

async function startServer() {
  const server = createServer(app);

  const PORT = process.env.PORT || 3333;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Motor da Barbearia rodando na porta ${PORT}`);
  });
}

startServer().catch(console.error);
