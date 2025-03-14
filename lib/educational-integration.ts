// lib/educational-integration.ts
// Módulo para gerenciar integração com o Client Portal (sistema educacional)

interface EducationalAccessRequest {
  accessId: string;
  courseId: string;
  customerName: string;
  customerEmail: string;
  customerDocument: string;
}

interface ClientPortalResponse {
  success: boolean;
  userId?: string;
  message?: string;
  error?: string;
}

/**
 * Processa a liberação de acesso a um produto educacional no client-portal
 */
export async function processEducationalAccess(
  request: EducationalAccessRequest
): Promise<boolean> {
  try {
    console.log(
      `[EDUCATIONAL_ACCESS] Iniciando liberação de acesso: ${JSON.stringify(request)}`
    );

    // Verificar se as configurações da API estão disponíveis
    const apiUrl = process.env.CLIENT_PORTAL_API_URL;
    const apiKey = process.env.CLIENT_PORTAL_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error("Configurações da API do client-portal não encontradas");
    }

    // Preparar payload para a API
    const payload = {
      accessId: request.accessId,
      courseId: request.courseId,
      user: {
        name: request.customerName,
        email: request.customerEmail,
        document: request.customerDocument,
      },
    };

    // Enviar requisição para o client-portal
    const response = await fetch(`${apiUrl}/api/educational/access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    // Processar resposta
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Erro ao liberar acesso: ${response.status} - ${errorText}`
      );
    }

    const data: ClientPortalResponse = await response.json();

    if (!data.success) {
      throw new Error(
        `Liberação de acesso falhou: ${data.error || data.message || "Erro desconhecido"}`
      );
    }

    // Atualizar status do acesso no banco de dados local
    await updateAccessStatus(request.accessId, "active", data.userId);

    console.log(
      `[EDUCATIONAL_ACCESS] Acesso liberado com sucesso: ${request.accessId}`
    );
    return true;
  } catch (error) {
    console.error(`[EDUCATIONAL_ACCESS_ERROR] ${error}`);

    // Atualizar status como erro
    await updateAccessStatus(
      request.accessId,
      "error",
      undefined,
      error instanceof Error ? error.message : "Erro desconhecido"
    );

    return false;
  }
}

/**
 * Atualiza o status de um acesso educacional no banco de dados
 */
async function updateAccessStatus(
  accessId: string,
  status: string,
  clientPortalUserId?: string,
  errorMessage?: string
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");

    await prisma.productAccess.update({
      where: { id: accessId },
      data: {
        status,
        clientPortalUserId,
        errorMessage,
        updatedAt: new Date(),
      },
    });
  } catch (dbError) {
    console.error(
      `[UPDATE_ACCESS_STATUS_ERROR] Falha ao atualizar status do acesso: ${dbError}`
    );
  }
}

/**
 * Verifica o status de acesso educacional periodicamente
 */
export async function checkEducationalAccessStatus(
  accessId: string
): Promise<string> {
  try {
    const apiUrl = process.env.CLIENT_PORTAL_API_URL;
    const apiKey = process.env.CLIENT_PORTAL_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error("Configurações da API do client-portal não encontradas");
    }

    const response = await fetch(
      `${apiUrl}/api/educational/access/${accessId}/status`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao verificar status: ${response.status}`);
    }

    const data = await response.json();
    return data.status;
  } catch (error) {
    console.error(`[CHECK_ACCESS_STATUS_ERROR] ${error}`);
    return "unknown";
  }
}

/**
 * Revoga acesso a um produto educacional
 */
export async function revokeEducationalAccess(
  accessId: string,
  reason: string
): Promise<boolean> {
  try {
    const apiUrl = process.env.CLIENT_PORTAL_API_URL;
    const apiKey = process.env.CLIENT_PORTAL_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error("Configurações da API do client-portal não encontradas");
    }

    const response = await fetch(
      `${apiUrl}/api/educational/access/${accessId}/revoke`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ reason }),
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao revogar acesso: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      await updateAccessStatus(accessId, "revoked");
      return true;
    } else {
      throw new Error(data.message || "Falha ao revogar acesso");
    }
  } catch (error) {
    console.error(`[REVOKE_ACCESS_ERROR] ${error}`);
    return false;
  }
}
