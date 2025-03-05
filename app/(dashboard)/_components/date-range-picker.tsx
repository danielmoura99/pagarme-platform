// app/(dashboard)/_components/date-range-picker.tsx
"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
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

  // Handler para quando o usuário seleciona uma data no calendário
  // Handler para quando o usuário clica em uma data no calendário
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

  return (
    <div className="flex items-center gap-2">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px] h-8">
          <SelectValue placeholder="Selecione um período" />
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="last7">Últimos 7 dias</SelectItem>
          <SelectItem value="last30">Últimos 30 dias</SelectItem>
          <SelectItem value="last60">Últimos 60 dias</SelectItem>
          <SelectItem value="last90">Últimos 90 dias</SelectItem>
          <SelectItem value="lastyear">Último ano</SelectItem>
          <SelectItem value="currentMonth">Mês atual</SelectItem>
          <SelectItem value="lastMonth">Mês anterior</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal h-8",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate?.from ? (
              selectedDate.to ? (
                <>
                  {format(selectedDate.from, "dd/MM/yyyy")} -{" "}
                  {format(selectedDate.to, "dd/MM/yyyy")}
                </>
              ) : (
                format(selectedDate.from, "dd/MM/yyyy")
              )
            ) : (
              <span>Selecione uma data</span>
            )}
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
