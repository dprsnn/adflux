import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Globe, Package } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Привіт, {user.name ?? user.email}!
          </h1>
        </div>
        <Link href="/brands/new" className={cn(buttonVariants())}>
          <Plus className="mr-2 h-4 w-4" />
          Новий бренд
        </Link>
      </div>

      <Suspense fallback={<BrandsGridSkeleton />}>
        <BrandsList userId={user.id} />
      </Suspense>
    </div>
  );
}

function BrandsGridSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-1 h-3 w-24" />
            </div>
          </div>
          <Skeleton className="mt-4 h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

async function BrandsList({ userId }: { userId: string }) {
  const brands = await prisma.brand.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { products: true } },
    },
  });

  if (brands.length === 0) {
    return (
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-primary/10 p-4">
            <Palette className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Ще немає брендів</h3>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Створіть свій перший бренд, щоб почати роботу
          </p>
          <Link
            href="/brands/new"
            className={cn(buttonVariants(), "mt-6")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Створити бренд
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <p className="mt-1 text-muted-foreground">
        У вас {brands.length}{" "}
        {brands.length === 1 ? "бренд" : brands.length < 5 ? "бренди" : "брендів"}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => {
          return (
            <Link key={brand.id} href={`/brands/${brand.id}`}>
              <Card className="group transition-colors hover:border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {brand.logoUrl ? (
                      <Image
                        src={brand.logoUrl}
                        alt={brand.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-lg object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                        {brand.name[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">
                        {brand.name}
                      </CardTitle>
                      {brand.url && (
                        <CardDescription className="flex items-center gap-1 text-xs">
                          <Globe className="h-3 w-3" />
                          {brand.url.replace(/^https?:\/\//, "")}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    {brand._count.products}{" "}
                    {brand._count.products === 1
                      ? "товар"
                      : brand._count.products < 5
                        ? "товари"
                        : "товарів"}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function Palette(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}
