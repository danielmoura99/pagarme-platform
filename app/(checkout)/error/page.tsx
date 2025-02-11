// app/(checkout)/error/page.tsx
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorMessage =
    searchParams.error || "Ocorreu um erro ao processar seu pagamento.";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Ops! Algo deu errado.
        </h1>
        <p className="text-gray-500 mb-6">{errorMessage}</p>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="font-medium text-gray-900">O que fazer agora?</h2>
            <ul className="mt-2 text-sm text-gray-500 text-left space-y-2">
              <li>• Verifique os dados do seu cartão</li>
              <li>• Tente novamente em alguns minutos</li>
              <li>• Entre em contato com seu banco</li>
              <li>• Se o problema persistir, contate nosso suporte</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/checkout">
              <Button className="w-full">Tentar novamente</Button>
            </Link>
            <Link href="/support">
              <Button variant="outline" className="w-full">
                Contatar suporte
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
