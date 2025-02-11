// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { pagarme } from "@/lib/pagarme";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product, customer, paymentMethod, cardData } = body;

    console.log("Recebido request de checkout:", {
      product,
      customer,
      paymentMethod,
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

    // 2. Formatar telefone
    const [areaCode, ...phoneNumber] = customer.phone
      .replace(/\D/g, "")
      .split("");

    // 3. Preparar customer para Pagar.me
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

    // 4. Criar transação na Pagar.me
    let transaction;
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

      const [expMonth, expYear] = cardData.cardExpiry.split("/");
      transaction = await pagarme.createCreditCardPayment({
        amount: body.totalAmount || dbProduct.prices[0].amount,
        customer: pagarmeCustomer,
        cardData: {
          number: cardData.cardNumber.replace(/\D/g, ""),
          holder_name: cardData.cardHolder,
          exp_month: parseInt(expMonth),
          exp_year: parseInt(`20${expYear}`),
          cvv: cardData.cardCvv,
        },
        installments: body.installments,
        metadata: {
          product_id: dbProduct.id,
        },
      });
    } else {
      // Pagamento PIX
      transaction = await pagarme.createPixPayment({
        amount: body.totalAmount || dbProduct.prices[0].amount,
        customer: pagarmeCustomer,
        expiresIn: 3600, // 1 hora
        metadata: {
          product_id: dbProduct.id,
        },
      });
    }

    console.log("[API] Transação criada na Pagar.me:", {
      id: transaction.id,
      status: transaction.status,
    });

    try {
      // 5. Criar ou atualizar customer
      console.log("[API] Processando customer...");
      const formattedDocument = customer.document.replace(/\D/g, "");

      const dbCustomer = await prisma.customer.upsert({
        where: {
          document: formattedDocument, // Agora usando apenas document
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

      console.log("[API] Customer processado:", {
        id: dbCustomer.id,
        document: dbCustomer.document,
      });

      // 6. Criar pedido
      console.log("[API] Criando order...");
      const order = await prisma.order.create({
        data: {
          customerId: dbCustomer.id,
          status: transaction.status,
          amount: dbProduct.prices[0].amount,
          paymentMethod,
          items: {
            create: {
              productId: dbProduct.id,
              quantity: 1,
              price: dbProduct.prices[0].amount,
            },
          },
        },
      });

      console.log("[API] Order criada:", {
        id: order.id,
        status: order.status,
      });

      // 7. Retornar resposta
      if (paymentMethod === "pix") {
        const pixData = transaction.charges?.[0]?.last_transaction;

        if (!pixData?.qr_code || !pixData?.qr_code_url) {
          throw new Error("QR Code PIX não gerado");
        }

        return NextResponse.json({
          success: true,
          orderId: order.id,
          qrCode: pixData.qr_code, // Código para copiar e colar
          qrCodeUrl: pixData.qr_code_url, // URL da imagem do QR Code
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
    } catch (dbError) {
      console.error("[API] Erro ao salvar no banco:", dbError);
      return NextResponse.json(
        {
          success: false,
          message: "Erro ao salvar os dados da transação",
        },
        { status: 500 }
      );
    }
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
