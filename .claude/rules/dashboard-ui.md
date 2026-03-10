---
paths:
  - "app/(dashboard)/**"
  - "components/dashboard/**"
  - "components/ui/**"
---

# Dashboard & UI Patterns

## Organizacao de Paginas

Cada pagina do dashboard segue o padrao:
```
app/(dashboard)/[modulo]/
  page.tsx                    # Server component (data fetching direto do Prisma)
  _components/                # Componentes locais do modulo
    client.tsx                # Client wrapper (quando precisa de interatividade)
    columns.tsx               # Definicao de colunas para tabelas (TanStack Table)
    cell-action.tsx           # Acoes de cada linha da tabela
    [modulo]-form.tsx         # Formulario de criacao/edicao
  _actions/                   # Server actions (quando aplicavel)
    index.ts
```

## Component Patterns

- **Server Components** (padrao): Data fetching direto do Prisma, sem hooks
- **Client Components**: Prefixar com `"use client"`, usar apenas quando:
  - Hooks React (useState, useEffect, etc.)
  - Event handlers (onClick, onChange)
  - Browser APIs (window, localStorage)
  - Bibliotecas client-only (recharts, react-hook-form)

## UI Library

- shadcn/ui (Radix primitives + Tailwind)
- Componentes em `components/ui/` (nao modificar diretamente, usar shadcn CLI para adicionar)
- Icones: `lucide-react`
- Notificacoes: `sonner` (toast)
- Temas: `next-themes`

## Formularios

```typescript
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({ /* ... */ });
type FormValues = z.infer<typeof formSchema>;

const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: { /* ... */ }
});
```

## Tabelas

- TanStack Table para tabelas complexas
- Definir colunas tipadas em `columns.tsx`
- Acoes por linha em `cell-action.tsx` (dropdown menu)

## Layout

- Dashboard layout em `app/(dashboard)/layout.tsx` (sidebar + content)
- Sidebar com navegacao principal (`components/nav-main.tsx`)
- Date range picker global via `DateContext`
- Todas as metricas respeitam o periodo selecionado

## Graficos

- Biblioteca: `recharts`
- Componentes em `app/(dashboard)/dash/_components/`
- Sempre usar lazy loading para charts pesados
