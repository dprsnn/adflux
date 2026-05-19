import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/product-form";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, brand: { userId: user.id } },
    include: { brand: { select: { id: true, name: true } } },
  });

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/products/${product.id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Назад
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Редагувати: {product.name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Оновіть інформацію про товар бренду &laquo;{product.brand.name}&raquo;
        </p>
      </div>

      <ProductForm
        brandId={product.brand.id}
        initialData={{
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          promotion: product.promotion,
          imageUrls: product.imageUrls,
        }}
      />
    </div>
  );
}
