import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/product-form";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id: brandId } = await params;

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: user.id },
  });

  if (!brand) notFound();

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/brands/${brandId}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {brand.name}
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Новий товар</h1>
        <p className="mt-1 text-muted-foreground">
          Додайте товар до бренду &laquo;{brand.name}&raquo;
        </p>
      </div>

      <ProductForm brandId={brandId} />
    </div>
  );
}
