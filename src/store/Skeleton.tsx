export function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-[#F0F0F2] rounded-[24px] overflow-hidden flex flex-col">
      <div className="skeleton h-[160px] md:h-[190px] w-full" />
      <div className="p-4 md:p-5 flex flex-col gap-3">
        <div className="skeleton h-4 w-3/4 rounded-md" />
        <div className="skeleton h-6 w-1/2 rounded-md mt-2" />
        <div className="skeleton h-3 w-2/5 rounded-md" />
        <div className="skeleton h-10 w-full rounded-full mt-2" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
