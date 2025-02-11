// types/checkout.ts

export interface CheckoutProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images?: string[];
}

export interface CheckoutCustomer {
  name: string;
  email: string;
  document: string;
  phone: string;
}

export interface CheckoutOrder {
  id: string;
  productId: string;
  customerId: string;
  amount: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | "pending" // Aguardando pagamento
  | "processing" // Processando pagamento
  | "paid" // Pago
  | "failed" // Falhou
  | "refunded" // Reembolsado
  | "canceled"; // Cancelado

export type PaymentMethod = "credit_card" | "pix" | "boleto";

// Tipos para as requests da API
export interface CreateCheckoutRequest {
  product: {
    id: string;
    price: number;
  };
  customer: CheckoutCustomer;
}

export interface CheckoutResponse {
  orderId: string;
  checkoutUrl: string;
  qrCodeUrl?: string; // Para PIX
  boletoUrl?: string; // Para boleto
  expiresAt?: Date;
}
