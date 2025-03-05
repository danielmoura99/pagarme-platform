// app/(dashboard)/_components/transactions-table.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, QrCode } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "./date-context";

// Tipo para representar uma transação
interface Transaction {
  id: string;
  orderId: string;
  customer: string;
  product: string;
  paymentMethod: "credit_card" | "pix";
  status: "pending" | "paid" | "failed" | "refunded";
  date: string;
  amount: number;
}

// Componente para exibir o status da transação
function StatusBadge({ status }: { status: Transaction["status"] }) {
  const statusConfig = {
    pending: { label: "Pendente", variant: "secondary" as const },
    paid: { label: "Pago", variant: "default" as const },
    failed: { label: "Falhou", variant: "destructive" as const },
    refunded: { label: "Reembolsado", variant: "outline" as const },
  };

  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Componente para exibir o método de pagamento
function PaymentMethodIcon({
  method,
}: {
  method: Transaction["paymentMethod"];
}) {
  return method === "credit_card" ? (
    <CreditCard className="h-4 w-4" />
  ) : (
    <QrCode className="h-4 w-4" />
  );
}

export function TransactionsTable() {
  const { dateRange } = useDateRange();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true);

        const queryParams = new URLSearchParams({
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        });

        const response = await fetch(
          `/api/transactions?${queryParams.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }

        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [dateRange]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Transações Recentes</h2>
      </div>

      {loading ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5)
              .fill(0)
              .map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma transação encontrada no período selecionado.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {transaction.orderId}
                </TableCell>
                <TableCell>{transaction.customer}</TableCell>
                <TableCell
                  className="max-w-[200px] truncate"
                  title={transaction.product}
                >
                  {transaction.product}
                </TableCell>
                <TableCell>
                  <PaymentMethodIcon method={transaction.paymentMethod} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={transaction.status} />
                </TableCell>
                <TableCell>
                  {format(new Date(transaction.date), "dd MMM yyyy", {
                    locale: ptBR,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
