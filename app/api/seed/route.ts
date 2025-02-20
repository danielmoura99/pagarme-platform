// app/api/seed/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcrypt";

export async function GET() {
  try {
    // Verifica se já existe um usuário admin
    const existingUser = await prisma.user.findFirst({
      where: {
        email: "admin@tradershouse.com.br",
        role: "admin",
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Usuário admin já existe" },
        { status: 200 }
      );
    }

    // Cria o usuário admin
    const user = await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@tradershouse.com.br",
        password: await hash("Dash@3009TH*", 11),
        role: "admin",
        active: true,
      },
    });

    // Criar também um customer associado com o mesmo email (opcional)
    const customer = await prisma.customer.create({
      data: {
        name: "Admin",
        email: "admin@tradershouse.com.br",
        document: "00000000000", // CPF fictício para admin
        phone: "0000000000",
      },
    });

    return NextResponse.json(
      {
        message: "Usuário admin criado com sucesso",
        data: {
          user,
          customer,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      {
        message: "Erro ao criar usuário",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
