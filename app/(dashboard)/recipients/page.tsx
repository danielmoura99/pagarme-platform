// app/(dashboard)/recipients/page.tsx
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { pagarme } from "@/lib/pagarme";
import { RecipientClient } from "./_components/client";

export default async function RecipientsPage() {
  try {
    const recipients = await pagarme.listRecipients({
      status: "active",
      size: 100,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedRecipients = recipients.data.map((recipient: any) => ({
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      document: recipient.document,
      status: recipient.status,
      bankAccount: recipient.default_bank_account
        ? {
            bank: recipient.default_bank_account.bank,
            agency: recipient.default_bank_account.branch_number,
            account: recipient.default_bank_account.account_number,
          }
        : null,
      createdAt: format(new Date(recipient.created_at), "PPp", {
        locale: ptBR,
      }),
    }));

    return (
      <div className="container mx-12 py-8">
        <div className="flex-1 space-y-4">
          <RecipientClient data={formattedRecipients} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Erro ao carregar recebedores:", error);
    return (
      <div className="container mx-3 py-8">
        <div className="text-center">
          <p className="text-red-500">
            Erro ao carregar recebedores. Por favor, tente novamente.
          </p>
        </div>
      </div>
    );
  }
}
