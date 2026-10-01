import { withDbMonitoring } from "@/lib/monitoring/route";
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "./auth";

const handler = NextAuth(authOptions) as (request: Request, context: { params: { nextauth: string[] } }) => Promise<Response>;

export const GET = withDbMonitoring("GET /api/auth/[...nextauth]", handler);
export const POST = withDbMonitoring("POST /api/auth/[...nextauth]", handler);
