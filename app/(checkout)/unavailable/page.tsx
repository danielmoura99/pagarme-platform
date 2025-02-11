// app/(checkout)/unavailable/page.tsx
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function UnavailablePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Produto Indisponível
          </h1>
          <p className="text-gray-500">
            Desculpe, mas o produto que você está tentando acessar não está mais
            disponível para compra no momento.
          </p>
        </div>

        <Link
          href="https://tradershouse.com.br/mesaproprietaria/"
          className="block"
        >
          <Button className="w-full">Acesse os produtos ativos</Button>
        </Link>
      </Card>
    </div>
  );
}
