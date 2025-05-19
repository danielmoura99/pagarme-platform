/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { pagarme } from "@/lib/pagarme";
import { prisma } from "@/lib/db";
import { SplitRule } from "@/types/pagarme";

export const dynamic = "force-dynamic";

// ✅ MAPEAMENTO DE ERROS DA PAGAR.ME PARA MENSAGENS EM PORTUGUÊS
const ERROR_MESSAGES_MAP: Record<string, string> = {
  // Erros de cartão
  "Card expired.": "Data de vencimento do cartão expirado",
  "Invalid card number.": "Número do cartão inválido",
  "Invalid CVV.": "Código de segurança (CVV) inválido",
  "Insufficient funds.": "Cartão sem limite disponível",
  "Card blocked.": "Cartão bloqueado",
  "Invalid security code.": "Código de segurança inválido",
  "Invalid expiration date.": "Data de vencimento inválida",

  // Erros de customer
  "Invalid CPF.": "CPF inválido",
  "Invalid CNPJ.": "CNPJ inválido",
  "Invalid email.": "Email inválido",
  "Invalid phone number.": "Número de telefone inválido",

  // Erros gerais
  "The request is invalid.": "Dados inválidos",
  "Invalid payment method.": "Método de pagamento inválido",
  "Amount must be greater than zero.": "Valor deve ser maior que zero",

  // Erros de PIX
  "PIX expired.": "PIX expirado",
  "Invalid PIX key.": "Chave PIX inválida",
};

// ✅ FUNÇÃO PARA EXTRAIR E TRADUZIR ERROS DE VALIDAÇÃO (CORRIGIDA)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAndTranslateValidationErrors(errorResponse: any): {
  friendlyMessage: string;
  technicalDetails: string[];
  errorCode: string;
} {
  let friendlyMessage = "Erro na validação dos dados";
  const technicalDetails: string[] = [];
  let errorCode = "VALIDATION_ERROR";

  console.log(
    "[EXTRACT_ERRORS] Input:",
    JSON.stringify(errorResponse, null, 2)
  );

  if (errorResponse.errors) {
    // Extrair todos os erros do objeto errors
    for (const [field, messages] of Object.entries(errorResponse.errors)) {
      if (Array.isArray(messages)) {
        messages.forEach((message: string) => {
          technicalDetails.push(`${field}: ${message}`);

          console.log("[EXTRACT_ERRORS] Processing message:", message);

          // Buscar tradução da mensagem
          const translatedMessage = ERROR_MESSAGES_MAP[message];
          if (translatedMessage) {
            console.log(
              "[EXTRACT_ERRORS] Found translation:",
              translatedMessage
            );
            friendlyMessage = translatedMessage;
          }
        });
      }
    }

    // ✅ VERIFICAÇÃO MELHORADA DE TIPOS DE ERRO
    const allMessages = technicalDetails.join(" ").toLowerCase();

    if (allMessages.includes("card expired")) {
      errorCode = "CARD_EXPIRED";
      friendlyMessage = "Data de vencimento do cartão expirado";
    } else if (allMessages.includes("invalid card number")) {
      errorCode = "INVALID_CARD_NUMBER";
      friendlyMessage = "Número do cartão inválido";
    } else if (
      allMessages.includes("invalid cvv") ||
      allMessages.includes("invalid security code")
    ) {
      errorCode = "INVALID_CVV";
      friendlyMessage = "Código de segurança (CVV) inválido";
    } else if (allMessages.includes("insufficient funds")) {
      errorCode = "INSUFFICIENT_FUNDS";
      friendlyMessage = "Cartão sem limite disponível";
    } else if (allMessages.includes("invalid cpf")) {
      errorCode = "INVALID_CPF";
      friendlyMessage = "CPF inválido";
    } else if (allMessages.includes("card")) {
      errorCode = "CARD_ERROR";
      friendlyMessage = "Erro nos dados do cartão";
    }

    // Se temos múltiplos erros, usar uma mensagem genérica
    if (technicalDetails.length > 1) {
      friendlyMessage = "Verifique os dados informados e tente novamente";
    }
  }

  // ✅ FALLBACK PARA MENSAGEM PRINCIPAL
  if (
    errorResponse.message &&
    friendlyMessage === "Erro na validação dos dados"
  ) {
    const translatedMain = ERROR_MESSAGES_MAP[errorResponse.message];
    if (translatedMain) {
      friendlyMessage = translatedMain;
    } else if (errorResponse.message === "The request is invalid.") {
      // Se não conseguiu traduzir especificamente mas é "The request is invalid."
      friendlyMessage = "Os dados informados são inválidos";
    }
  }

  const result = {
    friendlyMessage,
    technicalDetails,
    errorCode,
  };

  console.log("[EXTRACT_ERRORS] Result:", result);

  return result;
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
      checkoutId,
    } = body;

    // Verificar se já existe uma transação com este checkoutId
    if (checkoutId) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          checkoutId,
          createdAt: {
            // Buscar apenas nas últimas 2 horas
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
        },
      });

      if (existingOrder) {
        console.log(
          `[CHECKOUT] Tentativa duplicada detectada. checkoutId: ${checkoutId}, orderId: ${existingOrder.id}`
        );

        // Retornar a mesma resposta que retornaríamos no fluxo normal
        if (paymentMethod === "pix") {
          // Se tiver os dados do PIX na resposta da Pagar.me, extraí-los
          // Fazer parse do pagarmeResponse se for uma string
          let parsedResponse;
          try {
            parsedResponse =
              typeof existingOrder.pagarmeResponse === "string"
                ? JSON.parse(existingOrder.pagarmeResponse)
                : existingOrder.pagarmeResponse;
          } catch (e) {
            console.error(
              "[CHECKOUT] Erro ao fazer parse do pagarmeResponse:",
              e
            );
            parsedResponse = {};
          }

          const pixData = parsedResponse?.charges?.[0]?.last_transaction;

          return NextResponse.json({
            success: true,
            orderId: existingOrder.id,
            isDuplicate: true,
            qrCode: pixData?.qr_code || "",
            qrCodeUrl: pixData?.qr_code_url || "",
            expiresAt: pixData?.expires_at || new Date().toISOString(),
            status: existingOrder.status,
          });
        }

        return NextResponse.json({
          success: true,
          orderId: existingOrder.id,
          status: existingOrder.status,
          isDuplicate: true,
        });
      }
    } else {
      console.warn(
        "[CHECKOUT] Requisição sem checkoutId, continuando sem proteção de idempotência"
      );
    }

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

    const productType = dbProduct.productType;
    const course_id = dbProduct.courseId || "vazio";

    // 5. Criar transação na Pagar.me
    let transaction: any = null;
    let pagarmeResponse = null;
    const amount = body.totalAmount || dbProduct.prices[0].amount;

    let orderBumpsInfo = null;
    if (selectedBumps && selectedBumps.length > 0) {
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

    // ✅ TRY-CATCH PARA CAPTURAR ERROS DA PAGAR.ME
    try {
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
            name: dbProduct.name,
            description: dbProduct.description || undefined,
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
            product_name: dbProduct.name,
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
            name: dbProduct.name,
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

      pagarmeResponse = transaction;

      console.log("[API] Transação criada na Pagar.me:", {
        id: transaction.id,
        status: transaction.status,
      });
    } catch (pagarmeError) {
      console.error("[API] Erro na Pagar.me:", pagarmeError);

      // ✅ EXTRAIR INFORMAÇÕES ÚTEIS DO ERRO COM MAIS DEBUG
      let failureReason = "Erro interno do gateway";
      let failureCode = "GATEWAY_ERROR";
      let pagarmeErrorResponse = null;
      let isValidationError = false;

      if (pagarmeError instanceof Error) {
        failureReason = pagarmeError.message;

        // ✅ LOG PARA DEBUG
        console.log("[API] Tipo do erro:", typeof pagarmeError);
        console.log("[API] Propriedades do erro:", Object.keys(pagarmeError));

        // ✅ VERIFICAR SE É ERRO DE VALIDAÇÃO (estrutura diferente)
        if ("response" in pagarmeError && pagarmeError.response) {
          pagarmeErrorResponse = (pagarmeError.response as any).data;

          console.log(
            "[API] Response data:",
            JSON.stringify(pagarmeErrorResponse, null, 2)
          );

          // ✅ CHECAR SE É ERRO DE VALIDAÇÃO DA PAGAR.ME
          // Verifica both 'errors' object AND 'message' = "The request is invalid."
          if (
            pagarmeErrorResponse &&
            ((pagarmeErrorResponse.errors &&
              typeof pagarmeErrorResponse.errors === "object") ||
              (pagarmeErrorResponse.message === "The request is invalid." &&
                pagarmeErrorResponse.errors))
          ) {
            isValidationError = true;

            console.log("[API] Detectado como erro de validação");

            // ✅ USAR SISTEMA DE TRADUÇÃO DE ERROS
            const translatedError =
              extractAndTranslateValidationErrors(pagarmeErrorResponse);

            failureReason = translatedError.friendlyMessage;
            failureCode = translatedError.errorCode;

            console.log("[API] Erro de validação traduzido:", {
              original: pagarmeErrorResponse,
              translated: translatedError,
            });

            // ✅ RETORNAR ERRO DE VALIDAÇÃO SEM CRIAR PEDIDO
            return NextResponse.json(
              {
                success: false,
                message: failureReason,
                failureCode,
                errorType: "validation",
                technicalDetails: translatedError.technicalDetails,
              },
              { status: 400 }
            );
          }
          // ✅ OUTROS TIPOS DE ERRO
          else {
            console.log("[API] Erro não reconhecido como validação");
            const responseData = pagarmeErrorResponse;
            if (responseData) {
              if (responseData.message) {
                const translatedMessage =
                  ERROR_MESSAGES_MAP[responseData.message];
                failureReason = translatedMessage || responseData.message;
              }
              if (responseData.type) {
                failureCode = responseData.type;
              }
            }
          }
        }
        // ✅ SE NÃO TEM RESPONSE, PODE SER UM ERRO DIRETO
        else {
          console.log(
            "[API] Erro sem response, tentando extrair dados do erro direto"
          );

          // Tentar extrair código específico da mensagem se não tiver response
          const codeMatch = pagarmeError.message.match(/code[:\s]+(\w+)/i);
          if (codeMatch) {
            failureCode = codeMatch[1];
          }

          // Verificar se a mensagem contém indicações de erro de validação
          if (pagarmeError.message.includes("The request is invalid")) {
            // Se o erro em si contém "The request is invalid", é provável que seja validação
            // mas sem mais estrutura para extrair detalhes
            failureReason = "Dados inválidos - verifique os dados do cartão";
            failureCode = "VALIDATION_ERROR";
            isValidationError = true;

            return NextResponse.json(
              {
                success: false,
                message: failureReason,
                failureCode,
                errorType: "validation",
              },
              { status: 400 }
            );
          }
        }
      }

      console.log("[API] Resultado final do erro:", {
        isValidationError,
        failureReason,
        failureCode,
      });

      // ✅ SE NÃO É ERRO DE VALIDAÇÃO, CRIAR PEDIDO COM FALHA
      if (!isValidationError) {
        // Criar customer
        const formattedDocument = customer.document.replace(/\D/g, "");
        const dbCustomer = await prisma.customer.upsert({
          where: { document: formattedDocument },
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

        // Criar pedido com falha
        const failedOrderData: any = {
          customerId: dbCustomer.id,
          status: "failed",
          amount,
          paymentMethod: paymentMethod as string,
          pagarmeTransactionId: null,
          failureReason,
          failureCode,
          pagarmeResponse:
            pagarmeErrorResponse || JSON.parse(JSON.stringify(pagarmeError)),
          attempts: 1,
          lastAttemptAt: new Date(),
          items: {
            create: {
              productId: dbProduct.id,
              quantity: 1,
              price: amount,
            },
          },
        };

        if (dbCoupon) {
          failedOrderData.couponId = dbCoupon.id;
        }

        if (affiliateRef && splitRules?.[1]) {
          const affiliate = await prisma.affiliate.findFirst({
            where: { recipientId: affiliateRef, active: true },
            select: { id: true },
          });

          if (affiliate) {
            failedOrderData.affiliateId = affiliate.id;
            failedOrderData.splitAmount = (splitRules[1].amount / 100) * amount;
          }
        }

        const failedOrder = await prisma.order.create({
          data: failedOrderData,
        });

        return NextResponse.json(
          {
            success: false,
            orderId: failedOrder.id,
            status: "failed",
            message: failureReason,
            failureCode,
            errorType: "transaction",
          },
          { status: 400 }
        );
      }
    }

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

    // 7. Criar pedido COM INFORMAÇÕES COMPLETAS
    const orderData: any = {
      customerId: dbCustomer.id,
      status: transaction.status as string,
      amount,
      paymentMethod: paymentMethod as string,
      pagarmeTransactionId,
      checkoutId,
      pagarmeResponse: JSON.parse(JSON.stringify(pagarmeResponse)),
      attempts: 1,
      lastAttemptAt: new Date(),
      items: {
        create: {
          productId: dbProduct.id,
          quantity: 1,
          price: amount,
        },
      },
    };

    if (dbCoupon) {
      orderData.couponId = dbCoupon.id;
    }

    if (affiliateRef && splitRules?.[1]) {
      const affiliate = await prisma.affiliate.findFirst({
        where: { recipientId: affiliateRef, active: true },
        select: { id: true },
      });

      if (affiliate) {
        orderData.affiliateId = affiliate.id;
        orderData.splitAmount = (splitRules[1].amount / 100) * amount;
      }
    }

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
