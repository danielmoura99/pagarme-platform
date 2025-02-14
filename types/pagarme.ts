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

/////Interface para Afiliados/recebedores
export interface BankAccount {
  bank_code: string; // Código do banco
  branch: string; // Agência
  branch_check_digit?: string; // Dígito da agência (se houver)
  account: string; // Número da conta
  account_check_digit: string; // Dígito da conta
  type: "checking" | "savings"; // Tipo de conta
  holder_name: string; // Nome do titular
  holder_type: "individual" | "corporation"; // Tipo do titular
  holder_document: string; // CPF/CNPJ do titular
}

export interface Recipient {
  name: string;
  email: string;
  description?: string;
  document: string;
  type: "individual" | "corporation";
  default_bank_account: BankAccount;
  transfer_settings?: {
    transfer_enabled: boolean;
    transfer_interval: "daily" | "weekly" | "monthly";
    transfer_day: number;
  };
  automatic_anticipation_settings?: {
    enabled: boolean;
    type: "full" | "1025" | "minimum";
    volume_percentage: number;
    delay: number;
  };
}

export interface RecipientResponse extends Recipient {
  id: string;
  code: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface PhoneNumber {
  ddd: string;
  number: string;
  type: "mobile" | "landline";
}

export interface Address {
  street: string;
  complementary?: string;
  street_number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  reference_point?: string;
}

export interface ManagingPartner {
  name: string;
  email: string;
  document: string;
  type: "individual" | "corporation";
  mother_name: string;
  birthdate: string;
  monthly_income: number;
  professional_occupation: string;
  self_declared_legal_representative: boolean;
  address: Address;
  phone_numbers: PhoneNumber[];
}

export interface RegisterInformation {
  company_name: string;
  trading_name: string;
  email: string;
  document: string;
  type: "individual" | "corporation";
  site_url?: string;
  annual_revenue: number;
  corporation_type: string;
  founding_date: string;
  main_address: Address;
  phone_numbers: PhoneNumber[];
  managing_partners: ManagingPartner[];
}

export interface BankAccount {
  holder_name: string;
  holder_type: "individual" | "corporation";
  holder_document: string;
  bank: string;
  branch_number: string;
  branch_check_digit?: string;
  account_number: string;
  account_check_digit: string;
  type: "checking" | "savings";
}

export interface TransferSettings {
  transfer_enabled: boolean;
  transfer_interval: "daily" | "weekly" | "monthly";
  transfer_day: number;
}

export interface AutomaticAnticipationSettings {
  enabled: boolean;
  type: "full" | "1025" | "minimum";
  volume_percentage: number;
  delay: number | null;
}

export interface RecipientCreateRequest {
  code: string;
  register_information: RegisterInformation;
  transfer_settings: TransferSettings;
  default_bank_account: BankAccount;
  automatic_anticipation_settings: AutomaticAnticipationSettings;
}
