// app/api/upload-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // Validar se é uma imagem
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "O arquivo deve ser uma imagem" },
        { status: 400 }
      );
    }

    // Gerar um nome único para o arquivo
    const fileName = `checkout-banners/${Date.now()}-${file.name}`;

    // Fazer upload para o Vercel Blob
    const { url } = await put(fileName, file, {
      access: "public",
    });

    return NextResponse.json({
      success: true,
      url: url,
      blobUrl: url,
    });
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    return NextResponse.json(
      {
        error: "Erro ao processar o upload",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Este endpoint não precisa mais de uma versão GET
export async function GET() {
  return NextResponse.json(
    { error: "Este endpoint só aceita requisições POST" },
    { status: 405 }
  );
}
