// app/(dashboard)/recipients/edit/[recipientId]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { pagarme } from "@/lib/pagarme";
import { RecipientForm } from "../../_components/recipient-form";

interface EditRecipientPageProps {
  params: Promise<{ recipientId: string }>;
}

async function getRecipientData(id: string) {
  try {
    console.log("Buscando dados do recipient:", id);

    // Buscar dados do Pagar.me e do nosso banco em paralelo
    const [pagarmeRecipient, affiliate] = await Promise.all([
      pagarme.getRecipient(id),
      prisma.affiliate.findFirst({
        where: {
          bankInfo: {
            path: ["recipient_id"],
            equals: id,
          },
        },
        include: {
          user: true,
        },
      }),
    ]);

    console.log("Dados do Pagar.me:", pagarmeRecipient);
    console.log("Dados do Affiliate:", affiliate);

    if (!pagarmeRecipient || !affiliate) {
      console.log("Dados não encontrados");
      return null;
    }

    // Formatar os dados para o formulário
    return {
      id,
      // Dados da empresa
      company_name: pagarmeRecipient.name || "",
      trading_name:
        pagarmeRecipient.register_information?.trading_name ||
        pagarmeRecipient.name ||
        "",
      email: pagarmeRecipient.email || "",
      document: pagarmeRecipient.document || "",
      type:
        pagarmeRecipient.type === "individual" ? "individual" : "corporation",
      annual_revenue:
        Number(pagarmeRecipient.register_information?.annual_revenue) || 0,

      // Dados bancários
      bank_holder_name:
        pagarmeRecipient.default_bank_account?.holder_name || "",
      bank_holder_document:
        pagarmeRecipient.default_bank_account?.holder_document || "",
      bank_code: pagarmeRecipient.default_bank_account?.bank || "",
      bank_branch: pagarmeRecipient.default_bank_account?.branch_number || "",
      bank_branch_digit:
        pagarmeRecipient.default_bank_account?.branch_check_digit || "",
      bank_account: pagarmeRecipient.default_bank_account?.account_number || "",
      bank_account_digit:
        pagarmeRecipient.default_bank_account?.account_check_digit || "",
      bank_account_type: (pagarmeRecipient.default_bank_account?.type ||
        "checking") as "checking" | "savings",

      // Configurações de transferência
      transfer_enabled:
        pagarmeRecipient.transfer_settings?.transfer_enabled || false,
      transfer_interval:
        (pagarmeRecipient.transfer_settings?.transfer_interval?.toLowerCase() ||
          "monthly") as "daily" | "weekly" | "monthly",
      transfer_day: pagarmeRecipient.transfer_settings?.transfer_day || 1,

      // Dados do nosso sistema
      commission: affiliate.commission || 10,
      active: affiliate.active,

      // Campos fixos
      phone_type: "mobile" as const,
      partner_type: "individual" as const,
      bank_holder_type: "individual" as const,
      anticipation_type: "full" as const,
      partner_self_declared: true,
    } as const;
  } catch (error) {
    console.error("[GET_RECIPIENT_DATA_ERROR]", error);
    return null;
  }
}

export default async function EditRecipientPage(props: EditRecipientPageProps) {
  const params = await props.params;
  if (!params.recipientId) {
    notFound();
  }

  const data = await getRecipientData(params.recipientId);

  if (!data) {
    return notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-5xl mx-auto">
        <RecipientForm initialData={data} mode="edit" />
      </div>
    </div>
  );
}
