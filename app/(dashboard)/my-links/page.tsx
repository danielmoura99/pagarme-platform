/* eslint-disable @typescript-eslint/no-unused-vars */
// app/(dashboard)/my-links/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CopyIcon, Link2, Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  prices: Array<{
    amount: number;
    currency: string;
  }>;
}

export default function MyLinksPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);

  // Buscar recipientId do afiliado do usuário logado
  useEffect(() => {
    const fetchAffiliateInfo = async () => {
      try {
        const response = await fetch("/api/user/affiliate");
        const data = await response.json();

        if (data.recipientId) {
          setRecipientId(data.recipientId);
        }
      } catch (error) {
        console.error("Erro ao buscar afiliado:", error);
      }
    };

    if (session?.user?.role === "affiliate") {
      fetchAffiliateInfo();
    }
  }, [session]);

  // Buscar produtos ativos
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/products?active=true");
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar os produtos",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [toast]);

  // Gerar link de afiliado
  const generateLink = (productId: string) => {
    if (!recipientId) return "";

    if (typeof window !== "undefined") {
      const baseUrl = window.location.origin;
      return `${baseUrl}/checkout?productId=${productId}&ref=${recipientId}`;
    }
    return "";
  };

  // Copiar link
  const copyLink = async (productId: string) => {
    const link = generateLink(productId);
    if (!link) {
      toast({
        variant: "destructive",
        description: "Link não disponível. Aguarde o carregamento.",
      });
      return;
    }

    setCopyingId(productId);
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Sucesso!",
        description: "Link copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Erro ao copiar link",
      });
    } finally {
      setCopyingId(null);
    }
  };

  // Formatar preço
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="w-full py-0 space-y-4">
        <div className="px-6 flex flex-col space-y-2">
          <Heading
            title="Meus Links"
            description="Gere links de afiliado para os produtos"
          />
          <Separator className="my-2" />
        </div>
        <div className="px-6 flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-0 space-y-4">
      <div className="px-6 flex flex-col space-y-2">
        <Heading
          title="Meus Links"
          description="Gere e copie links de afiliado para compartilhar"
        />
        <Separator className="my-2" />
      </div>

      <div className="px-6 space-y-4">
        {!recipientId && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800">
                ⚠️ Aguardando carregamento das informações do afiliado...
              </p>
            </CardContent>
          </Card>
        )}

        {products.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Nenhum produto disponível no momento.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5" />
                    {product.name}
                  </CardTitle>
                  {product.description && (
                    <CardDescription className="line-clamp-2">
                      {product.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                  {product.prices?.[0] && (
                    <div className="text-2xl font-bold text-primary">
                      {formatPrice(
                        product.prices[0].amount,
                        product.prices[0].currency
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600">
                      Link de Afiliado
                    </label>
                    <div className="flex items-center space-x-2">
                      <Input
                        readOnly
                        value={generateLink(product.id)}
                        className="font-mono text-xs bg-gray-50"
                        placeholder="Carregando..."
                      />
                      <Button
                        size="sm"
                        onClick={() => copyLink(product.id)}
                        disabled={copyingId === product.id || !recipientId}
                        className="shrink-0"
                      >
                        {copyingId === product.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CopyIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
