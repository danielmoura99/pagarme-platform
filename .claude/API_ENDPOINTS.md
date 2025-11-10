# API Endpoints - Documentação Completa

## Padrões de Desenvolvimento de APIs

### Estrutura Básica de um Endpoint

```typescript
// app/api/[recurso]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// ✅ SEMPRE adicionar para rotas dinâmicas
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 1. Extrair parâmetros
    const { searchParams } = new URL(request.url);
    const param = searchParams.get("param");

    // 2. Validação de entrada (se necessário)
    if (!param) {
      return NextResponse.json(
        { error: "Parâmetro obrigatório" },
        { status: 400 }
      );
    }

    // 3. Lógica de negócio / Query ao banco
    const data = await prisma.model.findMany({
      where: { /* ... */ }
    });

    // 4. Retornar resposta
    return NextResponse.json(data);

  } catch (error) {
    // 5. Tratamento de erro
    console.error("[ENDPOINT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
```

### Convenções de Nomenclatura

#### Logs
```typescript
// Padrão: [CONTEXTO_AÇÃO_TIPO]
console.log("[PIXEL_EVENT_SAVED]", data);           // Sucesso
console.error("[CHECKOUT_VALIDATION_ERROR]", error); // Erro
console.warn("[SPLIT_PERCENTAGE_WARNING]", msg);     // Aviso
```

#### Respostas de Erro
```typescript
// Erro específico com contexto
return NextResponse.json(
  {
    error: "Mensagem amigável",
    details: "Detalhes técnicos (opcional)",
    code: "ERROR_CODE" // Opcional, para frontends
  },
  { status: 400 } // 400, 404, 500, etc.
);
```

#### Status HTTP
- `200`: Sucesso
- `201`: Criado com sucesso (POST)
- `400`: Erro de validação / Bad Request
- `401`: Não autenticado
- `403`: Não autorizado
- `404`: Não encontrado
- `405`: Método não permitido
- `500`: Erro interno do servidor

---

## Endpoints por Módulo

## 1. Checkout e Pagamentos

### POST /api/checkout
**Descrição**: Processa um pedido completo (cartão ou PIX)

**Body**:
```typescript
{
  product: {
    id: string;
    price: number;
  },
  customer: {
    name: string;
    email: string;
    document: string; // CPF sem formatação
    phone: string;    // (XX) XXXXX-XXXX
  },
  paymentMethod: "credit_card" | "pix",
  cardData?: {      // Obrigatório se credit_card
    cardNumber: string;
    cardHolder: string;
    cardExpiry: string; // MM/YY
    cardCvv: string;
  },
  installments?: number;  // Padrão: 1
  affiliateRef?: string;  // recipientId do afiliado
  selectedBumps?: string[]; // IDs de order bumps
  coupon?: {
    code: string;
    discountPercentage: number;
  },
  checkoutId: string; // UUID para idempotência
  totalAmount: number;
}
```

**Response (Cartão de Crédito)**:
```typescript
{
  success: true,
  orderId: string,
  status: "paid" | "pending" | "failed",
  isDuplicate?: boolean // Se foi idempotência
}
```

**Response (PIX)**:
```typescript
{
  success: true,
  orderId: string,
  qrCode: string,        // String do QR Code PIX
  qrCodeUrl: string,     // URL da imagem do QR Code
  expiresAt: string,     // ISO timestamp
  status: "pending",
  transactionId: string
}
```

**Erros Comuns**:
```typescript
// Validação (400)
{
  success: false,
  message: "Número do cartão inválido",
  failureCode: "INVALID_CARD_NUMBER",
  errorType: "validation"
}

// Transação (400)
{
  success: false,
  orderId: string,
  status: "failed",
  message: "Cartão sem limite disponível",
  failureCode: "INSUFFICIENT_FUNDS",
  errorType: "transaction"
}
```

**Características Importantes**:
- ✅ Proteção de idempotência via `checkoutId`
- ✅ Tradução de erros Pagar.me para português
- ✅ Diferenciação entre erro de validação e transação
- ✅ Gravação de pedidos falhados para análise
- ✅ Split automático se houver afiliado
- ✅ Validação de cupom

**Exemplo de Uso**:
```typescript
const response = await fetch('/api/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product: { id: 'prod_123', price: 19900 },
    customer: {
      name: 'João Silva',
      email: 'joao@email.com',
      document: '12345678901',
      phone: '11999999999'
    },
    paymentMethod: 'credit_card',
    cardData: {
      cardNumber: '4111111111111111',
      cardHolder: 'JOAO SILVA',
      cardExpiry: '12/30',
      cardCvv: '123'
    },
    installments: 3,
    checkoutId: uuidv4(),
    totalAmount: 19900
  })
});

const data = await response.json();
if (data.success) {
  router.push(`/success?orderId=${data.orderId}`);
}
```

---

### POST /api/webhooks/pagarme
**Descrição**: Recebe notificações da Pagar.me sobre status de pedidos

**Eventos Tratados**:
- `order.paid`: Pagamento aprovado
- `order.payment_failed`: Pagamento falhou
- `order.refunded`: Pedido reembolsado
- `order.pending`: Pagamento pendente (PIX)

**Body** (enviado pela Pagar.me):
```typescript
{
  type: "order.paid" | "order.payment_failed" | "order.refunded" | "order.pending",
  data: {
    id: string, // ID da transação Pagar.me
    charges: [...],
    customer: {...},
    // ... outros dados da transação
  }
}
```

**Lógica**:
```typescript
// order.paid
- Atualizar status → "paid"
- Incrementar uso de cupom (se houver)
- Salvar pagarmeResponse completa
- Atualizar lastAttemptAt

// order.payment_failed
- Extrair failureReason e failureCode
- Incrementar attempts
- Atualizar status → "failed"
- Salvar pagarmeResponse para análise

// order.refunded
- Atualizar status → "refunded"

// order.pending
- Atualizar status → "pending"
```

**Importante**:
- ✅ Validar assinatura do webhook (segurança)
- ✅ Busca por `pagarmeTransactionId` ou fallback por `id`
- ✅ Logs detalhados para debugging
- ✅ RD Station sync desabilitado (evita duplicatas com pixel event)

---

### GET /api/orders/[orderId]/status
**Descrição**: Consulta status de um pedido

**Response**:
```typescript
{
  id: string,
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled",
  amount: number,
  paymentMethod: string,
  pagarmeTransactionId?: string,
  failureReason?: string,
  failureCode?: string,
  createdAt: string
}
```

---

## 2. Produtos

### GET /api/products
**Descrição**: Lista produtos

**Query Params**:
```typescript
?active=true  // Filtrar apenas ativos
```

**Response**:
```typescript
[
  {
    id: string,
    name: string,
    description: string | null,
    active: boolean,
    price: number // Preço mais recente ativo
  }
]
```

**Exemplo**:
```typescript
// Buscar apenas produtos ativos
const products = await fetch('/api/products?active=true')
  .then(r => r.json());
```

---

### GET /api/products/[productId]
**Descrição**: Busca produto específico com order bumps

**Response**:
```typescript
{
  id: string,
  name: string,
  description: string | null,
  active: boolean,
  productType: "evaluation" | "educational" | "combo",
  courseId: string | null,
  prices: [
    {
      id: string,
      amount: number,
      currency: string,
      active: boolean
    }
  ],
  orderBumps: [
    {
      id: string,
      name: string,
      description: string | null,
      prices: [...]
    }
  ]
}
```

---

### PATCH /api/products/[productId]
**Descrição**: Atualiza produto e seus order bumps

**Body**:
```typescript
{
  name?: string,
  description?: string,
  active?: boolean,
  productType?: "evaluation" | "educational" | "combo",
  courseId?: string,
  orderBumps?: string[] // IDs dos produtos bump
}
```

**Lógica**:
```typescript
// 1. Remove todas as relações de order bumps existentes
// 2. Cria novas relações com os IDs fornecidos
// 3. Atualiza outros campos do produto
```

---

## 3. Pixels e Analytics

### POST /api/pixels/events
**Descrição**: Registra evento de pixel para tracking

**Body**:
```typescript
{
  pixelConfigId: string,
  eventType: "PageView" | "ViewContent" | "InitiateCheckout" |
             "AddPaymentInfo" | "Purchase",
  eventData?: {
    value?: number,
    currency?: string,
    products?: Array<{
      id: string,
      name: string,
      price: number
    }>,
    email?: string, // Para eventos Purchase
    // ... outros dados específicos do evento
  },
  orderId?: string,     // Para eventos Purchase
  sessionId?: string,   // UUID da sessão
  userAgent?: string,

  // Traffic Source (UTMs)
  source?: string,      // utm_source (google, facebook, etc)
  medium?: string,      // utm_medium (cpc, organic, etc)
  campaign?: string,    // utm_campaign
  term?: string,        // utm_term
  content?: string,     // utm_content
  referrer?: string,    // URL anterior
  landingPage?: string  // Primeira página da sessão
}
```

**Response**:
```typescript
{
  id: string,
  pixelConfigId: string,
  eventType: string,
  // ... campos salvos
  createdAt: string
}

// OU (se duplicata)
{
  id: string,
  duplicate: true,
  deduplicationStrategy: "orderId" | "sessionId" | "fingerprint",
  message: string
}
```

**Características**:
- ✅ Prevenção de duplicatas via `PixelEventDeduplicator`
- ✅ Captura de IP via headers (x-forwarded-for)
- ✅ Sincronização automática com RD Station (eventos Purchase)
- ✅ Logs detalhados para debugging

**Lógica de Deduplicação**:
```typescript
// Estratégias (em ordem de prioridade):
1. orderId + eventType (para Purchase)
2. sessionId + pixelConfigId + eventType (últimos 5min)
3. fingerprint: ipAddress + userAgent + eventType (últimos 2min)
```

---

### GET /api/analytics/funnel
**Descrição**: Retorna funil de conversão

**Query Params**:
```typescript
?days=30  // Últimos X dias (padrão: 30)
```

**Response**:
```typescript
{
  // Contagem total de eventos
  pageViews: number,
  viewContent: number,
  initiateCheckout: number,
  addPaymentInfo: number,
  purchases: number,

  // Sessões únicas (usuários únicos)
  uniqueSessions: {
    pageViews: number,
    viewContent: number,
    initiateCheckout: number,
    addPaymentInfo: number,
    purchases: number
  },

  // Taxas de conversão (%)
  conversionRates: {
    viewToCheckout: number,      // ViewContent → InitiateCheckout
    checkoutToPurchase: number,  // InitiateCheckout → Purchase
    overallConversion: number    // ViewContent → Purchase
  }
}
```

**Exemplo**:
```typescript
const funnel = await fetch('/api/analytics/funnel?days=7')
  .then(r => r.json());

console.log(`Taxa de conversão: ${funnel.conversionRates.overallConversion}%`);
```

---

### GET /api/analytics/traffic-sources
**Descrição**: Análise de fontes de tráfego

**Query Params**:
```typescript
?days=30
?eventType=Purchase  // Filtrar por tipo de evento
```

**Response**:
```typescript
[
  {
    source: string,      // "google", "facebook", "direct"
    medium: string,      // "cpc", "organic", "referral"
    campaign: string | null,
    events: number,      // Total de eventos
    uniqueSessions: number,
    conversions: number, // Se eventType=Purchase
    conversionRate: number
  }
]
```

---

### GET /api/analytics/pixels
**Descrição**: Análise de performance por pixel

**Response**:
```typescript
[
  {
    pixelId: string,
    platform: string,
    productName: string,
    totalEvents: number,
    eventsByType: {
      PageView: number,
      ViewContent: number,
      InitiateCheckout: number,
      AddPaymentInfo: number,
      Purchase: number
    },
    lastEventAt: string
  }
]
```

---

## 4. Afiliados e Recipients

### GET /api/affiliates
**Descrição**: Lista afiliados

**Response**:
```typescript
[
  {
    id: string,
    userId: string,
    commission: number,
    active: boolean,
    recipientId: string | null,
    user: {
      name: string,
      email: string
    },
    _count: {
      orders: number // Total de pedidos
    }
  }
]
```

---

### GET /api/recipients/all
**Descrição**: Lista todos os recipients da Pagar.me

**Response**:
```typescript
[
  {
    id: string,
    name: string,
    email: string,
    document: string,
    type: "individual" | "company",
    status: "active" | "inactive",
    default_bank_account: {
      bank: string,
      account_number: string,
      // ...
    }
  }
]
```

---

### POST /api/recipients/sync
**Descrição**: Sincroniza recipients da Pagar.me com banco local

**Response**:
```typescript
{
  success: true,
  synced: number, // Quantidade sincronizada
  recipients: [...]
}
```

---

## 5. Cupons

### POST /api/coupons/validate
**Descrição**: Valida cupom antes do checkout

**Body**:
```typescript
{
  code: string,      // Código do cupom
  productId: string  // ID do produto
}
```

**Response (Válido)**:
```typescript
{
  valid: true,
  coupon: {
    id: string,
    code: string,
    discountPercentage: number,
    maxUses: number | null,
    usageCount: number,
    expiresAt: string | null
  }
}
```

**Response (Inválido)**:
```typescript
{
  valid: false,
  reason: "not_found" | "expired" | "max_uses_reached" | "not_for_product"
}
```

---

### GET /api/coupons/[couponId]
**Descrição**: Busca cupom específico

**Response**:
```typescript
{
  id: string,
  code: string,
  active: boolean,
  discountPercentage: number,
  usageCount: number,
  maxUses: number | null,
  expiresAt: string | null,
  products: [
    {
      id: string,
      name: string
    }
  ],
  orders: [
    {
      id: string,
      amount: number,
      status: string,
      createdAt: string
    }
  ]
}
```

---

## 6. Integração RD Station

### GET /api/integrations/rd-station/config
**Descrição**: Busca configuração do RD Station

**Response**:
```typescript
{
  id: string,
  enabled: boolean,
  clientId: string | null,
  hasTokens: boolean,     // true se accessToken existe
  tokenExpiresAt: string | null,
  syncEvents: string[],   // ["pageView", "purchase", ...]
  leadMapping: {
    email: boolean,
    name: boolean,
    phone: boolean,
    utmSource: boolean,
    // ...
  },
  autoSync: boolean,
  syncInterval: number,
  lastSyncAt: string | null,
  totalSynced: number
}
```

---

### POST /api/integrations/rd-station/config
**Descrição**: Salva configuração do RD Station

**Body**:
```typescript
{
  enabled: boolean,
  clientId: string,
  clientSecret: string,
  syncEvents: string[],
  leadMapping: object,
  autoSync: boolean,
  syncInterval: number
}
```

---

### GET /api/integrations/rd-station/callback
**Descrição**: Callback OAuth do RD Station

**Query Params**:
```typescript
?code=xxx  // Authorization code do OAuth
```

**Lógica**:
```typescript
1. Trocar code por access_token e refresh_token
2. Salvar tokens no banco (RDStationConfig)
3. Calcular tokenExpiresAt
4. Redirecionar para página de integração
```

---

### POST /api/integrations/rd-station/sync
**Descrição**: Força sincronização manual de eventos pendentes

**Response**:
```typescript
{
  success: true,
  processed: number,
  successful: number,
  failed: number,
  logs: [
    {
      id: string,
      eventType: string,
      status: "success" | "error",
      leadEmail: string,
      errorMessage?: string
    }
  ]
}
```

---

### GET /api/integrations/rd-station/sync-logs
**Descrição**: Lista logs de sincronização

**Query Params**:
```typescript
?status=error  // Filtrar por status
?limit=50      // Limitar resultados
```

**Response**:
```typescript
[
  {
    id: string,
    eventType: string,
    rdEventType: string,
    leadEmail: string,
    status: "pending" | "success" | "error" | "retrying",
    attempts: number,
    maxRetries: number,
    errorMessage: string | null,
    scheduledAt: string,
    processedAt: string | null,
    createdAt: string
  }
]
```

---

### POST /api/integrations/rd-station/disconnect
**Descrição**: Desconecta integração com RD Station

**Lógica**:
```typescript
1. Limpar tokens (accessToken, refreshToken)
2. Desabilitar (enabled = false)
3. Manter configurações (syncEvents, leadMapping)
```

---

## 7. Dashboard e Métricas

### GET /api/dashboard/metrics
**Descrição**: Métricas gerais do dashboard

**Query Params**:
```typescript
?days=30
```

**Response**:
```typescript
{
  sales: {
    total: number,        // Total em centavos
    count: number,        // Quantidade de vendas
    averageTicket: number
  },
  revenue: {
    paid: number,
    pending: number,
    failed: number
  },
  topProducts: [
    {
      productId: string,
      productName: string,
      sales: number,
      revenue: number
    }
  ],
  affiliates: {
    totalCommissions: number,
    activeAffiliates: number
  },
  conversion: {
    rate: number,        // Taxa de conversão %
    visitors: number,
    purchases: number
  }
}
```

---

## 8. Utilitários

### POST /api/upload-url
**Descrição**: Gera URL pré-assinada para upload (Vercel Blob)

**Body**:
```typescript
{
  filename: string,
  contentType: string  // "image/png", "image/jpeg", etc
}
```

**Response**:
```typescript
{
  url: string,      // URL para upload
  downloadUrl: string // URL final do arquivo
}
```

**Uso**:
```typescript
// 1. Obter URL de upload
const { url, downloadUrl } = await fetch('/api/upload-url', {
  method: 'POST',
  body: JSON.stringify({
    filename: file.name,
    contentType: file.type
  })
}).then(r => r.json());

// 2. Fazer upload
await fetch(url, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': file.type
  }
});

// 3. Usar downloadUrl como logoUrl, headerImage, etc
```

---

### GET /api/proxy-image
**Descrição**: Proxy para imagens externas (evita CORS)

**Query Params**:
```typescript
?url=https://example.com/image.jpg
```

**Response**: Stream da imagem

---

## Padrões de Segurança nas APIs

### 1. Validação de Entrada
```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
  // ...
});

const validated = schema.parse(body);
```

### 2. Sanitização
```typescript
// Remover formatação de documentos
const document = customer.document.replace(/\D/g, '');

// Uppercase em códigos
const couponCode = code.toUpperCase();
```

### 3. Rate Limiting
```typescript
// Vercel tem rate limiting implícito
// Para proteção adicional, usar edge middleware
```

### 4. Autenticação
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: "Não autenticado" },
      { status: 401 }
    );
  }

  // Lógica protegida...
}
```

---

## Debugging de APIs

### Console Logs Padrão
```typescript
// Início da requisição
console.log('[ENDPOINT_NAME] Recebido:', { params, body });

// Dados processados
console.log('[ENDPOINT_NAME] Processando:', intermediateData);

// Sucesso
console.log('[ENDPOINT_NAME] Sucesso:', result);

// Erro
console.error('[ENDPOINT_NAME_ERROR]', error);
```

### Testes via cURL
```bash
# GET
curl http://localhost:3000/api/products?active=true

# POST
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"product":{"id":"xxx","price":19900},...}'

# Com autenticação (se necessário)
curl http://localhost:3000/api/protected \
  -H "Cookie: next-auth.session-token=xxx"
```

---

## Checklist para Criar Nova API

- [ ] Criar arquivo `route.ts` no caminho apropriado
- [ ] Adicionar `export const dynamic = "force-dynamic"` (se dinâmica)
- [ ] Implementar método HTTP (GET, POST, PUT, DELETE, PATCH)
- [ ] Validar entrada com Zod (se aplicável)
- [ ] Adicionar logs de debug (`console.log/error`)
- [ ] Tratar erros com try-catch
- [ ] Retornar status HTTP apropriado
- [ ] Documentar endpoint neste arquivo
- [ ] Testar com Postman/cURL
- [ ] Verificar se precisa de autenticação

---

**Última Atualização**: 2025-11-03
**Total de Endpoints**: 45+
