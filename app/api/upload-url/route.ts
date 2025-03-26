// app/api/upload-url/route.ts

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    // Gerar um nome único para o arquivo
    const uniqueId = uuidv4();
    const fileName = `checkout-banners/${uniqueId}.jpg`;

    // Criar uma URL de upload
    const result = await put(
      fileName, // pathname
      new Blob([]), // empty blob for multipart uploads
      {
        // options
        access: "public",
        multipart: true,
      }
    );

    // Retornar a URL de upload e a URL permanente do blob
    return NextResponse.json({
      url: result.url, // URL para upload
      blobUrl: result.url, // URL permanente
    });
  } catch (error) {
    console.error("Erro ao gerar URL de upload:", error);
    return NextResponse.json(
      { error: "Falha ao gerar URL de upload" },
      { status: 500 }
    );
  }
}
