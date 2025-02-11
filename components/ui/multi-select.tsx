// components/ui/multi-select.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = "Selecione os itens...",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);

  const toggleOption = (value: string) => {
    const isSelected = selected.includes(value);
    if (isSelected) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex flex-wrap gap-1 truncate">
            {selectedLabels.length > 0 ? (
              selectedLabels.map((label) => (
                <Badge variant="secondary" key={label}>
                  {label}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="p-2">
          <Input
            placeholder="Pesquisar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-60">
          <div className="p-2">
            {filteredOptions.length === 0 ? (
              <p className="text-sm text-center py-4 text-muted-foreground">
                Nenhum resultado encontrado
              </p>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center space-x-2 p-2 cursor-pointer rounded-md hover:bg-accent",
                    selected.includes(option.value) && "bg-accent"
                  )}
                  onClick={() => toggleOption(option.value)}
                >
                  <div className="w-4 h-4 border rounded-sm flex items-center justify-center">
                    {selected.includes(option.value) && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  <span>{option.label}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
