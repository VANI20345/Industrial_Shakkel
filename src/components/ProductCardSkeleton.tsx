import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ProductCardSkeleton = () => (
  <Card className="overflow-hidden flex flex-col">
    <Skeleton className="aspect-square w-full rounded-none" />
    <div className="p-4 flex flex-col gap-3 flex-1">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
      <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-border">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <Skeleton className="h-9 w-full" />
    </div>
  </Card>
);

export const ProductGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
    {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
  </div>
);

export const TableRowSkeleton = ({ cols = 6, rows = 6 }: { cols?: number; rows?: number }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} className="border-t border-border">
        {Array.from({ length: cols }).map((_, c) => (
          <td key={c} className="px-5 py-3"><Skeleton className="h-4 w-full max-w-[140px]" /></td>
        ))}
      </tr>
    ))}
  </>
);
