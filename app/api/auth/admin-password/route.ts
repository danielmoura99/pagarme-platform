// app/api/auth/admin-password/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Cache simples de tentativas de login por IP (em memória)
const attemptsByIP = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos

function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0] || realIP || "unknown";
}

function isBlocked(ip: string): boolean {
  const attempts = attemptsByIP.get(ip);
  if (!attempts) return false;
  
  const now = Date.now();
  if (now - attempts.lastAttempt > LOCKOUT_TIME) {
    attemptsByIP.delete(ip);
    return false;
  }
  
  return attempts.count >= MAX_ATTEMPTS;
}

function recordAttempt(ip: string, success: boolean) {
  const now = Date.now();
  const attempts = attemptsByIP.get(ip) || { count: 0, lastAttempt: now };
  
  if (success) {
    attemptsByIP.delete(ip);
  } else {
    attempts.count++;
    attempts.lastAttempt = now;
    attemptsByIP.set(ip, attempts);
  }
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const clientIP = getClientIP(request);

    // Verificar se IP está bloqueado
    if (isBlocked(clientIP)) {
      console.warn(`[ADMIN_AUTH] IP bloqueado por muitas tentativas: ${clientIP}`);
      return NextResponse.json(
        { 
          success: false, 
          error: "Muitas tentativas incorretas. Tente novamente em 15 minutos.",
          blocked: true
        },
        { status: 429 }
      );
    }

    // Validar dados de entrada
    if (!password || typeof password !== "string") {
      recordAttempt(clientIP, false);
      return NextResponse.json(
        { success: false, error: "Senha é obrigatória" },
        { status: 400 }
      );
    }

    // Obter senha do ambiente
    const adminPassword = process.env.PASSWORD_ADMIN;
    
    if (!adminPassword) {
      console.error("[ADMIN_AUTH] PASSWORD_ADMIN não configurada no .env");
      return NextResponse.json(
        { success: false, error: "Configuração de segurança não encontrada" },
        { status: 500 }
      );
    }

    // Verificar senha
    const isValid = password === adminPassword;
    
    if (isValid) {
      recordAttempt(clientIP, true);
      console.log(`[ADMIN_AUTH] Acesso autorizado para IP: ${clientIP}`);
      
      return NextResponse.json({
        success: true,
        message: "Autenticado com sucesso"
      });
    } else {
      recordAttempt(clientIP, false);
      const attempts = attemptsByIP.get(clientIP);
      const remainingAttempts = MAX_ATTEMPTS - (attempts?.count || 0);
      
      console.warn(`[ADMIN_AUTH] Tentativa de acesso falhada para IP: ${clientIP}, tentativas restantes: ${remainingAttempts}`);
      
      return NextResponse.json(
        { 
          success: false, 
          error: "Senha incorreta",
          attempts: attempts?.count || 0,
          maxAttempts: MAX_ATTEMPTS,
          remainingAttempts: Math.max(0, remainingAttempts)
        },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error("[ADMIN_AUTH] Erro interno:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Endpoint para verificar status de bloqueio (opcional)
export async function GET(request: Request) {
  try {
    const clientIP = getClientIP(request);
    const blocked = isBlocked(clientIP);
    const attempts = attemptsByIP.get(clientIP);
    
    return NextResponse.json({
      blocked,
      attempts: attempts?.count || 0,
      maxAttempts: MAX_ATTEMPTS,
      remainingTime: blocked && attempts 
        ? Math.max(0, LOCKOUT_TIME - (Date.now() - attempts.lastAttempt))
        : 0
    });
  } catch (error) {
    console.error("[ADMIN_AUTH_STATUS] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}