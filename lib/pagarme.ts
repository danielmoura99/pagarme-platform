/* eslint-disable @typescript-eslint/no-unused-vars */
// lib/pagarme.ts
import {
  CreditCardPaymentOptions,
  PagarmeCreditCardInput,
  PagarmeCustomer,
  PagarmePayment,
  PagarmeTransaction,
  PixPaymentOptions,
  Recipient,
  RecipientResponse,
  SplitRule,
} from "@/types/pagarme";
import crypto from "crypto";

const PAGARME_SECRET_KEY = process.env.PAGARME_SECRET_KEY;
const PAGARME_WEBHOOK_SECRET = process.env.PAGARME_WEBHOOK_SECRET;
const PAGARME_API_URL = "https://api.pagar.me/core/v5";
const PAGARME_PUBLIC_KEY = process.env.PAGARME_PUBLIC_KEY;

export class PagarmeClient {
  private headers: HeadersInit;

  constructor() {
    if (!PAGARME_SECRET_KEY || !PAGARME_PUBLIC_KEY) {
      throw new Error(
        "PAGARME_SECRET_KEY ou PAGARME_PUBLIC_KEY não configurada"
      );
    }

    this.headers = {
      Authorization: `Basic ${Buffer.from(`${PAGARME_SECRET_KEY}:`).toString(
        "base64"
      )}`,
      "Content-Type": "application/json",
    };
  }

  async createTransaction(params: {
    amount: number;
    customer: PagarmeCustomer;
    payment: PagarmePayment;
    metadata?: Record<string, unknown>;
    split?: SplitRule[];

    productDetails?: {
      name: string;
      description?: string;
      productType?: "evaluation" | "educational" | "combo";
    };
  }): Promise<PagarmeTransaction> {
    try {
      // Log das regras de split
      if (params.split) {
        console.log(
          "[Pagar.me] Regras de split:",
          JSON.stringify(params.split, null, 2)
        );
        const totalAmount = params.split.reduce(
          (sum, rule) => sum + rule.amount,
          0
        );
        console.log("[Pagar.me] Total do amount de split:", totalAmount);

        if (totalAmount !== 100) {
          console.warn(
            "[Pagar.me] Atenção: A soma dos amounts de split não é 100%"
          );
        }
      }

      const payload = {
        items: [
          {
            amount: params.amount,
            description: params.productDetails?.name,
            quantity: 1,
            code: "PROD_1",
          },
        ],
        customer: params.customer,
        payments: [
          {
            ...params.payment,
            split: params.split,
          },
        ],
        metadata: {
          ...params.metadata,
          product_name: params.productDetails?.name, // Adicionar ao metadata também
          product_description: params.productDetails?.description,
          product_type: params.productDetails?.productType,
        },
      };

      console.log(
        "[Pagar.me] Payload da transação:",
        JSON.stringify(payload, null, 2)
      );

      const response = await fetch(`${PAGARME_API_URL}/orders`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.text();

      // Primeiro vamos logar a resposta completa para debug
      console.log("[Pagar.me] Resposta bruta:", responseData);
      console.log("[Pagar.me] Status da resposta:", response.status);
      console.log(
        "[Pagar.me] Headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        // Tenta fazer o parse apenas se houver conteúdo
        let errorMessage = "Failed to create transaction";
        if (responseData) {
          try {
            const errorData = JSON.parse(responseData);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            console.error(
              "[Pagar.me] Erro ao fazer parse da resposta de erro:",
              responseData
            );
          }
        }
        throw new Error(errorMessage);
      }

      // Tenta fazer o parse apenas se houver conteúdo
      if (!responseData) {
        throw new Error("Empty response from Pagar.me");
      }

      try {
        const transaction = JSON.parse(responseData);
        console.log("[Pagar.me] Transação realizada:", {
          id: transaction.id,
          status: transaction.status,
          amount: transaction.amount,
        });
        return transaction;
      } catch (e) {
        console.error(
          "[Pagar.me] Erro ao fazer parse da resposta:",
          responseData
        );
        throw new Error("Invalid JSON response from Pagar.me");
      }
    } catch (error) {
      console.error("[Pagar.me] Erro ao criar transação:", error);
      throw error;
    }
  }

  async createPixPayment(
    params: PixPaymentOptions
  ): Promise<PagarmeTransaction> {
    console.log("[Pagar.me] Iniciando pagamento PIX");

    const transaction = await this.createTransaction({
      amount: params.amount,
      customer: params.customer,
      productDetails: {
        name: params.productDetails?.name || "Produto não especificado",
        description: params.productDetails?.description,
        productType: params.productDetails?.productType || "evaluation",
      },
      payment: {
        payment_method: "pix",
        pix: {
          expires_in: params.expiresIn || 3600,
          additional_information: [
            {
              name: "Produto",
              value: params.productDetails?.name || "Compra PayStep",
            },
          ],
        },
      },
      metadata: {
        ...params.metadata,
        product_type: params.productDetails?.productType, // Garantir que está no metadata também
      },
      split: params.split,
    });

    // Log da resposta completa
    console.log(
      "[Pagar.me] Resposta PIX completa:",
      JSON.stringify(transaction, null, 2)
    );

    // Verificar se temos os dados do PIX
    const pixData = transaction.charges?.[0]?.last_transaction;
    if (!pixData?.qr_code || !pixData?.qr_code_url) {
      throw new Error("Dados do PIX não gerados corretamente");
    }

    // Log específico dos dados do PIX
    console.log("[Pagar.me] Dados do PIX:", {
      qr_code: pixData.qr_code,
      qr_code_url: pixData.qr_code_url,
      expires_at: pixData.expires_at,
      status: pixData.status,
    });

    return transaction;
  }
  async createCreditCardPayment(
    params: CreditCardPaymentOptions
  ): Promise<PagarmeTransaction> {
    console.log("[Pagar.me] Iniciando pagamento com cartão");

    const defaultBillingAddress = {
      line_1: "Rua Teste, 123",
      zip_code: "12345678",
      city: "São Paulo",
      state: "SP",
      country: "BR",
    };

    return this.createTransaction({
      amount: params.amount,
      customer: params.customer,
      productDetails: {
        name: params.productDetails?.name || "Produto não especificado",
        description: params.productDetails?.description,
      },
      payment: {
        payment_method: "credit_card",
        credit_card: {
          installments: params.installments || 1,
          statement_descriptor: "PAYSTEP",
          card: {
            number: params.cardData.number.replace(/\s/g, ""),
            holder_name: params.cardData.holder_name,
            exp_month: params.cardData.exp_month,
            exp_year: params.cardData.exp_year,
            cvv: params.cardData.cvv,
            billing_address: defaultBillingAddress,
          },
        },
      },
      metadata: {
        ...params.metadata,
        product_type: params.productDetails?.productType, // Garantir que está no metadata também
      },
      split: params.split,
    });
  }

  // Webhook methods
  validateWebhookSignature(signature: string, payload: string): boolean {
    if (!PAGARME_WEBHOOK_SECRET) {
      throw new Error("PAGARME_WEBHOOK_SECRET não configurado");
    }

    try {
      const hmac = crypto.createHmac("sha256", PAGARME_WEBHOOK_SECRET);
      hmac.update(payload);
      const calculatedSignature = hmac.digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(calculatedSignature)
      );
    } catch (error) {
      console.error("[Pagar.me] Erro na validação do webhook:", error);
      return false;
    }
  }

  async processWebhook(headers: Headers, body: string): Promise<boolean> {
    const signature = headers.get("x-hub-signature");

    if (!signature) {
      console.error("[Pagar.me] Webhook sem assinatura");
      return false;
    }

    const isValid = this.validateWebhookSignature(signature, body);
    console.log("[Pagar.me] Webhook processado:", {
      isValid,
      signature_present: true,
    });

    return isValid;
  }

  // Criar novo recebedor
  async createRecipient(data: Recipient): Promise<RecipientResponse> {
    try {
      console.log(
        "[Pagar.me] Creating recipient:",
        JSON.stringify(data, null, 2)
      );

      const response = await fetch(`${PAGARME_API_URL}/recipients`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(data),
      });

      const responseData = await response.text();
      console.log("[Pagar.me] Resposta bruta:", responseData);
      console.log("[Pagar.me] Status da resposta:", response.status);
      console.log(
        "[Pagar.me] Headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        let errorMessage = "Failed to create recipient";
        if (responseData) {
          try {
            const errorData = JSON.parse(responseData);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            console.error(
              "[Pagar.me] Erro ao fazer parse da resposta de erro:",
              responseData
            );
          }
        }
        throw new Error(errorMessage);
      }

      if (!responseData) {
        throw new Error("Empty response from Pagar.me");
      }

      return JSON.parse(responseData);
    } catch (error) {
      console.error("[Pagar.me] Erro ao criar recebedor:", error);
      throw error;
    }
  }

  //lista os recebedores/ afiliados
  async listRecipients(params?: {
    page?: number;
    size?: number;
    status?: "active" | "inactive" | "suspended";
  }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.size) queryParams.append("size", params.size.toString());
      if (params?.status) queryParams.append("status", params.status);

      const response = await fetch(
        `${PAGARME_API_URL}/recipients?${queryParams.toString()}`,
        {
          headers: this.headers,
        }
      );

      const responseData = await response.text();
      //console.log("[Pagar.me] Resposta listagem de recebedores:", responseData);

      if (!response.ok) {
        throw new Error("Failed to list recipients");
      }

      return JSON.parse(responseData);
    } catch (error) {
      //console.error("[Pagar.me] Erro ao listar recebedores:", error);
      throw error;
    }
  }

  // Obter recebedor específico
  async getRecipient(recipientId: string): Promise<RecipientResponse> {
    try {
      const response = await fetch(
        `${PAGARME_API_URL}/recipients/${recipientId}`,
        {
          headers: this.headers,
        }
      );

      const responseData = await response.text();
      //console.log("[Pagar.me] Resposta recebedor:", responseData);

      if (!response.ok) {
        throw new Error("Failed to get recipient");
      }

      return JSON.parse(responseData);
    } catch (error) {
      console.error("[Pagar.me] Erro ao buscar recebedor:", error);
      throw error;
    }
  }

  // Atualizar recebedor
  async updateRecipient(
    recipientId: string,
    data: Partial<Recipient>
  ): Promise<RecipientResponse> {
    try {
      const response = await fetch(
        `${PAGARME_API_URL}/recipients/${recipientId}`,
        {
          method: "PUT",
          headers: this.headers,
          body: JSON.stringify(data),
        }
      );

      const responseData = await response.text();
      // console.log("[Pagar.me] Resposta atualização:", responseData);

      if (!response.ok) {
        throw new Error("Failed to update recipient");
      }

      return JSON.parse(responseData);
    } catch (error) {
      console.error("[Pagar.me] Erro ao atualizar recebedor:", error);
      throw error;
    }
  }
}

export const pagarme = new PagarmeClient();
