export const dynamic = "force-dynamic"; // app/api/proxy-image/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return new Response("URL não fornecida", { status: 400 });
  }

  try {
    const response = await fetch(imageUrl);
    const contentType = response.headers.get("content-type");
    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType || "image/png",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Erro ao fazer proxy da imagem:", error);
    return new Response("Erro ao carregar imagem", { status: 500 });
  }
}
