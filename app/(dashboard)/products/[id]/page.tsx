// app/(dashboard)/products/edit/[id]/page.tsx
import { redirect } from "next/navigation";
import { ProductForm } from "../_components/product-form";
import { getProduct } from "../_actions";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  if (!params.id) {
    redirect("/products");
  }

  const product = await getProduct(params.id);

  if (!product) {
    redirect("/products");
  }

  return (
    <div className="container mx-auto py-8">
      <ProductForm initialData={product} />
    </div>
  );
}
