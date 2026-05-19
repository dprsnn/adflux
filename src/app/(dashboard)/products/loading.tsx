import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="mt-4 h-5 w-40" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
