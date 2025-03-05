// app/(dashboard)/coupons/_actions/index.ts
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface CouponFormValues {
  code: string;
  active: boolean;
  discountPercentage: number;
  maxUses?: number | null;
  expiresAt?: Date | null;
  productIds: string[];
}

export async function createCoupon(data: CouponFormValues) {
  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        active: data.active,
        discountPercentage: data.discountPercentage,
        maxUses: data.maxUses || null,
        expiresAt: data.expiresAt || null,
        usageCount: 0,
        products: {
          connect: data.productIds.map((id) => ({ id })),
        },
      },
    });

    revalidatePath("/coupons");
    return coupon;
  } catch (error) {
    console.error("[CREATE_COUPON_ERROR]", error);
    throw new Error("Failed to create coupon");
  }
}

export async function updateCoupon(id: string, data: CouponFormValues) {
  try {
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: data.code.toUpperCase(),
        active: data.active,
        discountPercentage: data.discountPercentage,
        maxUses: data.maxUses || null,
        expiresAt: data.expiresAt || null,
        products: {
          set: [], // Limpa as relações existentes
          connect: data.productIds.map((id) => ({ id })), // Conecta os novos produtos
        },
      },
    });

    revalidatePath("/coupons");
    return coupon;
  } catch (error) {
    console.error("[UPDATE_COUPON_ERROR]", error);
    throw new Error("Failed to update coupon");
  }
}

export async function deleteCoupon(id: string) {
  try {
    const coupon = await prisma.coupon.delete({
      where: { id },
    });

    revalidatePath("/coupons");
    return coupon;
  } catch (error) {
    console.error("[DELETE_COUPON_ERROR]", error);
    throw new Error("Failed to delete coupon");
  }
}

// Função para buscar um cupom específico
export async function getCoupon(id: string) {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      return null;
    }

    return {
      id: coupon.id,
      code: coupon.code,
      active: coupon.active,
      discountPercentage: coupon.discountPercentage,
      maxUses: coupon.maxUses,
      expiresAt: coupon.expiresAt,
    };
  } catch (error) {
    console.error("[GET_COUPON_ERROR]", error);
    return null;
  }
}

export async function inactivateCoupon(id: string) {
  try {
    // Em vez de excluir, apenas marcamos como inativo
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        active: false,
      },
    });

    revalidatePath("/coupons");
    return coupon;
  } catch (error) {
    console.error("[INACTIVATE_COUPON_ERROR]", error);
    throw new Error("Failed to inactivate coupon");
  }
}
