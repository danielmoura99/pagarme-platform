// app/(checkout)/success/page.tsx
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PixelProvider } from "@/components/tracking/pixel-provider";

async function getOrderData(orderId: string) {
  if (!orderId) return null;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    return order;
  } catch (error) {
    console.error("Failed to fetch order:", error);
    return null;
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId: string }>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const resolvedSearchParams = await searchParams;
  const order = await getOrderData(resolvedSearchParams.orderId);

  // Preparar dados do evento de conversão
  const pixelEventData = order
    ? {
        content_ids: order.items.map((item) => item.productId),
        content_name: order.items[0]?.product.name,
        content_type: "product",
        value: order.amount / 100,
        currency: "BRL",
        num_items: order.items.length,
      }
    : undefined;

  return (
    <PixelProvider
      overrideProductId={order?.items[0]?.productId}
      eventData={pixelEventData}
      orderId={resolvedSearchParams.orderId}
    >
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento Confirmado!
          </h1>
          <p className="text-gray-500 mb-6">
            Seu pedido foi processado com sucesso.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h2 className="font-medium text-gray-900">Próximos passos:</h2>
              <ul className="mt-2 text-sm text-gray-500 text-left space-y-2">
                <li>• Você receberá um email para completar o cadastro</li>
                <li>• Preencha o formulário do email</li>
                <li>• Em caso de dúvidas, entre em contato com o suporte</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <Link href="https://tradershouse.com.br/mesaproprietaria/">
                <Button className="w-full">Ver mais produtos</Button>
              </Link>
              <Link href="https://api.whatsapp.com/send?phone=5562993776216">
                <Button variant="outline" className="w-full">
                  Falar com Suporte
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PixelProvider>
  );
}
