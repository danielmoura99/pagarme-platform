"use client";

// app/(dashboard)/checkout-settings/_components/color-picker.tsx
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface ColorPickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

export const ColorPicker = forwardRef<HTMLInputElement, ColorPickerProps>(
  ({ className, value, onChange, disabled, ...props }, ref) => {
    return (
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-10 w-10 rounded-md border overflow-hidden flex-shrink-0",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="h-full w-full cursor-pointer border-0"
          />
        </div>
        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn("font-mono", className)}
          {...props}
        />
      </div>
    );
  }
);

ColorPicker.displayName = "ColorPicker";
