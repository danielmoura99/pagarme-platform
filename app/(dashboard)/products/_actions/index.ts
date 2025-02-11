// app/(dashboard)/products/_actions/index.ts
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface ProductFormValues {
  id?: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
}

export async function getProduct(
  id: string
): Promise<ProductFormValues | undefined> {
  if (!id) return undefined;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        prices: {
          where: { active: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!product) {
      return undefined;
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: product.prices[0]?.amount ? product.prices[0].amount / 100 : 0,
      active: product.active,
    };
  } catch (error) {
    console.error("[GET_PRODUCT_ERROR]", error);
    return undefined;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateProduct(id: string, data: any) {
  try {
    // Primeiro, desativa os preços existentes
    await prisma.price.updateMany({
      where: {
        productId: id,
        active: true,
      },
      data: {
        active: false,
      },
    });

    // Atualiza o produto e cria novo preço
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        active: data.active,
        prices: {
          create: {
            amount: data.price,
            active: true,
          },
        },
      },
    });

    revalidatePath("/products");
    return product;
  } catch (error) {
    console.error("[UPDATE_PRODUCT_ERROR]", error);
    throw new Error("Failed to update product");
  }
}

export async function deleteProduct(id: string) {
  try {
    await prisma.price.deleteMany({
      where: { productId: id },
    });

    const product = await prisma.product.delete({
      where: { id },
    });

    revalidatePath("/products");
    return product;
  } catch (error) {
    console.error("[DELETE_PRODUCT_ERROR]", error);
    throw new Error("Failed to delete product");
  }
}

export async function createProduct(data: ProductFormValues) {
  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        active: data.active,
        prices: {
          create: {
            amount: data.price,
            active: true,
          },
        },
      },
    });

    revalidatePath("/products");
    return product;
  } catch (error) {
    console.error("[CREATE_PRODUCT_ERROR]", error);
    throw new Error("Failed to create product");
  }
}
