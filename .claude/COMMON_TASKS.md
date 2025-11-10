# Tarefas Comuns - Guia Rápido

## 📦 Adicionar Novo Produto

### 1. Via Dashboard (Recomendado)
Acesse `/products` e use a interface administrativa.

### 2. Via Prisma (Desenvolvimento)
```typescript
const product = await prisma.product.create({
  data: {
    name: "Nome do Produto",
    description: "Descrição detalhada",
    active: true,
    productType: "educational", // ou "evaluation", "combo"
    courseId: "curso_123", // Opcional
    prices: {
      create: {
        amount: 19900, // R$ 199,00 em centavos
        currency: "BRL",
        active: true
      }
    }
  }
});
```

### 3. Adicionar Pixels ao Produto
```typescript
await prisma.pixelConfig.create({
  data: {
    productId: product.id,
    platform: "facebook", // ou google_ads, google_analytics, tiktok, snapchat
    pixelId: "123456789",
    enabled: true,
    events: ["PageView", "ViewContent", "InitiateCheckout", "AddPaymentInfo", "Purchase"],
    testMode: false
  }
});
```

---

## 👥 Criar Afiliado

### Passo 1: Criar Recipient na Pagar.me
```typescript
const recipient = await pagarme.createRecipient({
  name: "Nome do Afiliado",
  email: "afiliado@email.com",
  document: "12345678901", // CPF sem formatação
  type: "individual", // ou "company"
  default_bank_account: {
    holder_name: "Nome do Afiliado",
    holder_type: "individual",
    holder_document: "12345678901",
    bank: "341", // Código do banco
    branch_number: "0001",
    branch_check_digit: "0",
    account_number: "12345",
    account_check_digit: "6",
    type: "checking" // ou "savings"
  }
});
```

### Passo 2: Criar Afiliado no Sistema
```typescript
const affiliate = await prisma.affiliate.create({
  data: {
    userId: user.id, // Vincular a um usuário
    commission: 20.0, // 20% de comissão
    recipientId: recipient.id, // ID retornado pela Pagar.me
    active: true,
    bankInfo: {
      bank: "341",
      account: "12345-6",
      agency: "0001"
    }
  }
});
```

---

## 🎟️ Criar Cupom de Desconto

```typescript
const coupon = await prisma.coupon.create({
  data: {
    code: "PROMO50", // Sempre em maiúsculas
    active: true,
    discountPercentage: 50, // 50% de desconto
    maxUses: 100, // Limite de usos (null = ilimitado)
    expiresAt: new Date("2025-12-31"), // Data de expiração
    products: {
      connect: [
        { id: "product_id_1" },
        { id: "product_id_2" }
      ]
    }
  }
});
```

---

## 🎨 Personalizar Checkout

### Atualizar Configurações Visuais
```typescript
const settings = await prisma.checkoutSettings.upsert({
  where: { id: "existing_id_or_any" },
  update: {
    companyName: "Minha Empresa",
    logoUrl: "https://...",
    primaryColor: "#3B82F6",
    secondaryColor: "#1E40AF",
    accentColor: "#F59E0B",
    checkoutTitle: "Finalize sua compra",
    checkoutDescription: "Preencha os dados abaixo",
    successMessage: "Compra realizada com sucesso!",

    // Parcelamento
    showInstallments: true,
    maxInstallments: 12,

    // Desconto PIX
    showPixDiscount: true,
    pixDiscountPercentage: 5, // 5% desconto no PIX

    // Banners
    headerBackgroundImage: "https://...", // Desktop
    headerMobileImage: "https://...", // Mobile
    headerMaxHeight: 350,
    headerEnabled: true,

    sidebarBannerImage: "https://...",
    sidebarBannerEnabled: true,

    // Order Bumps
    enableOrderBumps: true
  },
  create: {
    // ... mesmos campos acima
  }
});
```

---

## 📊 Configurar Split de Pagamento

### Split Simples (Empresa + 1 Afiliado)
```typescript
const splitRules = [
  {
    amount: 80, // 80% para empresa
    recipient_id: process.env.PAGARME_MAIN_RECIPIENT_ID,
    type: "percentage",
    options: {
      liable: true, // Responsável por chargebacks
      charge_processing_fee: true,
      charge_remainder_fee: true
    }
  },
  {
    amount: 20, // 20% para afiliado
    recipient_id: affiliate.recipientId,
    type: "percentage",
    options: {
      liable: false,
      charge_processing_fee: false,
      charge_remainder_fee: false
    }
  }
];
```

### Split Complexo (Múltiplos Recebedores)
```typescript
// 1. Criar configuração de split
const splitConfig = await prisma.splitConfiguration.create({
  data: {
    name: "Split Padrão - Produto X",
    description: "70% empresa, 20% afiliado, 10% plataforma",
    isActive: true,
    recipients: {
      create: [
        {
          recipientId: "re_empresa",
          recipientName: "Empresa Principal",
          percentage: 70,
          isLiable: true,
          chargeProcessingFee: true,
          chargeRemainderFee: true
        },
        {
          recipientId: "re_afiliado",
          recipientName: "Afiliado Top",
          percentage: 20,
          isLiable: false,
          chargeProcessingFee: false,
          chargeRemainderFee: false
        },
        {
          recipientId: "re_plataforma",
          recipientName: "Taxa Plataforma",
          percentage: 10,
          isLiable: false,
          chargeProcessingFee: false,
          chargeRemainderFee: false
        }
      ]
    }
  }
});

// 2. Vincular ao produto
await prisma.product.update({
  where: { id: product.id },
  data: {
    splitConfigurationId: splitConfig.id
  }
});
```

---

## 🔍 Analisar Pixels e Funil

### Buscar Eventos de um Produto
```typescript
const events = await prisma.pixelEventLog.findMany({
  where: {
    pixelConfig: {
      productId: "product_id"
    },
    createdAt: {
      gte: new Date("2025-01-01"),
      lte: new Date("2025-01-31")
    }
  },
  orderBy: {
    createdAt: "desc"
  },
  include: {
    pixelConfig: {
      select: {
        platform: true,
        pixelId: true
      }
    }
  }
});
```

### Calcular Funil de Conversão
```typescript
const funnel = await prisma.$transaction([
  // PageViews
  prisma.pixelEventLog.count({
    where: {
      pixelConfigId: pixelConfig.id,
      eventType: "PageView"
    }
  }),
  // ViewContent
  prisma.pixelEventLog.count({
    where: {
      pixelConfigId: pixelConfig.id,
      eventType: "ViewContent"
    }
  }),
  // InitiateCheckout
  prisma.pixelEventLog.count({
    where: {
      pixelConfigId: pixelConfig.id,
      eventType: "InitiateCheckout"
    }
  }),
  // AddPaymentInfo
  prisma.pixelEventLog.count({
    where: {
      pixelConfigId: pixelConfig.id,
      eventType: "AddPaymentInfo"
    }
  }),
  // Purchase
  prisma.pixelEventLog.count({
    where: {
      pixelConfigId: pixelConfig.id,
      eventType: "Purchase"
    }
  })
]);

const [pageViews, viewContent, initiateCheckout, addPayment, purchases] = funnel;

console.log({
  pageViews,
  viewContent,
  initiateCheckout,
  addPayment,
  purchases,
  conversionRate: ((purchases / pageViews) * 100).toFixed(2) + "%"
});
```

---

## 🔗 Configurar RD Station

### Passo 1: Obter Credenciais
1. Acesse [RD Station Developer](https://developers.rdstation.com/)
2. Crie um aplicativo
3. Copie `Client ID` e `Client Secret`

### Passo 2: Configurar no Sistema
```typescript
const rdConfig = await prisma.rDStationConfig.upsert({
  where: { id: "default_or_existing_id" },
  update: {
    enabled: true,
    clientId: "seu_client_id",
    clientSecret: "seu_client_secret",
    autoSync: true,
    syncInterval: 300, // 5 minutos
    syncEvents: ["pageView", "viewContent", "initiateCheckout", "purchase"],
    leadMapping: {
      email: true,
      name: true,
      phone: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true
    }
  },
  create: {
    // ... mesmos campos
  }
});
```

### Passo 3: Autorizar OAuth
- Acesse `/integrations/rd-station`
- Clique em "Conectar RD Station"
- Autorize o acesso
- Tokens serão salvos automaticamente

---

## 🐛 Troubleshooting

### Pixel não está disparando
```typescript
// 1. Verificar configuração
const pixelConfig = await prisma.pixelConfig.findFirst({
  where: {
    productId: "product_id",
    platform: "facebook"
  }
});

console.log({
  enabled: pixelConfig?.enabled,
  events: pixelConfig?.events,
  testMode: pixelConfig?.testMode
});

// 2. Verificar logs recentes
const recentLogs = await prisma.pixelEventLog.findMany({
  where: {
    pixelConfigId: pixelConfig?.id,
    createdAt: {
      gte: new Date(Date.now() - 3600000) // Última hora
    }
  },
  orderBy: {
    createdAt: "desc"
  },
  take: 10
});
```

### Erro de Split na Pagar.me
```typescript
// Verificar soma das porcentagens
const splitConfig = await prisma.splitConfiguration.findUnique({
  where: { id: "config_id" },
  include: {
    recipients: true
  }
});

const totalPercentage = splitConfig.recipients.reduce(
  (sum, r) => sum + r.percentage,
  0
);

console.log({
  totalPercentage,
  isValid: totalPercentage === 100,
  recipients: splitConfig.recipients.map(r => ({
    name: r.recipientName,
    percentage: r.percentage
  }))
});
```

### RD Station não sincronizando
```typescript
// 1. Verificar token
const rdConfig = await prisma.rDStationConfig.findFirst();

console.log({
  enabled: rdConfig?.enabled,
  hasTokens: !!(rdConfig?.accessToken && rdConfig?.refreshToken),
  tokenExpired: rdConfig?.tokenExpiresAt
    ? rdConfig.tokenExpiresAt < new Date()
    : null,
  lastSync: rdConfig?.lastSyncAt
});

// 2. Verificar logs de erro
const errorLogs = await prisma.rDStationSyncLog.findMany({
  where: {
    status: "error"
  },
  orderBy: {
    createdAt: "desc"
  },
  take: 10
});

errorLogs.forEach(log => {
  console.log({
    eventType: log.eventType,
    errorMessage: log.errorMessage,
    attempts: log.attempts,
    createdAt: log.createdAt
  });
});
```

### Pedidos Duplicados
```typescript
// Buscar duplicatas por checkoutId
const duplicates = await prisma.$queryRaw`
  SELECT "checkoutId", COUNT(*) as count
  FROM "Order"
  WHERE "checkoutId" IS NOT NULL
  GROUP BY "checkoutId"
  HAVING COUNT(*) > 1
`;

console.log("Checkouts duplicados:", duplicates);

// Investigar um específico
const orders = await prisma.order.findMany({
  where: {
    checkoutId: "checkout_id_duplicado"
  },
  include: {
    customer: true,
    items: true
  }
});
```

---

## 🧪 Testar Integração Pagar.me

### Criar Transação de Teste (Cartão)
```typescript
// Usar cartões de teste da Pagar.me
const testCard = {
  number: "4111111111111111", // Visa aprovado
  holder_name: "TESTE DA SILVA",
  exp_month: 12,
  exp_year: 2030,
  cvv: "123"
};

// Criar transação
const transaction = await pagarme.createCreditCardPayment({
  amount: 10000, // R$ 100,00
  customer: {
    name: "Cliente Teste",
    email: "teste@email.com",
    document: "12345678901",
    type: "individual",
    phones: {
      mobile_phone: {
        country_code: "55",
        area_code: "11",
        number: "999999999"
      }
    }
  },
  productDetails: {
    name: "Produto Teste",
    productType: "evaluation"
  },
  cardData: testCard,
  installments: 1
});
```

### Testar PIX
```typescript
const pixTransaction = await pagarme.createPixPayment({
  amount: 10000,
  customer: {
    // ... mesmo customer acima
  },
  productDetails: {
    name: "Produto Teste PIX",
    productType: "evaluation"
  },
  expiresIn: 3600 // 1 hora
});

console.log({
  qrCode: pixTransaction.charges[0].last_transaction.qr_code,
  qrCodeUrl: pixTransaction.charges[0].last_transaction.qr_code_url
});
```

---

## 📈 Queries Úteis de Analytics

### Vendas por Período
```typescript
const sales = await prisma.order.groupBy({
  by: ['status'],
  where: {
    createdAt: {
      gte: new Date('2025-01-01'),
      lte: new Date('2025-01-31')
    }
  },
  _sum: {
    amount: true
  },
  _count: {
    id: true
  }
});
```

### Performance de Afiliados
```typescript
const affiliatePerformance = await prisma.affiliate.findMany({
  include: {
    orders: {
      where: {
        status: 'paid',
        createdAt: {
          gte: new Date('2025-01-01')
        }
      },
      select: {
        amount: true,
        splitAmount: true
      }
    },
    user: {
      select: {
        name: true,
        email: true
      }
    }
  }
});

affiliatePerformance.forEach(affiliate => {
  const totalSales = affiliate.orders.reduce((sum, o) => sum + o.amount, 0);
  const totalCommission = affiliate.orders.reduce((sum, o) => sum + (o.splitAmount || 0), 0);

  console.log({
    affiliate: affiliate.user.name,
    totalOrders: affiliate.orders.length,
    totalSales: totalSales / 100, // Converter de centavos
    totalCommission: totalCommission / 100,
    commissionRate: affiliate.commission
  });
});
```

### Análise de Cupons
```typescript
const couponUsage = await prisma.coupon.findMany({
  include: {
    orders: {
      where: {
        status: 'paid'
      },
      select: {
        amount: true
      }
    },
    products: {
      select: {
        name: true
      }
    }
  }
});

couponUsage.forEach(coupon => {
  const totalRevenue = coupon.orders.reduce((sum, o) => sum + o.amount, 0);

  console.log({
    code: coupon.code,
    discount: `${coupon.discountPercentage}%`,
    uses: coupon.usageCount,
    maxUses: coupon.maxUses,
    totalRevenue: totalRevenue / 100,
    products: coupon.products.map(p => p.name)
  });
});
```

---

**Dica**: Sempre teste em ambiente de desenvolvimento antes de aplicar em produção!
