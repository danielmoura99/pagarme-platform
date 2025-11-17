// app/api/auth/[...nextauth]/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { compare } from "bcrypt";
import crypto from "crypto";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user?.password) {
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Criar sessão no banco de dados
        const sessionToken = crypto.randomBytes(32).toString("hex");
        const ipAddress = req?.headers?.["x-forwarded-for"] || req?.headers?.["x-real-ip"] || "unknown";
        const userAgent = req?.headers?.["user-agent"] || "unknown";

        await prisma.userSession.create({
          data: {
            userId: user.id,
            sessionToken,
            ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
            userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
          },
        });

        return {
          ...user,
          sessionToken,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.passwordUpdatedAt = user.updatedAt?.getTime();
        token.sessionToken = (user as any).sessionToken;
        token.loginTime = Date.now(); // Timestamp do login
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;

        // VALIDAÇÃO 1: Verificar se o login tem mais de 2 minutos (2 * 60 * 1000 = 120000ms)
        const SESSION_MAX_AGE = 2 * 60 * 1000; // 2 minutos
        if (token.loginTime && (Date.now() - (token.loginTime as number)) > SESSION_MAX_AGE) {
          // Deletar sessão do banco se existir
          if (token.sessionToken) {
            await prisma.userSession.deleteMany({
              where: { sessionToken: token.sessionToken as string },
            });
          }
          throw new Error("Session expired - please login again");
        }

        // VALIDAÇÃO 2: Validar se a sessão existe no banco de dados
        if (token.sessionToken) {
          const dbSession = await prisma.userSession.findUnique({
            where: { sessionToken: token.sessionToken as string },
          });

          // Se a sessão não existe mais no banco, invalida
          if (!dbSession) {
            throw new Error("Session expired - logged out");
          }

          // Se a sessão expirou, invalida
          if (dbSession.expiresAt < new Date()) {
            await prisma.userSession.delete({
              where: { id: dbSession.id },
            });
            throw new Error("Session expired");
          }

          // Atualizar lastActiveAt
          await prisma.userSession.update({
            where: { id: dbSession.id },
            data: { lastActiveAt: new Date() },
          });
        } else {
          // VALIDAÇÃO 3: Se não tem sessionToken no banco, é uma sessão antiga - INVALIDA
          throw new Error("Session invalid - please login again");
        }

        // VALIDAÇÃO 4: Validar se a senha foi alterada após o login
        if (token.passwordUpdatedAt) {
          const user = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { updatedAt: true },
          });

          // Se a senha foi alterada após o token ser criado, invalida a sessão
          if (user && user.updatedAt.getTime() > (token.passwordUpdatedAt as number)) {
            // Deletar a sessão do banco
            if (token.sessionToken) {
              await prisma.userSession.deleteMany({
                where: {
                  userId: token.id as string,
                  sessionToken: token.sessionToken as string,
                },
              });
            }
            throw new Error("Session expired - password changed");
          }
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
};
