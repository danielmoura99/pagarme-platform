// app/(dashboard)/products/edit/[id]/page.tsx
import { redirect } from "next/navigation";
import { ProductForm } from "../_components/product-form";
import { getProduct } from "../_actions";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    redirect("/products");
  }

  const product = await getProduct(id);

  if (!product) {
    redirect("/products");
  }

  return (
    <div className="container mx-auto py-8">
      <ProductForm initialData={product} />
    </div>
  );
}
