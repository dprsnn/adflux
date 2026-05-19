import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Pencil,
  Globe,
  Package,
  Plus,
} from "lucide-react";
import { DeleteBrandButton } from "@/components/delete-brand-button";
import { cn } from "@/lib/utils";

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;

  const brand = await prisma.brand.findFirst({
    where: { id, userId: user.id },
    include: {
      products: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!brand) notFound();

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      {/* Top navigation */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Назад
        </Link>
      </div>

      {/* Brand header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={brand.name}
              className="h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
              {brand.name[0].toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {brand.name}
            </h1>
            {brand.url && (
              <a
                href={brand.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <Globe className="h-3.5 w-3.5" />
                {brand.url.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/brands/${brand.id}/edit`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" })
            )}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Редагувати
          </Link>
          <DeleteBrandButton brandId={brand.id} brandName={brand.name} />
        </div>
      </div>

      <Separator className="my-6" />

      {/* Products */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Товари ({brand.products.length})
        </h2>
        <Link
          href={`/brands/${brand.id}/products/new`}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Додати товар
        </Link>
      </div>

      {brand.products.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center py-10">
            <Package className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Ще немає товарів. Додайте перший товар до бренду.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {brand.products.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <Card className="transition-colors hover:border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{product.name}</CardTitle>
                  {product.description && (
                    <CardDescription className="line-clamp-2">
                      {product.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
