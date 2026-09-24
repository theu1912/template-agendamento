CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"descricao" varchar(255) NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"expiraEm" varchar(10),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professionals" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"comissao" numeric(5, 2) DEFAULT '50' NOT NULL,
	"especialidade" varchar(255),
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"preco" numeric(10, 2) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
