// components/ui/date-time-picker.tsx
"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
//import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateTimePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );

  // Gerar opções de hora e minuto
  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );
  const minutes = ["00", "15", "30", "45"];

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const newDateTime = selectedDate ? new Date(selectedDate) : new Date();
      newDateTime.setFullYear(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      setSelectedDate(newDateTime);
      onChange?.(newDateTime);
    }
  };

  const handleTimeChange = (type: "hour" | "minute", value: string) => {
    if (!selectedDate) {
      const newDate = new Date();
      if (type === "hour") newDate.setHours(parseInt(value), 0);
      if (type === "minute") newDate.setMinutes(parseInt(value));
      setSelectedDate(newDate);
      onChange?.(newDate);
    } else {
      const newDate = new Date(selectedDate);
      if (type === "hour") newDate.setHours(parseInt(value));
      if (type === "minute") newDate.setMinutes(parseInt(value));
      setSelectedDate(newDate);
      onChange?.(newDate);
    }
  };

  const handleClear = () => {
    setSelectedDate(undefined);
    onChange?.(null);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal h-9",
            !selectedDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, "PPp", { locale: ptBR })
          ) : (
            <span>Selecione a data e hora</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 border-b">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            locale={ptBR}
            initialFocus
          />
          <div className="flex gap-2 mt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedDate?.getHours().toString().padStart(2, "0")}
                onValueChange={(value) => handleTimeChange("hour", value)}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder="Hora" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>:</span>
              <Select
                value={selectedDate?.getMinutes().toString().padStart(2, "0")}
                onValueChange={(value) => handleTimeChange("minute", value)}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={handleClear}
          >
            Limpar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
