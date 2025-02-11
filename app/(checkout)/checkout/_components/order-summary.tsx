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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateInstallments } from "../../_utils/installments";

interface OrderSummaryProps {
  product: {
    id: string;
    name: string;
    description?: string | null;
    prices: Array<{
      amount: number;
    }>;
  };
  onInstallmentChange?: (installments: number, totalAmount: number) => void;
  paymentMethod: "credit_card" | "pix";
}

export function OrderSummary({
  product,
  onInstallmentChange,
  paymentMethod,
}: OrderSummaryProps) {
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(1);
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

  // Calcula as opções de parcelamento com o preço após desconto
  const installmentOptions = calculateInstallments(finalPrice / 100);
  const selectedOption = installmentOptions[selectedInstallment - 1];

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount / 100);
  };

  const handleInstallmentChange = (value: string) => {
    const newInstallment = Number(value);
    setSelectedInstallment(newInstallment);

    const newOption = installmentOptions[newInstallment - 1];
    onInstallmentChange?.(newInstallment, Math.round(newOption.total * 100));
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

        {/* Opções de Parcelamento */}
        {paymentMethod === "credit_card" && (
          <>
            <Separator />
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Opções de Parcelamento
              </label>
              <Select
                value={String(selectedInstallment)}
                onValueChange={handleInstallmentChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o número de parcelas" />
                </SelectTrigger>
                <SelectContent>
                  {installmentOptions.map((option) => (
                    <SelectItem
                      key={option.number}
                      value={String(option.number)}
                      className="flex justify-between"
                    >
                      <span>
                        {option.number}x de {formatPrice(option.amount * 100)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/*{selectedInstallment > 1 && (
            <div className="text-sm bg-muted/50 rounded p-2">
              <p className="flex justify-between">
                <span>Total parcelado:</span>
                <span className="font-medium">
                  {formatPrice(selectedOption.total * 100)}
                </span>
              </p>
               <p className="text-xs text-muted-foreground mt-1">
                Taxa de juros: {selectedOption.interestRate}% ao mês
              </p>
            </div>
          )}*/}
            </div>
          </>
        )}
        <Separator />

        {/* Valores */}
        <div className="space-y-4">
          {(appliedCoupon || selectedInstallment > 1) && (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatPrice(basePrice)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto ({appliedCoupon.discountPercentage}%):</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              {/*  {selectedInstallment > 1 && (
                <div className="flex justify-between text-amber-600">
                  <span>Juros ({selectedOption.interestRate}% a.m.):</span>
                  <span>
                    +{formatPrice(selectedOption.total * 100 - finalPrice)}
                  </span>
                </div>
              )}*/}
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Total</span>
            <div className="text-right">
              {(appliedCoupon || selectedInstallment > 1) && (
                <span className="text-sm text-muted-foreground line-through mr-2">
                  {formatPrice(basePrice)}
                </span>
              )}
              <span className="text-2xl font-bold">
                {formatPrice(basePrice - discount)}
              </span>
            </div>
          </div>

          {selectedInstallment > 1 && (
            <p className="text-sm text-center text-muted-foreground">
              Em {selectedInstallment}x de{" "}
              {formatPrice(selectedOption.amount * 100)}
            </p>
          )}
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
