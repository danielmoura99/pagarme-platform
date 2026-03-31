// lib/rate-limit.ts
// Rate limiter in-memory para endpoints críticos
// Em serverless (Vercel), o state é perdido entre cold starts,
// mas ainda protege contra abuso dentro de uma mesma instância.

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Limpar entradas expiradas periodicamente (evitar memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000); // Limpar a cada 1 minuto

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || realIP || "unknown";
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // segundos
}

/**
 * Verifica rate limit para um endpoint + IP
 * @param key Identificador único (ex: "checkout", "coupon-validate")
 * @param ip IP do cliente
 * @param maxRequests Máximo de requests permitidos na janela
 * @param windowMs Janela de tempo em milissegundos
 */
export function checkRateLimit(
  key: string,
  ip: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const storeKey = `${key}:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(storeKey);

  // Se não existe ou expirou, criar nova janela
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(storeKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: Math.ceil(windowMs / 1000) };
  }

  // Dentro da janela
  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetIn = Math.ceil((entry.resetAt - now) / 1000);

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetIn };
  }

  return { allowed: true, remaining, resetIn };
}
