// app/(dashboard)/products/edit/[id]/page.tsx
import { redirect } from "next/navigation";
import { getProduct } from "../../_actions";
import { ProductForm } from "../../_components/product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // 1. Aguardar resolução dos params
  const resolvedParams = await params;

  // 2. Validação após await
  if (!resolvedParams || typeof resolvedParams !== "object") {
    redirect("/products");
  }

  // 3. Destructuring com params resolvidos
  const { id } = resolvedParams;

  try {
    const product = await getProduct(id);

    if (!product) {
      redirect("/products");
    }

    const initialData = {
      ...product,
      price: product.price,
    };

    return (
      <div className="container mx-auto py-8">
        <ProductForm initialData={initialData} />
      </div>
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    redirect("/products");
  }
}
