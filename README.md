# Template de Agendamento com IA

Site de agendamento online com um chatbot que conversa com o cliente e marca o horário sozinho.
Foi feito para negócios que trabalham com hora marcada, e **este repositório está configurado como
exemplo para uma barbearia**: serviços, preços, profissionais e horários de funcionamento de uma
barbearia fictícia.

## O que ele faz

- **Chat com IA que agenda de verdade.** O cliente escreve como escreveria no WhatsApp
  ("sexta de manhã dá?"). O modelo da Anthropic consulta os horários livres e, quando o cliente
  confirma, chama a ferramenta `agendar_horario`, que grava o agendamento no banco. O
  agendamento só existe quando a ferramenta é chamada, e o servidor registra um alerta se a IA
  disser que confirmou sem ter chamado a ferramenta.
- **Sem horário duplicado.** Antes de gravar, o servidor verifica se o horário daquele
  profissional já está ocupado.
- **Formulário tradicional** para quem prefere agendar sem o chat.
- **Painel administrativo** com a agenda da semana, filtro por profissional e por status, e
  gestão de cada atendimento.
- **Notificação por e-mail** a cada novo agendamento, para o cliente e para o estabelecimento,
  via webhook para o Make.com.
- **Configuração central.** Nome, cores, serviços, preços, profissionais e horários ficam em dois
  arquivos. Trocar a barbearia por um salão ou uma clínica não exige mexer nos componentes.

## Stack

| Camada     | Tecnologias                                              |
|------------|----------------------------------------------------------|
| Front-end  | React 19, TypeScript, Vite, Tailwind CSS, GSAP           |
| Back-end   | Node.js, Express, tRPC                                   |
| Banco      | PostgreSQL com Drizzle ORM                               |
| IA         | API da Anthropic (Claude), com uso de ferramentas        |

## Rodando localmente

Precisa de Node.js 20 ou mais novo, pnpm e um banco PostgreSQL (Neon, Supabase ou local).

```bash
git clone https://github.com/theu1912/template-agendamento.git
cd template-agendamento
pnpm install

cp .env.example .env    # preencha com os seus valores
pnpm db:push            # cria as tabelas no banco

pnpm server             # API em http://localhost:3333
pnpm dev                # site em http://localhost:5173 (em outro terminal)
```

Em desenvolvimento, o Vite encaminha as chamadas de `/api/trpc` para o servidor na porta 3333,
então o front sempre usa a mesma URL relativa.

### Variáveis de ambiente

| Variável            | Para que serve                                                   |
|---------------------|------------------------------------------------------------------|
| `DATABASE_URL`      | Connection string do PostgreSQL                                  |
| `ANTHROPIC_API_KEY` | Chave da API usada pelo chatbot (lida só no servidor)            |
| `ADMIN_PASSWORD`    | Senha de acesso ao painel `/admin`                               |
| `ADMIN_TOKEN`       | Token das rotas administrativas (gere um valor aleatório novo)   |
| `SENHA_GERENTE`     | Senha da área do gerente (faturamento e despesas), validada só no servidor |
| `VITE_WEBHOOK_URL`  | Webhook do Make.com para as notificações (opcional)              |

O arquivo `.env` nunca vai para o repositório. Use o `.env.example` como modelo.

## Onde fica cada coisa

```
client/src/config/site.ts   dados do negócio usados no site
server/config/site.ts       dados do negócio usados no servidor e nas instruções da IA
server/routers.ts           rotas tRPC, incluindo o chat com IA e a ferramenta de agendamento
server/db.ts                acesso ao banco
drizzle/schema.ts           tabelas
client/src/pages/           site público (Home) e painel (AdminDashboard)
```

## Adaptando para outro negócio

1. Edite `client/src/config/site.ts` e `server/config/site.ts` com nome, cores, serviços,
   preços, profissionais e horários.
2. Ajuste as instruções da IA em `server/routers.ts`, se o tipo de atendimento for diferente
   (por exemplo, consultas em vez de cortes).
3. Rode o projeto e faça um agendamento de teste pelo chat e outro pelo formulário.

## Autor

Matheus Machado Komninou · [portfólio](https://theu1912.github.io/portfolio/) · theu.mmk@gmail.com
