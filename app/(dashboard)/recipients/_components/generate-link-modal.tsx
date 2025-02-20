/* eslint-disable @typescript-eslint/no-unused-vars */
// app/(dashboard)/recipients/_components/generated-link-modal.tsx
import { useState, useEffect } from "react";
import { Check, CopyIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface Product {
  id: string;
  name: string;
  active: boolean;
}

interface GenerateLinkModalProps {
  affiliateId: string;
  trigger?: React.ReactNode;
}

export function GenerateLinkModal({
  affiliateId,
  trigger,
}: GenerateLinkModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const { toast } = useToast();

  // Buscar produtos ativos
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products?active=true");
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar os produtos",
        });
      }
    };

    fetchProducts();
  }, [toast]);

  // Gerar link de afiliado
  const generateLink = () => {
    if (!selectedProduct) return "";

    if (typeof window !== "undefined") {
      const baseUrl = window.location.origin;
      return `${baseUrl}/checkout?productId=${selectedProduct}&ref=${affiliateId}`;
    }
    return "";
  };

  // Copiar link
  const copyLink = async () => {
    const link = generateLink();
    if (!link) return;

    setCopying(true);
    try {
      await navigator.clipboard.writeText(link);
      toast({
        description: "Link copiado com sucesso!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Erro ao copiar link",
      });
    } finally {
      setCopying(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Gerar Link</Button>}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Link de Afiliado</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Selecione o Produto</label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Link de Afiliado</label>
              <div className="flex items-center space-x-2">
                <Input
                  readOnly
                  value={generateLink()}
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  onClick={copyLink}
                  disabled={copying || !selectedProduct}
                >
                  {copying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GenerateLinkModal;
