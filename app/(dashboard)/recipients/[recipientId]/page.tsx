// app/(dashboard)/recipients/[recipientId]/page.tsx
import { notFound } from "next/navigation";
import { RecipientForm } from "../_components/recipient-form";
import { pagarme } from "@/lib/pagarme";

interface PageProps {
  params: { recipientId: string };
}

interface RecipientFormData {
  id: string;
  name: string;
  email: string;
  document: string;
  commission: number;
  active: boolean;
  bank_code: string;
  branch: string;
  account: string;
  account_type: "checking" | "savings";
  holder_name: string;
  holder_document: string;
}

async function getRecipientData(id: string): Promise<RecipientFormData | null> {
  try {
    const recipient = await pagarme.getRecipient(id);

    return {
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      document: recipient.document,
      commission: 10,
      active: recipient.status === "active",
      bank_code: recipient.default_bank_account.bank_code,
      branch: recipient.default_bank_account.branch,
      account: recipient.default_bank_account.account,
      account_type: recipient.default_bank_account.type,
      holder_name: recipient.default_bank_account.holder_name,
      holder_document: recipient.default_bank_account.holder_document,
    };
  } catch {
    return null;
  }
}

export default async function EditRecipientPage({ params }: PageProps) {
  const recipientData = await getRecipientData(params.recipientId);

  if (!recipientData) {
    return notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <RecipientForm initialData={recipientData} />
    </div>
  );
}
