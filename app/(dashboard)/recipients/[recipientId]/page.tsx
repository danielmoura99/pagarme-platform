// app/(dashboard)/recipients/[recipientId]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { pagarme } from "@/lib/pagarme";
import { RecipientForm } from "../_components/recipient-form";

interface PageProps {
  params: Promise<{ recipientId: string }>;
}

function ensureRecipientType(type: string): "individual" | "corporation" {
  return type === "individual" ? "individual" : "corporation";
}

async function getRecipientData(recipientId: string) {
  try {
    const [pagarmeRecipient, affiliate] = await Promise.all([
      pagarme.getRecipient(recipientId),
      prisma.affiliate.findFirst({
        where: {
          bankInfo: {
            path: ["recipientId"],
            equals: recipientId,
          },
        },
        include: {
          user: true,
        },
      }),
    ]);

    if (!pagarmeRecipient || !affiliate) {
      return null;
    }

    // Garantindo que o tipo está correto
    const type = ensureRecipientType(pagarmeRecipient.type);

    return {
      id: recipientId,
      // Dados da empresa
      company_name: pagarmeRecipient.name || "",
      trading_name: pagarmeRecipient.name || "",
      email: pagarmeRecipient.email || "",
      document: pagarmeRecipient.document || "",
      type,
      //annual_revenue: pagarmeRecipient.annual_revenue || 0,

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
      transfer_interval: (pagarmeRecipient.transfer_settings
        ?.transfer_interval || "monthly") as "daily" | "weekly" | "monthly",
      transfer_day: pagarmeRecipient.transfer_settings?.transfer_day || 1,

      // Dados do nosso sistema
      commission: affiliate.commission || 10,
      active: affiliate.active,

      // Campos com valores fixos
      bank_holder_type: "individual" as const,
      partner_type: "individual" as const,
      phone_type: "mobile" as const,
      anticipation_type: "full" as const,
      partner_self_declared: true,
    };
  } catch (error) {
    console.error("[GET_RECIPIENT_ERROR]", error);
    return null;
  }
}

export default async function EditRecipientPage({ params }: PageProps) {
  const resolvedParams = await params;
  const data = await getRecipientData(resolvedParams.recipientId);

  if (!data) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <RecipientForm initialData={data} />
    </div>
  );
}
