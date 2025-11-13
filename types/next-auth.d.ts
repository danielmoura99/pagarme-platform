// types/next-auth.d.ts
import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    updatedAt?: Date;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    passwordUpdatedAt?: number;
  }
}
