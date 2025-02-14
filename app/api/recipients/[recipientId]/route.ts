// app/api/recipients/[recipientId]/route.ts

import { NextResponse } from "next/server";
import { pagarme } from "@/lib/pagarme";

export async function GET(
  request: Request,
  { params }: { params: { recipientId: string } }
) {
  try {
    const recipient = await pagarme.getRecipient(params.recipientId);
    return NextResponse.json(recipient);
  } catch (error) {
    console.error("[API] Error getting recipient:", error);
    return NextResponse.json(
      { error: "Failed to get recipient" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { recipientId: string } }
) {
  try {
    const body = await request.json();
    const recipient = await pagarme.updateRecipient(params.recipientId, body);
    return NextResponse.json(recipient);
  } catch (error) {
    console.error("[API] Error updating recipient:", error);
    return NextResponse.json(
      { error: "Failed to update recipient" },
      { status: 500 }
    );
  }
}
