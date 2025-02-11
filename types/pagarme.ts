// types/pagarme.ts
export type PaymentStatus =
  | "pending"
  | "processing"
  | "approved"
  | "refused"
  | "refunded"
  | "canceled"
  | "paid";

export type PaymentMethod = "credit_card" | "pix";

export interface PagarmeCustomer {
  name: string;
  email: string;
  type?: "individual" | "company";
  document: string;
  phones?: {
    mobile_phone?: {
      country_code?: string;
      area_code: string;
      number: string;
    };
  };
}

// Interface para a requisição de criação de cartão
export interface PagarmeCreditCardInput {
  number: string;
  holder_name: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
}

export interface PagarmeBillingAddress {
  line_1: string;
  zip_code: string;
  city: string;
  state: string;
  country: string;
}

export interface PagarmeCard {
  number: string;
  holder_name: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
  billing_address?: PagarmeBillingAddress;
}

export interface PagarmeCard {
  number: string;
  holder_name: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
  billing_address?: PagarmeBillingAddress;
}

export interface PagarmePixInfo {
  expires_in: number;
  additional_information?: Array<{
    name: string;
    value: string;
  }>;
}

export interface PagarmeCreditCardPayload {
  installments: number;
  statement_descriptor?: string;
  card: PagarmeCard;
}

// Interface para pagamento com cartão
export interface PagarmeCreditCardPayment {
  installments: number;
  statement_descriptor?: string;
  card: PagarmeCard;
}

export interface PagarmePayment {
  payment_method: PaymentMethod;
  credit_card?: PagarmeCreditCardPayload;
  pix?: PagarmePixInfo;
}

export interface PagarmeTransaction {
  id: string;
  code: string;
  amount: number;
  status: PaymentStatus;
  currency: string;
  created_at: string;
  updated_at: string;
  charges: Array<{
    id: string;
    status: string;
    payment_method: PaymentMethod;
    last_transaction: {
      id: string;
      qr_code: string;
      qr_code_url: string;
      expires_at: string;
      status: string;
      transaction_type: string;
      amount: number;
      additional_information?: Array<{
        name: string;
        value: string;
      }>;
    };
  }>;
  customer: PagarmeCustomer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface PagarmeCreditCard {
  card_token: string;
  installments?: number;
  capture?: boolean;
}

// Frontend types - usado apenas no componente de checkout
export interface CardTokenizationData {
  number: string;
  holder_name: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
}

// Tipos para resposta da tokenização
export interface CardTokenResponse {
  id: string;
  type: string;
  last_four_digits: string;
  brand: string;
}
