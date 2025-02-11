// app/(checkout)/checkout/_components/order-summary.tsx
"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface OrderSummaryProps {
  product: {
    id: string;
    name: string;
    description?: string | null;
    prices: Array<{
      amount: number;
    }>;
  };
}

export function OrderSummary({ product }: OrderSummaryProps) {
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercentage: number;
  } | null>(null);
  const { toast } = useToast();

  const basePrice = product.prices[0]?.amount || 0;
  const discount = appliedCoupon
    ? Math.round((basePrice * appliedCoupon.discountPercentage) / 100)
    : 0;
  const finalPrice = basePrice - discount;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount / 100);
  };

  const applyCoupon = async () => {
    if (!couponCode) return;

    try {
      setCouponLoading(true);
      const response = await fetch(
        `/api/coupons/validate?code=${couponCode.toUpperCase()}&productId=${
          product.id
        }`
      );

      if (!response.ok) {
        throw new Error("Cupom inválido");
      }

      const coupon = await response.json();
      setAppliedCoupon(coupon);
      toast({
        title: "Cupom aplicado!",
        description: `Desconto de ${coupon.discountPercentage}% aplicado.`,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro!",
        description: "Cupom inválido ou não aplicável a este produto.",
      });
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
      setCouponCode("");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast({
      description: "Cupom removido.",
    });
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Resumo do Pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Produto */}
        <div className="space-y-4">
          <div className="flex justify-between">
            <div>
              <h3 className="font-medium">{product.name}</h3>
              {product.description && (
                <p className="text-sm text-muted-foreground">
                  {product.description}
                </p>
              )}
            </div>
            <span className="font-medium">{formatPrice(basePrice)}</span>
          </div>
        </div>

        {/* Campo de Cupom */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Código do cupom"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="uppercase"
              disabled={!!appliedCoupon || couponLoading}
            />
            <Button
              onClick={applyCoupon}
              disabled={couponLoading || !couponCode || !!appliedCoupon}
              variant="secondary"
            >
              {couponLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Aplicar"
              )}
            </Button>
          </div>

          {appliedCoupon && (
            <div className="flex items-center justify-between text-sm bg-muted p-2 rounded">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {appliedCoupon.code}
                </Badge>
                <span className="text-green-600 font-medium">
                  -{appliedCoupon.discountPercentage}%
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:text-destructive"
                onClick={removeCoupon}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Valores */}
        <div className="space-y-4">
          {appliedCoupon && (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatPrice(basePrice)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Desconto ({appliedCoupon.discountPercentage}%):</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Total</span>
            <div className="text-right">
              {appliedCoupon && (
                <span className="text-sm text-muted-foreground line-through mr-2">
                  {formatPrice(basePrice)}
                </span>
              )}
              <span className="text-2xl font-bold">
                {formatPrice(finalPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* Informações de Segurança */}
        <div className="pt-4 space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <span>🔒</span>
            Pagamento 100% seguro
          </p>
          <p className="flex items-center gap-2">
            <span>✨</span>
            Satisfação garantida
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
