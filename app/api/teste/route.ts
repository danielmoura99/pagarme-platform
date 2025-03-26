// app/api/test/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  console.log("API de teste chamada com sucesso");
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
  });
}
