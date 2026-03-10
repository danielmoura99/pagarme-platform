---
paths:
  - "app/api/**"
---

# API Development Patterns

## Estrutura Padrao

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function METHOD(request: Request) {
  try {
    // 1. Extrair e validar entrada (Zod)
    // 2. Logica de negocio
    // 3. Persistencia
    // 4. Retornar resposta
  } catch (error) {
    console.error("[CONTEXTO_ERROR]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

## Convencoes

- SEMPRE `export const dynamic = "force-dynamic"` em rotas dinamicas
- Validar entrada com Zod schema
- Logs: `[MODULO_ACAO_TIPO]` (ex: `[PIXEL_EVENT_SAVED]`, `[CHECKOUT_VALIDATION_ERROR]`)
- Status HTTP: 200 sucesso, 201 criado, 400 validacao, 401 nao autenticado, 404 nao encontrado, 500 interno
- Respostas de erro: `{ error: "mensagem", details?: "tecnico", code?: "CODIGO" }`

## Autenticacao

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';

const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
```

Rotas publicas (sem auth): `/api/checkout`, `/api/coupons/validate`, `/api/pixels/events`, `/api/webhooks/*`
Rotas protegidas (com auth): todas as demais

## Params Dinamicos

```typescript
// app/api/resource/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
}
```

## Query Params

```typescript
const { searchParams } = new URL(request.url);
const days = parseInt(searchParams.get("days") || "30");
```
