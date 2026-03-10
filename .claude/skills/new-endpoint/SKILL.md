---
name: new-endpoint
description: Guia para criar novos API endpoints seguindo os padroes do projeto
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
argument-hint: "[GET|POST|PATCH|DELETE] /api/[recurso] - [descricao]"
---

# Criar Novo API Endpoint

Siga este checklist para criar um novo endpoint API no projeto.

## Passo 1: Definir Localizacao

Determinar o path baseado no recurso:
- `app/api/[recurso]/route.ts` para colecao (GET lista, POST cria)
- `app/api/[recurso]/[id]/route.ts` para item especifico (GET, PATCH, DELETE)

## Passo 2: Scaffold

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Schema de validacao (se POST/PATCH)
const createSchema = z.object({
  // definir campos...
});

export async function METHOD(request: Request) {
  try {
    // 1. Autenticacao (se rota protegida)
    // const session = await getServerSession(authOptions);
    // if (!session) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

    // 2. Extrair e validar entrada
    // const body = await request.json();
    // const validated = createSchema.parse(body);

    // 3. Logica de negocio + Prisma query

    // 4. Retornar resposta
    return NextResponse.json(data);
  } catch (error) {
    console.error("[RECURSO_METHOD_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados invalidos", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

## Passo 3: Checklist Final

- [ ] `export const dynamic = "force-dynamic"` presente
- [ ] Validacao Zod para inputs
- [ ] Try-catch com log `[CONTEXTO_ERROR]`
- [ ] Status HTTP correto (200, 201, 400, 401, 404, 500)
- [ ] Autenticacao se rota protegida
- [ ] Prisma includes explicitos (sem over-fetching)
- [ ] Testar com curl/Postman

## Passo 4: Referencia

Para exemplos existentes, consultar:
- `app/api/checkout/route.ts` (POST complexo com split e pagamento)
- `app/api/products/route.ts` (CRUD simples)
- `app/api/pixels/events/route.ts` (POST com deduplicacao)
- `app/api/analytics/funnel/route.ts` (GET com aggregation)
