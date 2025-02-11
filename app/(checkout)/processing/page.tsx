/* eslint-disable @typescript-eslint/no-unused-vars */
// app/(checkout)/processing/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, QrCode, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProcessingPageProps {
  searchParams: {
    orderId: string;
    qrCode: string;
    qrCodeUrl: string;
    expiresAt: string;
    status: string;
  };
}

export default function ProcessingPage({ searchParams }: ProcessingPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isChecking, setIsChecking] = useState(false);

  // Calcula o tempo restante baseado no expiresAt
  useEffect(() => {
    if (searchParams.expiresAt) {
      const calculateTimeLeft = () => {
        const expiresAt = new Date(searchParams.expiresAt).getTime();
        const now = new Date().getTime();
        const difference = expiresAt - now;
        return Math.max(0, Math.floor(difference / 1000));
      };

      setTimeLeft(calculateTimeLeft());
      const timer = setInterval(() => {
        const newTimeLeft = calculateTimeLeft();
        setTimeLeft(newTimeLeft);

        if (newTimeLeft <= 0) {
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [searchParams.expiresAt]);

  // Verifica o status do pagamento
  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(
          `/api/orders/${searchParams.orderId}/status`
        );
        const data = await response.json();

        if (data.status === "paid") {
          router.push(`/success?orderId=${searchParams.orderId}`);
        } else if (data.status === "failed" || data.status === "canceled") {
          router.push(`/error?orderId=${searchParams.orderId}`);
        }
      } catch (error) {
        console.error("Erro ao verificar status:", error);
      }
    };

    const interval = setInterval(checkPaymentStatus, 5000);
    return () => clearInterval(interval);
  }, [router, searchParams.orderId]);

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(searchParams.qrCode);
      setCopied(true);
      toast({
        description: "Chave PIX copiada com sucesso!",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Erro ao copiar chave PIX",
      });
    }
  };

  const handleRefreshStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch(
        `/api/orders/${searchParams.orderId}/status`
      );
      const data = await response.json();

      if (data.status === "paid") {
        router.push(`/success?orderId=${searchParams.orderId}`);
      } else {
        toast({
          description: "Pagamento ainda não identificado",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Erro ao verificar status",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  // Calcula a porcentagem do tempo restante
  const timeProgress = (() => {
    if (!searchParams.expiresAt) return 0;
    const total = 3600; // 1 hora em segundos
    return Math.max(0, Math.min(100, (timeLeft / total) * 100));
  })();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Pagamento via PIX</h1>
          <p className="text-sm text-muted-foreground">
            Escaneie o QR Code ou copie e cole o código no seu app
          </p>
        </div>

        <Separator />

        {/* QR Code */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border flex justify-center">
            <Image
              src={searchParams.qrCodeUrl}
              alt="QR Code PIX"
              width={200}
              height={200}
              className="mx-auto"
            />
          </div>

          {/* Código PIX */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Código PIX</label>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-muted rounded-lg text-xs break-all">
                {searchParams.qrCode}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyPix}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tempo restante</span>
            <span className="font-medium">{formatTimeLeft(timeLeft)}</span>
          </div>
          <Progress value={timeProgress} className="h-2" />
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Button
            onClick={handleRefreshStatus}
            disabled={isChecking}
            className="w-full"
          >
            {isChecking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Verificar pagamento
          </Button>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p>
              Após o pagamento, aguarde alguns instantes para a confirmação.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
