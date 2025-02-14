// app/(checkout)/checkout/_components/order-bumps.tsx

"use client";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
}

interface OrderBump {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  discount?: number;
}

interface OrderBumpProps {
  mainProduct: Product;
  orderBumps: OrderBump[];
  onBumpSelect: (bumpId: string, selected: boolean) => void;
}

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount / 100);
};

export function OrderBumps({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mainProduct,
  orderBumps,
  onBumpSelect,
}: OrderBumpProps) {
  return (
    <div className="space-y-4">
      {orderBumps.map((bump) => (
        <div key={bump.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id={`bump-${bump.id}`}
              onCheckedChange={(checked) =>
                onBumpSelect(bump.id, checked as boolean)
              }
            />
            <div className="flex-1">
              <label
                htmlFor={`bump-${bump.id}`}
                className="font-medium cursor-pointer"
              >
                {bump.name}
              </label>
              {bump.description && (
                <p className="text-sm text-muted-foreground">
                  {bump.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                {bump.discount ? (
                  <>
                    <span className="text-lg font-bold">
                      {formatPrice(bump.price - bump.price * bump.discount)}
                    </span>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(bump.price)}
                    </span>
                    <Badge variant="secondary">
                      {Math.round(bump.discount * 100)}% OFF
                    </Badge>
                  </>
                ) : (
                  <span className="text-lg font-bold">
                    {formatPrice(bump.price)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
