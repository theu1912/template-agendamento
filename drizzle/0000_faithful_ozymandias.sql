CREATE TYPE "public"."appointment_status" AS ENUM('pendente', 'confirmado', 'concluido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"services" text NOT NULL,
	"totalPrice" numeric(10, 2) NOT NULL,
	"appointmentDate" varchar(10) NOT NULL,
	"appointmentTime" varchar(5) NOT NULL,
	"professional" varchar(255),
	"status" "appointment_status" DEFAULT 'pendente' NOT NULL,
	"message" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
