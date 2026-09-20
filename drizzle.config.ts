import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  // O asterisco (**) faz o Drizzle procurar o schema em todas as subpastas
  // Isso resolve o erro de "No schema files found"
  schema: "./**/schema.ts", 
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});