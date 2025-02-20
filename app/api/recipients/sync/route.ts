// app/api/recipients/sync/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pagarme } from "@/lib/pagarme";

async function syncAffiliates() {
  try {
    console.log("1. Iniciando sincronização de afiliados...");

    // 1. Buscar todos os recebedores ativos do Pagar.me
    const recipientsResponse = await pagarme.listRecipients({
      status: "active",
    });

    console.log(
      "2. Resposta do Pagar.me:",
      JSON.stringify(recipientsResponse, null, 2)
    );

    if (!recipientsResponse?.data) {
      throw new Error("Não foi possível obter a lista de recebedores");
    }

    // 2. Filtrar recebedor principal se necessário
    const mainRecipientId = process.env.PAGARME_MAIN_RECIPIENT_ID;
    console.log("3. ID do recebedor principal:", mainRecipientId);

    const affiliateRecipients = recipientsResponse.data.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recipient: any) => recipient.id !== mainRecipientId
    );

    console.log(
      "4. Recebedores filtrados:",
      JSON.stringify(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        affiliateRecipients.map((r: { id: any; name: any; email: any }) => ({
          id: r.id,
          name: r.name,
          email: r.email,
        })),
        null,
        2
      )
    );

    // 3. Sincronizar cada recebedor
    const results = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      affiliateRecipients.map(async (recipient: any) => {
        try {
          console.log(`5. Processando recipient: ${recipient.id}`);

          // Primeiro verifica se já existe um affiliate para este recipient_id
          // eslint-disable-next-line prefer-const
          let existingAffiliate = await prisma.affiliate.findFirst({
            where: {
              OR: [
                { recipientId: recipient.id }, // Primeiro tentar pelo novo campo
                {
                  bankInfo: {
                    path: ["recipient_id"],
                    equals: recipient.id,
                  },
                }, // Manter a busca antiga para compatibilidade
              ],
            },
            include: {
              user: true,
            },
          });

          console.log("6. Affiliate existente:", existingAffiliate);

          if (existingAffiliate) {
            console.log("7. Atualizando affiliate existente");

            const bankInfo = {
              account_info: {
                bank: recipient.default_bank_account.bank,
                branch: recipient.default_bank_account.branch_number,
                account: recipient.default_bank_account.account_number,
                type: recipient.default_bank_account.type,
                holder_name: recipient.default_bank_account.holder_name,
                holder_document: recipient.default_bank_account.holder_document,
              },
              recipient_data: {
                name: recipient.name,
                document: recipient.document,
                transfer_settings: recipient.transfer_settings,
                automatic_anticipation_settings:
                  recipient.automatic_anticipation_settings,
              },
              updated_at: new Date().toISOString(),
            };

            const updatedAffiliate = await prisma.affiliate.update({
              where: { id: existingAffiliate.id },
              data: {
                active: recipient.status === "active",
                recipientId: recipient.id, // Atualizar o recipientId
                bankInfo,
              },
            });

            console.log("8. Affiliate atualizado:", updatedAffiliate);

            return {
              recipientId: recipient.id,
              affiliateId: updatedAffiliate.id,
              action: "updated",
              email: existingAffiliate.user.email,
            };
          } else {
            console.log("9. Criando novo affiliate");

            // Gerar email único se necessário
            let uniqueEmail = recipient.email;
            let emailCounter = 1;

            while (
              await prisma.user.findUnique({ where: { email: uniqueEmail } })
            ) {
              uniqueEmail = `${recipient.email.split("@")[0]}_${emailCounter}@${
                recipient.email.split("@")[1]
              }`;
              emailCounter++;
            }

            console.log("10. Email único gerado:", uniqueEmail);

            // Criar usuário
            const userData = {
              email: uniqueEmail,
              name:
                recipient.name ||
                recipient.register_information?.company_name ||
                "Afiliado",
              password: "",
              role: "affiliate",
            };

            console.log("11. Dados do usuário:", userData);

            const user = await prisma.user.create({
              data: userData,
            });

            console.log("12. Usuário criado:", user);

            const bankInfo = {
              recipient_id: recipient.id,
              account_info: {
                bank: recipient.default_bank_account.bank,
                branch: recipient.default_bank_account.branch_number,
                account: recipient.default_bank_account.account_number,
                type: recipient.default_bank_account.type,
                holder_name: recipient.default_bank_account.holder_name,
                holder_document: recipient.default_bank_account.holder_document,
              },
              recipient_data: {
                name: recipient.name,
                document: recipient.document,
                email: recipient.email, // Mantemos o email original do Pagar.me aqui
                transfer_settings: recipient.transfer_settings,
                automatic_anticipation_settings:
                  recipient.automatic_anticipation_settings,
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            console.log("13. Dados bancários:", bankInfo);

            const newAffiliate = await prisma.affiliate.create({
              data: {
                userId: user.id,
                recipientId: recipient.id, // Adicionar o recipientId
                commission: 10,
                active: recipient.status === "active",
                bankInfo,
              },
            });

            console.log("14. Novo affiliate criado:", newAffiliate);

            return {
              recipientId: recipient.id,
              affiliateId: newAffiliate.id,
              action: "created",
              email: uniqueEmail,
              originalEmail: recipient.email,
            };
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Erro desconhecido";
          console.log(
            `Erro ao processar recipient ${recipient.id}:`,
            errorMessage
          );
          return {
            recipientId: recipient.id,
            action: "error",
            error: errorMessage,
            details: error,
          };
        }
      })
    );

    const summary = {
      total: affiliateRecipients.length,
      created: results.filter((r) => r.action === "created").length,
      updated: results.filter((r) => r.action === "updated").length,
      errors: results.filter((r) => r.action === "error").length,
      results,
    };

    console.log("15. Resumo da sincronização:", summary);

    return summary;
  } catch (error) {
    console.error("Erro na sincronização:", error);
    throw error;
  }
}

export async function GET() {
  try {
    console.log("Iniciando endpoint GET /api/recipients/sync");
    const result = await syncAffiliates();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Erro no endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        details: error,
      },
      { status: 500 }
    );
  }
}

export const POST = GET;
