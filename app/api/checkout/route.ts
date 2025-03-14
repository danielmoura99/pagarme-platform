// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { pagarme } from "@/lib/pagarme";
import { prisma } from "@/lib/db";
import { SplitRule } from "@/types/pagarme";

export const dynamic = "force-dynamic";

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
    } = body;

    console.log("Recebido request de checkout:", {
      product,
      customer,
      paymentMethod,
      affiliateRef,
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
      },
    });

    if (!dbProduct || dbProduct.prices[0]?.amount !== product.price) {
      return new NextResponse("Produto inválido ou preço alterado", {
        status: 400,
      });
    }

    // 2. Verificar afiliado se existir
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
            type: "percentage",
            options: {
              liable: true,
              charge_processing_fee: true,
              charge_remainder_fee: true,
            },
          },
          {
            amount: affiliate.commission,
            recipient_id: affiliate.recipientId,
            type: "percentage",
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

    const productType = dbProduct.productType || "evaluation";

    // 5. Criar transação na Pagar.me
    let transaction;
    const amount = body.totalAmount || dbProduct.prices[0].amount;

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
        },
      });

      orderBumpsInfo = {
        ids: selectedBumps,
        names: selectedBumpsData.map((bump) => bump.name),
      };
    }

    const metadata = {
      product_id: dbProduct.id,
      affiliate_id: affiliateRef || null,
      product_type: productType,
      order_bumps: orderBumpsInfo ? JSON.stringify(orderBumpsInfo) : null,
      has_order_bumps: selectedBumps && selectedBumps.length > 0 ? true : false,
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
        },
        expiresIn: 3600,
        metadata: {
          ...metadata,
          product_name: dbProduct.name,
          product_description: dbProduct.description,
          productType: productType as "evaluation" | "educational" | "combo",
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

    // 7. Criar pedido
    const orderData = {
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

    // Se tiver afiliado, buscar o ID interno
    if (affiliateRef && splitRules?.[1]) {
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
        Object.assign(orderData, {
          affiliateId: affiliate.id, // Usar o ID interno do afiliado, não o recipientId
          splitAmount: (splitRules[1].amount / 100) * amount,
        });
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
