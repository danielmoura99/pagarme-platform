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
  productType: "evaluation" | "educational" | "combo";
  courseId: string;
  orderBumps: Array<{
    productId: string;
    discount?: number;
  }>;
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
        orderBumps: {
          include: {
            bumpProduct: true,
          },
        },
      },
    });

    if (!product) return undefined;

    return {
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: product.prices[0]?.amount ? product.prices[0].amount / 100 : 0,
      active: product.active,
      productType:
        (product.productType as "evaluation" | "educational" | "combo") ||
        "evaluation",
      courseId: product.courseId || "",
      orderBumps: product.orderBumps.map((bump) => ({
        productId: bump.bumpProductId,
        discount: bump.discount || 0,
      })),
    };
  } catch (error) {
    console.error("[GET_PRODUCT_ERROR]", error);
    return undefined;
  }
}

export async function updateProduct(id: string, data: ProductFormValues) {
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

    // Atualiza o produto, preços e order bumps
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        active: data.active,
        productType: data.productType,
        courseId: data.courseId,
        prices: {
          create: {
            amount: data.price,
            active: true,
          },
        },
        orderBumps: {
          deleteMany: {}, // Remove os order bumps existentes
          create: data.orderBumps.map((bump) => ({
            bumpProductId: bump.productId,
            discount: bump.discount,
          })),
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
        productType: data.productType,
        courseId: data.courseId,
        prices: {
          create: {
            amount: data.price,
            active: true,
          },
        },
        orderBumps: {
          create: data.orderBumps.map((bump) => ({
            bumpProductId: bump.productId,
            discount: bump.discount,
          })),
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

export async function discontinueProduct(id: string) {
  try {
    // Primeiro, busque o produto atual para obter a descrição
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new Error("Product not found");
    }

    // Agora atualize o produto com a descrição modificada
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        active: false,
        // Use a descrição do produto existente
        description: `[DESCONTINUADO] ${existingProduct.description || ""}`,
      },
    });

    revalidatePath("/products");
    return updatedProduct;
  } catch (error) {
    console.error("[DISCONTINUE_PRODUCT_ERROR]", error);
    throw new Error("Failed to discontinue product");
  }
}
