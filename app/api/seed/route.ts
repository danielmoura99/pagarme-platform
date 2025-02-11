// app/api/seed/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcrypt";

export async function GET() {
  try {
    // Verifica se já existe um usuário admin
    const existingUser = await prisma.user.findFirst({
      where: {
        email: "admin@example.com",
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Usuário admin já existe" },
        { status: 200 }
      );
    }

    // Cria o usuário admin com Customer relacionado
    const user = await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@tradershouse.com.br",
        password: await hash("Dash@3009TH*", 11),
        role: "admin",
        customer: {
          create: {
            // Cria um registro de customer automaticamente
          },
        },
      },
      include: {
        customer: true,
      },
    });

    return NextResponse.json(
      { message: "Usuário admin criado com sucesso", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      { message: "Erro ao criar usuário", error },
      { status: 500 }
    );
  }
}
