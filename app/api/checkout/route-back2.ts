// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { pagarme } from "@/lib/pagarme";
import { prisma } from "@/lib/db";
import { SplitRule } from "@/types/pagarme";
import { Product } from "@prisma/client";

export const dynamic = "force-dynamic";

// Interface para produto com campos expandidos que precisamos
interface ProductWithDetails extends Product {
  Price?: Array<{
    amount: number;
  }>;
  splitConfiguration?: {
    id: string;
    recipients: Array<{
      recipientId: string;
      percentage: number;
      isLiable: boolean;
      chargeProcessingFee: boolean;
      chargeRemainderFee: boolean;
    }>;
  } | null;
}

// Função para determinar as regras de split
async function determineSplitRules(
  product: ProductWithDetails,
  affiliateRef: string | null | undefined
): Promise<SplitRule[] | undefined> {
  // 1. Verificar se o produto tem uma configuração de split específica
  if (product.splitConfigurationId && product.splitConfiguration?.recipients) {
    const recipients = product.splitConfiguration.recipients;

    if (recipients.length > 0) {
      // Validar que a soma é 100%
      const totalPercentage = recipients.reduce(
        (sum, recipient) => sum + recipient.percentage,
        0
      );

      if (Math.abs(totalPercentage - 100) > 0.01) {
        console.warn(
          `[SPLIT_WARNING] Configuração ${product.splitConfigurationId} tem soma de percentuais ${totalPercentage}% (esperado: 100%)`
        );
      }

      // Usar a configuração de split do produto
      return recipients.map((recipient) => ({
        amount: recipient.percentage,
        recipient_id: recipient.recipientId,
        type: "percentage" as const,
        options: {
          liable: recipient.isLiable,
          charge_processing_fee: recipient.chargeProcessingFee,
          charge_remainder_fee: recipient.chargeRemainderFee,
        },
      }));
    }
  }

  // 2. Se não tiver configuração específica, usar a lógica atual de afiliados
  let splitRules: SplitRule[] | undefined;
  if (affiliateRef && process.env.PAGARME_MAIN_RECIPIENT_ID) {
    console.log("Buscando afiliado:", affiliateRef);
    const affiliate = await prisma.affiliate.findFirst({
      where: {
        recipientId: affiliateRef,
        active: true,
      },
      select: {
        id: true,
        commission: true,
        recipientId: true,
      },
    });

    console.log("Dados do afiliado encontrado:", affiliate);

    if (affiliate?.recipientId) {
      splitRules = [
        {
          amount: 100 - affiliate.commission,
          recipient_id: process.env.PAGARME_MAIN_RECIPIENT_ID,
          type: "percentage" as const,
          options: {
            liable: true,
            charge_processing_fee: true,
            charge_remainder_fee: true,
          },
        },
        {
          amount: affiliate.commission,
          recipient_id: affiliate.recipientId,
          type: "percentage" as const,
          options: {
            liable: false,
            charge_processing_fee: false,
            charge_remainder_fee: false,
          },
        },
      ];

      console.log(
        "Regras de split configuradas:",
        JSON.stringify(splitRules, null, 2)
      );
    } else {
      console.log("Afiliado encontrado mas sem recipientId válido");
    }
  } else {
    console.log(
      "Sem affiliateRef ou PAGARME_MAIN_RECIPIENT_ID não configurado"
    );
  }

  return splitRules;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      product,
      customer,
      paymentMethod,
      cardData,
      affiliateRef,
      selectedBumps,
      coupon,
    } = body;

    console.log("Recebido request de checkout:", {
      product,
      customer,
      paymentMethod,
      affiliateRef,
      couponInfo: coupon
        ? {
            code: coupon.code,
            hasDiscount: !!coupon.discountPercentage,
          }
        : null,
    });

    // 1. Validar e buscar produto
    const dbProduct = await prisma.product.findUnique({
      where: {
        id: product.id,
        active: true,
      },
      include: {
        prices: {
          where: { active: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        splitConfiguration:
          process.env.ENABLE_SPLIT_CONFIG === "true"
            ? {
                include: {
                  recipients: true,
                },
              }
            : undefined,
      },
    });

    if (!dbProduct || dbProduct.prices[0]?.amount !== product.price) {
      return new NextResponse("Produto inválido ou preço alterado", {
        status: 400,
      });
    }

    let dbCoupon = null;
    if (coupon && coupon.code) {
      try {
        dbCoupon = await prisma.coupon.findFirst({
          where: {
            code: coupon.code.toUpperCase(),
            active: true,
            products: {
              some: {
                id: product.id,
              },
            },
          },
        });

        if (dbCoupon) {
          console.log(
            `[API] Cupom ${coupon.code} encontrado com ID: ${dbCoupon.id}`
          );
        } else {
          console.log(
            `[API] Cupom ${coupon.code} não encontrado no banco de dados`
          );
        }
      } catch (couponError) {
        console.error("[API] Erro ao buscar cupom:", couponError);
        // Continuar sem o cupom em caso de erro
      }
    }

    // 2. Determinar regras de split
    const splitRules = await determineSplitRules(
      dbProduct as ProductWithDetails,
      affiliateRef
    );

    // 3. Formatar telefone
    const [areaCode, ...phoneNumber] = customer.phone
      .replace(/\D/g, "")
      .split("");

    // 4. Preparar customer para Pagar.me
    const pagarmeCustomer = {
      name: customer.name,
      email: customer.email,
      document: customer.document.replace(/\D/g, ""),
      type: "individual" as const,
      phones: {
        mobile_phone: {
          country_code: "55",
          area_code: areaCode + phoneNumber[0],
          number: phoneNumber.slice(1).join(""),
        },
      },
    };

    const productType = dbProduct.productType;
    const course_id = dbProduct.courseId || "vazio";
    // 5. Criar transação na Pagar.me
    let transaction;
    const amount = body.totalAmount || dbProduct.prices[0]?.amount || 0;

    let orderBumpsInfo = null;
    if (selectedBumps && selectedBumps.length > 0) {
      // Buscar os produtos dos order bumps para obter seus nomes
      const selectedBumpsData = await prisma.product.findMany({
        where: {
          id: {
            in: selectedBumps,
          },
        },
        select: {
          id: true,
          name: true,
          courseId: true,
        },
      });

      orderBumpsInfo = {
        ids: selectedBumps,
        names: selectedBumpsData.map((bump) => bump.name),
        courseIds: selectedBumpsData.map((bump) => bump.courseId),
      };
    }

    const metadata = {
      product_id: dbProduct.id,
      affiliate_id: affiliateRef || null,
      product_type: productType,
      order_bumps: orderBumpsInfo ? JSON.stringify(orderBumpsInfo) : null,
      has_order_bumps: selectedBumps && selectedBumps.length > 0 ? true : false,
      course_id: dbProduct.courseId || null,
    };

    if (paymentMethod === "credit_card") {
      if (!cardData) {
        return NextResponse.json(
          {
            success: false,
            message: "Dados do cartão são obrigatórios",
          },
          { status: 400 }
        );
      }

      console.log("Criando transação com split:", {
        amount,
        splitRules,
        mainRecipientId: process.env.PAGARME_MAIN_RECIPIENT_ID,
      });

      const [expMonth, expYear] = cardData.cardExpiry.split("/");
      transaction = await pagarme.createCreditCardPayment({
        amount,
        customer: pagarmeCustomer,
        productDetails: {
          name: dbProduct.name, // Adicionando nome do produto
          description: dbProduct.description || undefined, // Adicionando descrição se existir
          productType: productType as "evaluation" | "educational" | "combo",
          courseId: course_id,
        },
        cardData: {
          number: cardData.cardNumber.replace(/\D/g, ""),
          holder_name: cardData.cardHolder,
          exp_month: parseInt(expMonth),
          exp_year: parseInt(`20${expYear}`),
          cvv: cardData.cardCvv,
        },
        installments: body.installments,
        metadata: {
          ...metadata,
          product_name: dbProduct.name, // Adicionar ao metadata também
          product_description: dbProduct.description,
          productType: productType as "evaluation" | "educational" | "combo",
          courseId: course_id,
        },
        split: splitRules,
      });
    } else {
      transaction = await pagarme.createPixPayment({
        amount,
        customer: pagarmeCustomer,
        productDetails: {
          name: dbProduct.name, // Adicionando nome do produto
          description: dbProduct.description || undefined,
          productType: productType as "evaluation" | "educational" | "combo",
          courseId: course_id,
        },
        expiresIn: 3600,
        metadata: {
          ...metadata,
          product_name: dbProduct.name,
          product_description: dbProduct.description,
          productType: productType as "evaluation" | "educational" | "combo",
          courseId: course_id,
        },
        split: splitRules,
      });
    }

    console.log("[API] Transação criada na Pagar.me:", {
      id: transaction.id,
      status: transaction.status,
    });

    // Extrair o ID da transação da Pagar.me
    const pagarmeTransactionId = transaction.id;

    // 6. Criar ou atualizar customer
    console.log("[API] Processando customer...");
    const formattedDocument = customer.document.replace(/\D/g, "");

    const dbCustomer = await prisma.customer.upsert({
      where: {
        document: formattedDocument,
      },
      update: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      create: {
        name: customer.name,
        email: customer.email,
        document: formattedDocument,
        phone: customer.phone,
      },
    });

    // 7. Criar pedido - usando a estrutura correta conforme seu schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderData: any = {
      customerId: dbCustomer.id,
      status: transaction.status,
      amount,
      paymentMethod,
      pagarmeTransactionId,
      items: {
        create: {
          productId: dbProduct.id,
          quantity: 1,
          price: amount,
        },
      },
    };

    // Adicionar o cupom se existir
    if (dbCoupon) {
      orderData.couponId = dbCoupon.id;
    }

    // Se tiver afiliado, buscar o ID interno
    if (
      affiliateRef &&
      splitRules &&
      // Verifica se estamos usando a lógica de afiliados (2 recebedores)
      splitRules.length === 2 &&
      splitRules[1].recipient_id === affiliateRef
    ) {
      // Usar o affiliate que já buscamos anteriormente
      const affiliate = await prisma.affiliate.findFirst({
        where: {
          recipientId: affiliateRef,
          active: true,
        },
        select: {
          id: true, // Pegamos o ID interno do afiliado
        },
      });

      if (affiliate) {
        orderData.affiliateId = affiliate.id;
        orderData.splitAmount = (splitRules[1].amount / 100) * amount;
      } else {
        console.warn(
          "[API] Afiliado não encontrado para recipientId:",
          affiliateRef
        );
      }
    }

    // Log para debug
    console.log("Dados do pedido a ser criado:", orderData);

    // Criar o pedido
    const order = await prisma.order.create({
      data: orderData,
    });

    // 8. Retornar resposta apropriada
    if (paymentMethod === "pix") {
      const pixData = transaction.charges?.[0]?.last_transaction;

      if (!pixData?.qr_code || !pixData?.qr_code_url) {
        throw new Error("QR Code PIX não gerado");
      }

      return NextResponse.json({
        success: true,
        orderId: order.id,
        qrCode: pixData.qr_code,
        qrCodeUrl: pixData.qr_code_url,
        expiresAt: pixData.expires_at,
        status: transaction.status,
        transactionId: transaction.id,
      });
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: transaction.status,
    });
  } catch (error) {
    console.error("[API] Erro geral:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 }
    );
  }
}
