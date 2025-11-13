// app/api/auth/[...nextauth]/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { compare } from "bcrypt";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
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

        return user;
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;

        // Validar se a senha foi alterada após o login
        if (token.passwordUpdatedAt) {
          const user = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { updatedAt: true },
          });

          // Se a senha foi alterada após o token ser criado, invalida a sessão
          if (user && user.updatedAt.getTime() > (token.passwordUpdatedAt as number)) {
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
