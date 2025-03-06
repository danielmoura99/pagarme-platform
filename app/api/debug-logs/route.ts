/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/debug-logs/route.ts
import { NextResponse } from "next/server";

// Armazenamento em memória para logs (será limpo em redeploys)
let debugLogs: Array<{ timestamp: string; type: string; data: any }> = [];

export function addLog(type: string, data: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    data,
  };

  debugLogs.push(logEntry);
  // Mantenha apenas os últimos 100 logs
  if (debugLogs.length > 100) {
    debugLogs = debugLogs.slice(-100);
  }

  return logEntry;
}

// Endpoint para ver os logs
export async function GET() {
  return NextResponse.json(debugLogs);
}

// Endpoint para limpar logs
export async function DELETE() {
  debugLogs = [];
  return NextResponse.json({ message: "Logs limpos com sucesso" });
}
