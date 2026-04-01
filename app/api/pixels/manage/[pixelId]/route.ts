// app/api/pixels/manage/[pixelId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { pixelId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { platform, pixelId, enabled, testMode, events } = body;

    const pixelConfig = await prisma.pixelConfig.update({
      where: { id: params.pixelId },
      data: {
        ...(platform && { platform }),
        ...(pixelId && { pixelId }),
        ...(enabled !== undefined && { enabled }),
        ...(testMode !== undefined && { testMode }),
        ...(events && { events }),
      },
    });

    return NextResponse.json(pixelConfig);
  } catch (error) {
    console.error("[PIXEL_UPDATE]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar pixel" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { pixelId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    await prisma.pixelConfig.delete({
      where: { id: params.pixelId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PIXEL_DELETE]", error);
    return NextResponse.json(
      { error: "Erro ao deletar pixel" },
      { status: 500 }
    );
  }
}
