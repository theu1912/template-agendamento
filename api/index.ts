// Entry point de função serverless do Vercel. Reaproveita o mesmo app Express
// (com o middleware tRPC em /api/trpc) usado localmente por
// server/_core/index.ts — só que aqui sem abrir uma porta própria: o
// runtime Node da Vercel invoca este app diretamente a cada request.
//
// vercel.json reescreve qualquer /api/* para esta função, preservando o
// caminho original (necessário para o Express casar a rota /api/trpc/*).
import { app } from "../server/_core/app";

export default app;
