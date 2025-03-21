// app/(dashboard)/_components/date-range-picker.tsx
"use client";

import * as React from "react";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: { from: Date; to: Date }) => void;
}

const presets = [
  { name: "Últimos 7 dias", value: "last7" },
  { name: "Últimos 30 dias", value: "last30" },
  { name: "Últimos 60 dias", value: "last60" },
  { name: "Últimos 90 dias", value: "last90" },
  { name: "Mês atual", value: "currentMonth" },
  { name: "Mês anterior", value: "lastMonth" },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  // Estado interno caso value não seja fornecido
  const [date, setDate] = React.useState<DateRange | undefined>(
    value || {
      from: new Date(new Date().setDate(1)), // Primeiro dia do mês atual
      to: new Date(),
    }
  );

  // Usar value se fornecido, ou o estado interno
  const selectedDate = value || date;

  const [preset, setPreset] = React.useState<string>("");

  // Estado para controlar a seleção de intervalo
  const [selectionState, setSelectionState] = React.useState<
    "start" | "end" | "complete"
  >("complete");

  // Atualizar o estado interno quando value mudar
  React.useEffect(() => {
    if (value) {
      setDate(value);
    }
  }, [value]);

  // Predefinições de intervalos de data
  const handlePresetChange = (value: string) => {
    setPreset(value);

    const today = new Date();
    let from: Date;
    let to: Date = today;

    switch (value) {
      case "last7":
        from = addDays(today, -7);
        break;
      case "last30":
        from = addDays(today, -30);
        break;
      case "last60":
        from = addDays(today, -60);
        break;
      case "last90":
        from = addDays(today, -90);
        break;
      case "lastyear":
        from = addDays(today, -365);
        break;
      case "currentMonth":
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "lastMonth":
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        return;
    }

    // Atualizar o estado interno
    setDate({ from, to });
    setSelectionState("complete");

    // Chamar o callback se fornecido
    if (onChange && from && to) {
      onChange({ from, to });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCalendarSelect = (newDate: DateRange | any) => {
    // Implementação aprimorada do seletor de intervalo
    if (!newDate?.from) {
      // Se não tiver data inicial, reseta o estado
      setDate(undefined);
      setSelectionState("start");
      if (onChange) {
        onChange({ from: new Date(), to: new Date() });
      }
      return;
    }

    // Se estivermos selecionando a data inicial ou se a data final não estiver definida
    if (selectionState === "start" || !newDate.to) {
      const updatedRange = { from: newDate.from, to: newDate.from };
      setDate(updatedRange);
      setSelectionState("end");

      // Para evitar chamadas desnecessárias com datas iguais
      if (onChange) {
        onChange(updatedRange);
      }
      return;
    }

    // Se a data final estiver definida (seleção completa)
    setDate(newDate);
    setSelectionState("complete");

    if (onChange && newDate.from && newDate.to) {
      onChange(newDate);
    }
  };

  // Função para reiniciar a seleção
  const resetSelection = () => {
    setSelectionState("start");
    setDate(undefined);
    // Não chamamos onChange aqui para evitar resetar o estado no componente pai
  };

  // Formatação mais amigável das datas
  const formattedDateRange =
    selectedDate?.from && selectedDate?.to
      ? `${format(selectedDate.from, "dd/MM/yyyy")} - ${format(selectedDate.to, "dd/MM/yyyy")}`
      : "Selecione o período";

  return (
    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px] h-9 bg-white border-muted-foreground/20">
          <SelectValue placeholder="Período pré-definido" />
        </SelectTrigger>
        <SelectContent className="bg-white">
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-between h-9 px-3 bg-white border-muted-foreground/20 w-full sm:w-auto min-w-[200px]",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <div className="flex items-center">
              <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
              <span>{formattedDateRange}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white" align="start">
          <div className="p-3 border-b">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {selectionState === "start"
                  ? "Selecione a data inicial"
                  : selectionState === "end"
                    ? "Selecione a data final"
                    : "Intervalo de datas"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetSelection}
                className="h-7 px-2 text-xs"
              >
                Reiniciar
              </Button>
            </div>
          </div>
          <Calendar
            className="bg-white"
            initialFocus
            mode="range"
            defaultMonth={selectedDate?.from}
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            locale={ptBR}
            numberOfMonths={2}
          />
          <div className="p-3 border-t text-xs text-muted-foreground">
            {selectionState === "start" &&
              "Clique para selecionar a data inicial"}
            {selectionState === "end" && "Agora selecione a data final"}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
