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

export interface PagarmePixInfo {
  expires_in: number;
  additional_information?: Array<{
    name: string;
    value: string;
  }>;
  split?: SplitRule[];
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
  split?: SplitRule[];
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
  status?: "active" | "inactive" | "suspended"; // Adicionando status
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
  metadata?: {
    affiliateId?: string; // Para referência ao nosso sistema
  };
}

export interface RecipientResponse {
  id: string;
  code: string;
  name: string;
  email: string;
  description?: string;
  document: string;
  type: "individual" | "corporation";
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
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
  register_information: RegisterInformation;
  gateway_recipients?: Array<{
    gateway: string;
    status: string;
    pgid: string;
    createdAt: string;
    updatedAt: string;
  }>;
  metadata?: {
    affiliateId?: string;
  };
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

interface RegisterInformation {
  email: string;
  document: string;
  type: "individual" | "corporation";
  phone_numbers: Array<{
    ddd: string;
    number: string;
    type: string;
  }>;
  company_name?: string;
  trading_name?: string;
  annual_revenue?: string;
  main_address?: {
    street: string;
    complementary?: string;
    street_number: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
    reference_point?: string;
  };
  managing_partners?: Array<{
    name: string;
    email: string;
    document: string;
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }>;
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

export interface SplitRule {
  type: "percentage";
  amount: number;
  recipient_id: string;
  options: {
    liable: boolean;
    charge_processing_fee: boolean;
    charge_remainder_fee: boolean;
  };
}

export interface PagarmePaymentWithSplit extends PagarmePayment {
  split?: SplitRule[];
}

export interface PagarmeCreateTransactionOptions {
  amount: number;
  customer: PagarmeCustomer;
  cardData?: PagarmeCreditCardInput;
  metadata?: Record<string, unknown>;
  installments?: number;
  split?: SplitRule[];
  productDetails?: ProductDetails;
}

export interface ProductDetails {
  name: string;
  description?: string;
  productType?: "evaluation" | "educational" | "combo";
}

export interface CreditCardPaymentOptions {
  amount: number;
  customer: PagarmeCustomer;
  cardData: PagarmeCreditCardInput;
  metadata?: Record<string, unknown>;
  installments?: number;
  split?: SplitRule[];
  productDetails?: ProductDetails;
}

export interface PixPaymentOptions {
  amount: number;
  customer: PagarmeCustomer;
  expiresIn?: number;
  metadata?: Record<string, unknown>;
  split?: SplitRule[];
  productDetails?: ProductDetails;
}

export interface AffiliateBankInfo {
  recipientId: string; // ID do recebedor na Pagar.me
  bank_code: string;
  branch: string;
  account: string;
  account_type: "checking" | "savings";
  holder_name: string;
  holder_document: string;
  metadata?: Record<string, unknown>;
}

export interface SplitConfig {
  rules: SplitRule[];
  amount: number;
  recipient_id: string;
}

export interface SplitResponse {
  id: string;
  amount: number;
  status: string;
  recipient_id: string;
}
