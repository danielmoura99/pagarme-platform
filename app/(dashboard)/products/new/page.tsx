// app/(dashboard)/products/new/page.tsx
import { ProductForm } from "../_components/product-form";

export default function NewProductPage() {
  return (
    <div className="container mx-auto py-8">
      <ProductForm />
    </div>
  );
}
