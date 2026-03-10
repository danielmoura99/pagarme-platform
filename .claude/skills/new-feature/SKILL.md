---
name: new-feature
description: Workflow completo para desenvolvimento de nova feature end-to-end
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Edit, Write, Bash, Agent
argument-hint: "[descricao da feature]"
---

# Desenvolver Nova Feature

Workflow end-to-end para criar uma feature completa no projeto.

## Fase 1: Analise

1. Entender o requisito e identificar os modulos afetados
2. Verificar se precisa de mudanca no schema Prisma
3. Mapear: schema -> API -> frontend (server component ou client component?)
4. Identificar impacto em fluxos existentes (checkout, pixels, split)

## Fase 2: Schema (se necessario)

1. Editar `prisma/schema.prisma`
2. Adicionar indices para queries frequentes
3. Rodar `npx prisma migrate dev --name descricao_curta`
4. Verificar que `prisma generate` passou

## Fase 3: Backend (API)

1. Criar endpoint(s) em `app/api/`
2. Seguir padroes de `.claude/rules/api-patterns.md`
3. Validar entrada com Zod
4. Implementar logica de negocio
5. Testar endpoint isolado

## Fase 4: Frontend

### Server Component (preferido)
```typescript
// app/(dashboard)/[modulo]/page.tsx
export default async function Page() {
  const data = await prisma.model.findMany({ /* ... */ });
  return <ClientComponent data={data} />;
}
```

### Client Component (quando necessario)
```typescript
"use client";
// Apenas com hooks, event handlers, ou browser APIs
// Usar React Hook Form + Zod para forms
// Usar TanStack Query para data fetching dinamico
```

### Componentes Locais
- Criar em `_components/` dentro da pasta da feature
- Formularios: `[feature]-form.tsx`
- Tabelas: `columns.tsx` + `client.tsx` + `cell-action.tsx`

## Fase 5: Integracao

1. Verificar se feature afeta checkout flow (regras criticas)
2. Se envolve pagamento: garantir split = 100%
3. Se envolve tracking: adicionar eventos de pixel
4. Se envolve dados: verificar indices Prisma

## Fase 6: Validacao

1. Testar fluxo completo (happy path + erros)
2. Verificar TypeScript sem erros (`npm run build`)
3. Verificar que nao quebrou fluxos existentes
