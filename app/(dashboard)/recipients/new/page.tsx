// app/(dashboard)/recipients/new/page.tsx
import { RecipientForm } from "../_components/recipient-form";

export default function NewRecipientPage() {
  return (
    <div className="container mx-auto py-8">
      <RecipientForm />
    </div>
  );
}
