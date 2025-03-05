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

    // Chamar o callback se fornecido
    if (onChange && from && to) {
      onChange({ from, to });
    }
  };

  // Handler para quando o usuário seleciona uma data no calendário
  const handleCalendarSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);

    // Chamar o callback se fornecido e se ambas as datas estiverem definidas
    if (onChange && newDate?.from && newDate?.to) {
      onChange({ from: newDate.from, to: newDate.to });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px] h-8">
          <SelectValue placeholder="Selecione um período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="last7">Últimos 7 dias</SelectItem>
          <SelectItem value="last30">Últimos 30 dias</SelectItem>
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
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selectedDate?.from}
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            locale={ptBR}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
