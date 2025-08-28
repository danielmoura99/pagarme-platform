// app/api/integrations/rd-station/import-leads/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface RDStationLead {
  uuid: string;
  email: string;
  name?: string;
  personal_phone?: string;
  mobile_phone?: string;
  job_title?: string;
  state?: string;
  city?: string;
  country?: string;
  website?: string;
  custom_fields?: Record<string, any>;
  tags?: string[];
  created_at: string;
  updated_at: string;
  last_conversion?: {
    content: string;
    created_at: string;
    cumulative_sum: number;
    source: string;
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      page = 1, 
      pageSize = 50, 
      importAll = false,
      filters = {} 
    } = body;

    // Buscar configuração RD Station
    const config = await prisma.rDStationConfig.findFirst();
    
    if (!config || !config.enabled || !config.accessToken) {
      return NextResponse.json(
        { error: "RD Station não está configurado ou habilitado" },
        { status: 400 }
      );
    }

    // Verificar se o token não expirou
    if (config.tokenExpiresAt && config.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "Token de acesso expirado. Reconecte o RD Station" },
        { status: 401 }
      );
    }

    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      total: 0,
      page: page
    };

    let allLeads: RDStationLead[] = [];
    let currentPage = page;
    let hasMore = true;

    // Buscar leads do RD Station
    while (hasMore) {
      const leadsUrl = new URL('https://api.rd.services/platform/contacts');
      leadsUrl.searchParams.set('page', currentPage.toString());
      leadsUrl.searchParams.set('page_size', pageSize.toString());
      
      // Aplicar filtros se fornecidos
      if (filters.email) {
        leadsUrl.searchParams.set('email', filters.email);
      }
      if (filters.created_at_period) {
        leadsUrl.searchParams.set('created_at_period', filters.created_at_period);
      }

      const leadsResponse = await fetch(leadsUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!leadsResponse.ok) {
        console.error("[RD_STATION_LEADS_ERROR]", {
          status: leadsResponse.status,
          statusText: leadsResponse.statusText
        });
        break;
      }

      const leadsData = await leadsResponse.json();
      const leads = leadsData.contacts || [];
      
      allLeads.push(...leads);
      results.total += leads.length;

      // Se não for importAll ou não há mais páginas, parar
      if (!importAll || leads.length < pageSize) {
        hasMore = false;
      } else {
        currentPage++;
      }
    }

    console.log(`[RD_STATION_IMPORT] Encontrados ${allLeads.length} leads para processar`);

    // Processar cada lead
    for (const rdLead of allLeads) {
      try {
        const result = await processLead(rdLead);
        if (result.action === 'imported') {
          results.imported++;
        } else if (result.action === 'updated') {
          results.updated++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        console.error(`[RD_LEAD_PROCESS_ERROR] Lead ${rdLead.email}:`, error);
        results.errors++;
      }
    }

    // Atualizar estatísticas
    await prisma.rDStationConfig.update({
      where: { id: config.id },
      data: {
        lastSyncAt: new Date(),
        totalSynced: { increment: results.imported + results.updated }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${results.imported} novos, ${results.updated} atualizados, ${results.skipped} ignorados, ${results.errors} erros`,
      results
    });

  } catch (error) {
    console.error("[RD_STATION_IMPORT_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno durante importação de leads" },
      { status: 500 }
    );
  }
}

// Função auxiliar para processar um lead individual
async function processLead(rdLead: RDStationLead): Promise<{ action: string; customer?: any }> {
  // Verificar se já existe um customer com este email
  const existingCustomer = await prisma.customer.findFirst({
    where: { email: rdLead.email }
  });

  // Preparar dados do customer
  const extractedDocument = extractDocument(rdLead.custom_fields);
  
  const customerData = {
    email: rdLead.email,
    name: rdLead.name || rdLead.email,
    document: extractedDocument || generateDocumentFromEmail(rdLead.email), // Gerar documento se não existir
    phone: rdLead.mobile_phone || rdLead.personal_phone || null,
  };

  if (existingCustomer) {
    // Verificar se precisa atualizar
    const needsUpdate = 
      existingCustomer.name !== customerData.name ||
      existingCustomer.phone !== customerData.phone ||
      existingCustomer.document !== customerData.document;

    if (needsUpdate) {
      const updatedCustomer = await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          name: customerData.name,
          document: customerData.document,
          phone: customerData.phone,
          updatedAt: new Date()
        }
      });

      // Criar log de sincronização
      await createSyncLog(rdLead, 'update', updatedCustomer);
      
      return { action: 'updated', customer: updatedCustomer };
    } else {
      return { action: 'skipped', customer: existingCustomer };
    }
  } else {
    // Verificar se já existe um customer com o mesmo documento
    const existingByDocument = await prisma.customer.findUnique({
      where: { document: customerData.document }
    });

    if (existingByDocument) {
      // Se existe customer com mesmo documento, usar um documento único
      customerData.document = `${customerData.document}_${rdLead.uuid?.slice(-8) || Date.now()}`;
    }

    // Criar novo customer
    const newCustomer = await prisma.customer.create({
      data: customerData
    });

    // Criar log de sincronização
    await createSyncLog(rdLead, 'import', newCustomer);
    
    return { action: 'imported', customer: newCustomer };
  }
}

// Função auxiliar para extrair documento dos campos customizados
function extractDocument(customFields: Record<string, any> | undefined): string | undefined {
  if (!customFields) return undefined;
  
  // Procurar por campos comuns de documento
  const documentFields = ['cpf', 'cnpj', 'document', 'documento', 'cf_document', 'cf_cpf', 'cf_cnpj'];
  
  for (const field of documentFields) {
    if (customFields[field]) {
      return String(customFields[field]).replace(/\D/g, ''); // Remove formatação
    }
  }
  
  return undefined;
}

// Função auxiliar para gerar um documento fictício baseado no email (para evitar erros de constraint)
function generateDocumentFromEmail(email: string): string {
  // Gerar um "documento" baseado no hash do email para garantir unicidade
  // Prefixo "RD_" indica que é um lead importado do RD Station
  const emailHash = email.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Converter para positivo e garantir que tenha 11 dígitos (formato CPF)
  const documentNumber = Math.abs(emailHash).toString().padStart(11, '0').slice(0, 11);
  return `RD${documentNumber}`;
}

// Função auxiliar para criar log de sincronização
async function createSyncLog(rdLead: RDStationLead, action: string, customer: any) {
  const config = await prisma.rDStationConfig.findFirst();
  if (!config) return;

  await prisma.rDStationSyncLog.create({
    data: {
      configId: config.id,
      eventType: `lead_${action}`,
      rdEventType: 'CONTACT_IMPORT',
      leadEmail: rdLead.email,
      leadData: {
        rdStation: {
          uuid: rdLead.uuid,
          created_at: rdLead.created_at,
          updated_at: rdLead.updated_at,
          tags: rdLead.tags,
          custom_fields: rdLead.custom_fields,
          last_conversion: rdLead.last_conversion
        },
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name
        },
        action: action
      },
      status: 'success',
      processedAt: new Date()
    }
  });
}