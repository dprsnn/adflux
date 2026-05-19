import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Package, ImageIcon } from "lucide-react";

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Товари</h1>
          <p className="mt-1 text-muted-foreground">
            Всі товари ваших брендів
          </p>
        </div>
      </div>

      <Suspense fallback={<ProductsGridSkeleton />}>
        <ProductsList userId={user.id} />
      </Suspense>
    </div>
  );
}

function ProductsGridSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-1 h-3 w-20" />
            </div>
          </div>
          <Skeleton className="mt-4 h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

async function ProductsList({ userId }: { userId: string }) {
  const products = await prisma.product.findMany({
    where: { brand: { userId } },
    orderBy: { createdAt: "desc" },
    include: { brand: { select: { id: true, name: true } } },
  });

  if (products.length === 0) {
    return (
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Package className="h-8 w-8 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Ще немає товарів</h3>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Додайте товар зі сторінки бренду
          </p>
          <Link
            href="/dashboard"
            className={cn(buttonVariants(), "mt-6")}
          >
            До брендів
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Link key={product.id} href={`/products/${product.id}`}>
          <Card className="group transition-colors hover:border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {product.imageUrls[0] ? (
                    <img
                      src={product.imageUrls[0]}
                      alt={product.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">
                      {product.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {product.brand.name}
                    </CardDescription>
                  </div>
                </div>
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
            </CardHeader>
            {product.description && (
              <CardContent>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {product.description}
                </p>
              </CardContent>
            )}
          </Card>
        </Link>
      ))}
    </div>
  );
}
