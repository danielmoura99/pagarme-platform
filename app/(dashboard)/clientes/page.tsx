// app/(dashboard)/clientes/page.tsx
import { ClientsClient } from "./_components/client";
import { DateProvider } from "../_components/date-context";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  return (
    <DateProvider>
      <div className="w-full py-0 space-y-4">
        <div className="px-6">
          <ClientsClient />
        </div>
      </div>
    </DateProvider>
  );
}