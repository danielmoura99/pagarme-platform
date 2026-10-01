// lib/db.ts
import { PrismaClient } from "@prisma/client";
import { observeOperation } from "./monitoring/context";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const client = new PrismaClient();
  client.$use((params, next) => observeOperation(params.model, params.action, () => next(params)));
  return client;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
