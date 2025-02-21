// app/api/affiliates/[affiliateId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AffiliateBankInfo } from "@/types/pagarme";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ affiliateId: string }> }
) {
  const { affiliateId } = await params;
  try {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
          },
        },
      },
    });

    if (!affiliate) {
      return new NextResponse("Affiliate not found", { status: 404 });
    }

    return NextResponse.json(affiliate);
  } catch (error) {
    console.error("[AFFILIATE_GET_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ affiliateId: string }> }
) {
  const { affiliateId } = await params;
  try {
    const body = await request.json();
    const bankInfo = body.bankInfo || {};

    // Primeiro, buscar o affiliate atual
    const currentAffiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
      include: {
        user: true,
      },
    });

    if (!currentAffiliate) {
      return new NextResponse("Affiliate not found", { status: 404 });
    }

    // Depois, atualiza o afiliado
    const affiliate = await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        commission: body.commission,
        active: body.active,
        bankInfo: {
          ...(typeof currentAffiliate.bankInfo === "object"
            ? currentAffiliate.bankInfo
            : {}),
          ...bankInfo,
          updatedAt: new Date().toISOString(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      },
      include: {
        user: true,
      },
    });

    // Se houver dados do usuário para atualizar
    if (body.user) {
      await prisma.user.update({
        where: { id: affiliate.userId },
        data: {
          name: body.user.name,
          email: body.user.email,
          active: body.user.active,
        },
      });
    }

    return NextResponse.json(affiliate);
  } catch (error) {
    console.error("[AFFILIATE_UPDATE_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ affiliateId: string }> }
) {
  try {
    const { affiliateId } = await params;
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
      include: {
        user: true,
      },
    });

    if (!affiliate) {
      return new NextResponse("Affiliate not found", { status: 404 });
    }

    // Garantir que bankInfo é um objeto
    const currentBankInfo =
      typeof affiliate.bankInfo === "object" ? affiliate.bankInfo : {};

    // Desativa o afiliado
    await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        active: false,
        bankInfo: {
          ...currentBankInfo,
          deactivatedAt: new Date().toISOString(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as unknown as any, // Necessário devido à tipagem do Prisma para Json
      },
    });

    // Desativa o usuário associado
    await prisma.user.update({
      where: { id: affiliate.userId },
      data: { active: false },
    });

    // Se houver recipientId, desativa no Pagar.me
    const bankInfoTyped = currentBankInfo as unknown as AffiliateBankInfo;
    if (bankInfoTyped?.recipientId) {
      await fetch(
        `${request.url.split("/affiliates/")[0]}/recipients/${
          bankInfoTyped.recipientId
        }`,
        {
          method: "DELETE",
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AFFILIATE_DELETE_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
