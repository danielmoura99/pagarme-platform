// app/(dashboard)/_components/date-context.tsx
"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface DateRange {
  from: Date;
  to: Date;
}

interface DateContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(1)), // Primeiro dia do mês atual
    to: new Date(), // Hoje
  });

  return (
    <DateContext.Provider value={{ dateRange, setDateRange }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error("useDateRange must be used within a DateProvider");
  }
  return context;
}
