// app/(dashboard)/products/_components/order-bump-select.tsx
"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// Atualizando a interface para incluir o desconto
interface OrderBumpValue {
  productId: string;
  discount?: number;
}

interface OrderBumpSelectProps {
  availableProducts: Array<{
    id: string;
    name: string;
  }>;
  value: OrderBumpValue[];
  onChange: (value: OrderBumpValue[]) => void;
}

export function OrderBumpSelect({
  availableProducts,
  value = [],
  onChange,
}: OrderBumpSelectProps) {
  const selectedProducts = useMemo(() => {
    return value
      .map(
        (bump) =>
          availableProducts.find((p) => p.id === bump.productId)?.name || ""
      )
      .filter(Boolean);
  }, [value, availableProducts]);

  const handleValueChange = (newValueStr: string) => {
    const selectedIds = newValueStr ? newValueStr.split(",") : [];
    const newBumps = selectedIds.map((id) => ({
      productId: id,
      discount: value.find((v) => v.productId === id)?.discount || 0,
    }));
    onChange(newBumps);
  };

  const handleDiscountChange = (productId: string, discount: number) => {
    onChange(
      value.map((bump) =>
        bump.productId === productId ? { ...bump, discount } : bump
      )
    );
  };

  return (
    <div className="space-y-4">
      <FormControl>
        <Select
          value={value.map((v) => v.productId).join(",")}
          onValueChange={handleValueChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione os produtos complementares">
              {selectedProducts.length > 0
                ? `${selectedProducts.length} produtos selecionados`
                : "Selecione os produtos"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-white">
            {availableProducts.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormControl>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((bump) => {
            const product = availableProducts.find(
              (p) => p.id === bump.productId
            );
            if (!product) return null;

            return (
              <div key={bump.productId} className="flex items-center gap-4">
                <span className="flex-1">{product.name}</span>
                <div className="w-32">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="Desconto %"
                    value={bump.discount || 0}
                    onChange={(e) =>
                      handleDiscountChange(
                        bump.productId,
                        Number(e.target.value)
                      )
                    }
                    className="h-8"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
