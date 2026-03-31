// app/api/recipients/[recipientId]/route.ts
import { NextResponse } from "next/server";
import { pagarme } from "@/lib/pagarme";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ recipientId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const { recipientId } = await params;
    const recipient = await pagarme.getRecipient(recipientId);
    return NextResponse.json(recipient);
  } catch (error) {
    console.error("[RECIPIENT_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get recipient" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ recipientId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const { recipientId } = await params;
    const body = await request.json();
    const recipient = await pagarme.updateRecipient(recipientId, body);
    return NextResponse.json(recipient);
  } catch (error) {
    console.error("[RECIPIENT_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update recipient" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ recipientId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const { recipientId } = await params;
    // No Pagar.me, não excluímos realmente, apenas desativamos
    const recipient = await pagarme.updateRecipient(recipientId, {
      status: "inactive",
    });
    return NextResponse.json(recipient);
  } catch (error) {
    console.error("[RECIPIENT_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to deactivate recipient" },
      { status: 500 }
    );
  }
}
