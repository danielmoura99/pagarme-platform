// app/api/recipients/route.ts

import { NextResponse } from "next/server";
import { pagarme } from "@/lib/pagarme";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");
    const size = searchParams.get("size");
    const status = searchParams.get("status") as
      | "active"
      | "inactive"
      | "suspended"
      | undefined;

    const recipients = await pagarme.listRecipients({
      page: page ? parseInt(page) : undefined,
      size: size ? parseInt(size) : undefined,
      status,
    });

    return NextResponse.json(recipients);
  } catch (error) {
    console.error("[API] Error listing recipients:", error);
    return NextResponse.json(
      { error: "Failed to list recipients" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const recipient = await pagarme.createRecipient(body);

    return NextResponse.json(recipient);
  } catch (error) {
    console.error("[API] Error creating recipient:", error);
    return NextResponse.json(
      { error: "Failed to create recipient" },
      { status: 500 }
    );
  }
}
