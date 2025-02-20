// app/api/recipients/route.ts
import { NextResponse } from "next/server";
import { pagarme } from "@/lib/pagarme";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Criar recebedor no Pagar.me
    const recipient = await pagarme.createRecipient(body);
    console.log("Recipient criado no Pagar.me:", recipient);

    // 2. Criar usuário no nosso sistema
    const user = await prisma.user.create({
      data: {
        email: body.email || recipient.email,
        name: body.name || recipient.name || body.company_name,
        password: "", // TODO: Implementar geração de senha
        role: "affiliate",
      },
    });
    console.log("Usuário criado:", user);

    // 3. Criar affiliate associado ao usuário com bankInfo tipado corretamente
    const affiliate = await prisma.affiliate.create({
      data: {
        userId: body.userId,
        commission: body.commission || 10,
        active: true,
        bankInfo: {
          recipient_id: recipient.id,
          account_info: {
            bank: recipient.default_bank_account.bank,
            branch: recipient.default_bank_account.branch_number,
            account: recipient.default_bank_account.account_number,
            type: recipient.default_bank_account.type,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any, // usando any temporariamente para resolver o erro de tipagem
      },
      include: {
        user: true,
      },
    });
    console.log("Affiliate criado:", affiliate);

    return NextResponse.json({
      success: true,
      recipient,
      affiliate,
    });
  } catch (error) {
    console.error("[CREATE_RECIPIENT_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create recipient",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");
    const size = searchParams.get("size");
    const status = searchParams.get("status") as
      | "active"
      | "inactive"
      | "suspended"
      | undefined;

    // 1. Buscar do Pagar.me
    const recipients = await pagarme.listRecipients({
      page: page ? parseInt(page) : undefined,
      size: size ? parseInt(size) : undefined,
      status,
    });

    // 2. Buscar dados dos affiliates correspondentes
    const formattedRecipients = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recipients.data.map(async (recipient: any) => {
        // Buscar affiliate correspondente
        const affiliate = await prisma.affiliate.findFirst({
          where: {
            bankInfo: {
              path: ["recipient_id"],
              equals: recipient.id,
            },
          },
        });

        return {
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          document: recipient.document,
          status: recipient.status,
          commission: affiliate?.commission || 10,
          bankAccount: recipient.default_bank_account
            ? {
                bank: recipient.default_bank_account.bank,
                agency: recipient.default_bank_account.branch_number,
                account: recipient.default_bank_account.account_number,
              }
            : null,
          createdAt: recipient.created_at,
        };
      })
    );

    return NextResponse.json(formattedRecipients);
  } catch (error) {
    console.error("[RECIPIENTS_LIST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to list recipients" },
      { status: 500 }
    );
  }
}
