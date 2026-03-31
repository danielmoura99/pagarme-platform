// app/api/upload-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // Validar tamanho (máx 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Tamanho máximo: 5MB" },
        { status: 400 }
      );
    }

    // Validar tipo e extensão (Content-Type não é suficiente sozinho)
    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { error: "Formato não permitido. Use: JPG, PNG, GIF ou WebP" },
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
      { error: "Erro ao processar o upload" },
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
