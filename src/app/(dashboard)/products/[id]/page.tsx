import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Pencil, ImageIcon, Tag, Percent } from "lucide-react";
import { DeleteProductButton } from "@/components/delete-product-button";
import { GenerateProductDnaButton } from "@/components/generate-product-dna-button";
import { ProductDnaForm } from "@/components/product-dna-form";
import { ProductDnaView } from "@/components/product-dna-view";
import { cn } from "@/lib/utils";

export default async function ProductDetailPage({
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

  const dna = product.productDna as {
    tone: string;
    targetSegments: string;
    painPoints: string;
    benefits: string;
    mainObjection: string;
  } | null;

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      {/* Navigation */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/brands/${product.brand.id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {product.brand.name}
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {product.imageUrls[0] ? (
            <img
              src={product.imageUrls[0]}
              alt={product.name}
              className="h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
              <ImageIcon className="h-7 w-7 text-muted-foreground" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {product.name}
              </h1>
              <Badge
                variant={
                  product.status === "READY"
                    ? "default"
                    : product.status === "ANALYZING"
                      ? "outline"
                      : "secondary"
                }
              >
                {product.status === "READY"
                  ? "Готовий"
                  : product.status === "ANALYZING"
                    ? "Аналіз..."
                    : "Чернетка"}
              </Badge>
            </div>
            {product.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {product.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-3">
              {product.price && (
                <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  {product.price}
                </span>
              )}
              {product.promotion && (
                <span className="flex items-center gap-1 text-sm text-primary">
                  <Percent className="h-3.5 w-3.5" />
                  {product.promotion}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/products/${product.id}/edit`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" })
            )}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Редагувати
          </Link>
          <DeleteProductButton
            productId={product.id}
            brandId={product.brand.id}
          />
        </div>
      </div>

      {/* Product images */}
      {product.imageUrls.length > 0 && (
        <>
          <Separator className="my-6" />
          <h2 className="mb-3 text-lg font-semibold">Фото товару</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {product.imageUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${product.name} - фото ${i + 1}`}
                className="aspect-square rounded-lg object-cover"
              />
            ))}
          </div>
        </>
      )}

      <Separator className="my-6" />

      {/* Product DNA */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Product DNA</h2>
        <GenerateProductDnaButton productId={product.id} />
      </div>

      {/* Read-only view + edit toggle (client component) */}
      <ProductDnaView productId={product.id} initialDna={dna} />
    </div>
  );
}
