# Arquitetura - Pagarme Platform

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js 14 (App Router) + React 18 + TypeScript            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Checkout   │  │  Dashboard   │  │  Auth Pages  │      │
│  │  (Público)   │  │  (Protegido) │  │   (Público)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Pixel Manager (Client Component)            │    │
│  │  Tracking: Facebook, Google, TikTok, Snapchat      │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER                                │
│              Next.js API Routes (Serverless)                 │
│                                                              │
│  /api/checkout          /api/products      /api/analytics   │
│  /api/webhooks          /api/pixels        /api/integrations │
│  /api/coupons           /api/affiliates    /api/recipients  │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
    ┌──────────────┐ ┌───────────┐ ┌──────────────┐
    │   Pagar.me   │ │ PostgreSQL│ │  RD Station  │
    │   Gateway    │ │ + Prisma  │ │  Marketing   │
    └──────────────┘ └───────────┘ └──────────────┘
```

## Padrões Arquiteturais

### 1. Next.js App Router (Route Groups)

```
app/
├── (auth)/              # Grupo: Autenticação
│   ├── layout.tsx       # Layout específico (sem sidebar)
│   └── login/
│       └── page.tsx
│
├── (checkout)/          # Grupo: Checkout público
│   ├── checkout/
│   ├── success/
│   └── error/
│
├── (dashboard)/         # Grupo: Admin protegido
│   ├── layout.tsx       # Layout com sidebar
│   ├── products/
│   ├── analytics/
│   └── integrations/
│
└── api/                 # API Routes
    ├── checkout/
    ├── webhooks/
    └── integrations/
```

**Benefícios**:
- Layouts específicos por grupo
- Middleware aplicado seletivamente
- Organização lógica clara

### 2. Server Components First

**Padrão Default**: Server Components

```typescript
// app/products/page.tsx
// Server Component (padrão)
export default async function ProductsPage() {
  const products = await prisma.product.findMany(); // Direct DB access
  return <ProductList products={products} />;
}
```

**Client Components**: Apenas quando necessário

```typescript
// components/tracking/pixel-manager.tsx
'use client'; // Explícito

import { useEffect, usePathname } from 'next/navigation';

export function PixelManager() {
  const pathname = usePathname(); // Hook do React
  // Lógica de tracking...
}
```

**Quando usar Client Components**:
- Hooks do React (useState, useEffect, usePathname, etc.)
- Event handlers (onClick, onChange, etc.)
- Browser APIs (window, localStorage, etc.)
- Third-party libraries que dependem do browser

### 3. Data Fetching Strategy

#### Server Components (Recomendado)
```typescript
// Direct database access
async function getProducts() {
  return await prisma.product.findMany({
    where: { active: true },
    include: { prices: true }
  });
}
```

#### API Routes + Client Components
```typescript
// Quando precisa de interatividade
'use client';
import { useQuery } from '@tanstack/react-query';

export function ProductList() {
  const { data } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then(r => r.json())
  });
}
```

### 4. Middleware Pattern

```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Lógica customizada
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Rotas públicas
        const publicPaths = ['/login', '/checkout', '/success'];
        if (publicPaths.some(p => req.nextUrl.pathname.startsWith(p))) {
          return true;
        }
        // Dashboard requer autenticação
        return !!token;
      }
    }
  }
);
```

## Camadas da Aplicação

### Layer 1: Apresentação (UI)

**Componentes Server**:
- `app/(dashboard)/products/page.tsx`
- `app/(checkout)/checkout/page.tsx`

**Componentes Client**:
- `components/ui/*` (shadcn/ui)
- `components/tracking/pixel-manager.tsx`
- Formulários interativos

**Responsabilidades**:
- Renderização de UI
- Validação de formulários (React Hook Form + Zod)
- Interações do usuário
- Tracking de eventos

### Layer 2: API (Backend)

**Estrutura**:
```typescript
// app/api/checkout/route.ts
export async function POST(request: Request) {
  try {
    // 1. Validação de entrada
    const body = await request.json();

    // 2. Lógica de negócio
    const transaction = await pagarme.createTransaction();

    // 3. Persistência
    const order = await prisma.order.create();

    // 4. Resposta
    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    // Tratamento de erro
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Responsabilidades**:
- Validação de entrada
- Lógica de negócio
- Integração com serviços externos
- Persistência de dados
- Tratamento de erros

### Layer 3: Serviços (Business Logic)

**Exemplo: Pagar.me Client**
```typescript
// lib/pagarme.ts
export class PagarmeClient {
  private headers: HeadersInit;

  constructor() {
    this.headers = {
      Authorization: `Basic ${Buffer.from(`${PAGARME_SECRET_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json'
    };
  }

  async createTransaction(params: TransactionParams) {
    // Implementação
  }
}

export const pagarme = new PagarmeClient();
```

**Exemplo: RD Station Sync**
```typescript
// lib/rd-station-auto-sync.ts
export async function syncLeadToRDStation(
  leadData: LeadData,
  config: RDStationConfig
) {
  // 1. Validar token
  // 2. Mapear dados
  // 3. Enviar para RD
  // 4. Registrar log
}
```

### Layer 4: Dados (Persistência)

**Prisma ORM**:
```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Padrões de Query**:
```typescript
// ✅ BOM: Includes explícitos
const product = await prisma.product.findUnique({
  where: { id },
  include: {
    prices: { where: { active: true } },
    pixelConfigs: { where: { enabled: true } }
  }
});

// ❌ EVITAR: Over-fetching
const product = await prisma.product.findUnique({
  where: { id },
  include: {
    prices: true,
    orderBumps: true,
    coupons: true,
    // ... todos os relacionamentos
  }
});
```

## Fluxos de Dados Críticos

### 1. Fluxo de Checkout Completo

```typescript
// Frontend (Client Component)
'use client';
export function CheckoutForm() {
  const handleSubmit = async (data) => {
    // 1. Validação local (Zod)
    const validated = checkoutSchema.parse(data);

    // 2. Enviar para API
    const response = await fetch('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        ...validated,
        checkoutId: uuidv4() // Idempotência
      })
    });

    // 3. Processar resposta
    if (response.ok) {
      router.push('/success');
    }
  };
}
```

```typescript
// Backend (API Route)
export async function POST(request: Request) {
  const body = await request.json();

  // 1. Validar produto
  const product = await prisma.product.findUnique({
    where: { id: body.product.id, active: true }
  });

  // 2. Verificar duplicata
  const existing = await prisma.order.findFirst({
    where: { checkoutId: body.checkoutId }
  });
  if (existing) return NextResponse.json({ orderId: existing.id });

  // 3. Processar pagamento
  const transaction = await pagarme.createTransaction({
    amount: product.price,
    customer: body.customer,
    split: splitRules
  });

  // 4. Criar pedido
  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      amount: transaction.amount,
      status: transaction.status,
      pagarmeTransactionId: transaction.id
    }
  });

  // 5. Retornar
  return NextResponse.json({ orderId: order.id });
}
```

### 2. Fluxo de Tracking de Pixels

```typescript
// Frontend: Disparo de Evento
useEffect(() => {
  const fireEvent = async (eventName: string) => {
    // 1. Prevenção de duplicatas
    const eventKey = `${eventName}-${pathname}-${sessionId}`;
    if (firedEvents.current.has(eventKey)) return;

    // 2. Detectar fonte de tráfego
    const trafficSource = getTrafficSource();

    // 3. Disparar pixel apropriado
    if (shouldFirePixel('facebook', trafficSource)) {
      trackFacebookEvent(eventName, eventData);
    }

    // 4. Registrar no backend
    await fetch('/api/pixels/events', {
      method: 'POST',
      body: JSON.stringify({
        pixelConfigId: pixel.id,
        eventType: eventName,
        eventData,
        sessionId,
        source: trafficSource.source,
        campaign: trafficSource.campaign
      })
    });

    firedEvents.current.add(eventKey);
  };

  fireEvent('PageView');
}, [pathname]);
```

```typescript
// Backend: Persistência de Evento
export async function POST(request: Request) {
  const body = await request.json();

  await prisma.pixelEventLog.create({
    data: {
      pixelConfigId: body.pixelConfigId,
      eventType: body.eventType,
      eventData: body.eventData,
      sessionId: body.sessionId,
      source: body.source,
      medium: body.medium,
      campaign: body.campaign,
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for')
    }
  });

  return NextResponse.json({ success: true });
}
```

### 3. Fluxo de Sincronização RD Station

```typescript
// Trigger: Evento de Pixel
export async function POST(request: Request) {
  const body = await request.json();

  // 1. Criar log de pixel
  const pixelLog = await prisma.pixelEventLog.create({
    data: { /* ... */ }
  });

  // 2. Verificar se deve sincronizar com RD
  const rdConfig = await prisma.rDStationConfig.findFirst({
    where: { enabled: true }
  });

  if (rdConfig && shouldSyncEvent(body.eventType, rdConfig)) {
    // 3. Criar job de sincronização
    await prisma.rDStationSyncLog.create({
      data: {
        configId: rdConfig.id,
        pixelEventId: pixelLog.id,
        eventType: body.eventType,
        rdEventType: mapEventType(body.eventType),
        leadEmail: body.eventData?.email,
        leadData: body.eventData,
        status: 'pending'
      }
    });

    // 4. Processar em background (ou via cron)
    // await processRDStationSync();
  }

  return NextResponse.json({ success: true });
}
```

## Padrões de Segurança

### 1. Proteção de Rotas
```typescript
// middleware.ts - Rotas protegidas
export const config = {
  matcher: [
    '/(dashboard|admin|products|analytics)/:path*'
  ]
};
```

### 2. Validação de Webhook
```typescript
// app/api/webhooks/pagarme/route.ts
export async function POST(request: Request) {
  const signature = request.headers.get('X-Hub-Signature');
  const body = await request.text();

  // Validar assinatura
  const isValid = pagarme.validateWebhookSignature(signature, body);
  if (!isValid) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  // Processar webhook
}
```

### 3. Sanitização de Inputs
```typescript
// Sempre validar com Zod
const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().min(3).max(100),
    email: z.string().email(),
    document: z.string().regex(/^\d{11}$/),
    phone: z.string().regex(/^\d{10,11}$/)
  }),
  product: z.object({
    id: z.string().cuid(),
    price: z.number().positive()
  })
});

const validated = checkoutSchema.parse(body);
```

## Otimizações de Performance

### 1. Database Indexes
```prisma
model PixelEventLog {
  // ...

  @@index([pixelConfigId])
  @@index([eventType])
  @@index([createdAt])
  @@index([source])
  @@index([pixelConfigId, eventType, createdAt])
}
```

### 2. React Query Caching
```typescript
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000 // 10 minutos
  });
}
```

### 3. Lazy Loading
```typescript
// Dynamic imports para componentes pesados
const AnalyticsChart = dynamic(
  () => import('@/components/analytics/chart'),
  { loading: () => <Skeleton /> }
);
```

---

**Princípios Arquiteturais**:
1. **Server-first**: Usar Server Components sempre que possível
2. **Type-safe**: TypeScript em todo o código
3. **Validation**: Zod para schemas e validação
4. **Error handling**: Try-catch com logs detalhados
5. **Idempotência**: checkoutId e outros identificadores únicos
6. **Auditabilidade**: Logs detalhados (PixelEventLog, RDStationSyncLog)
