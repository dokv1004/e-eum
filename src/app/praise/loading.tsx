import { Skeleton } from "@/components/ui/skeleton";

export default function PraiseLoading() {
  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-10 space-y-6">
        <Skeleton className="h-8 w-48 mx-auto rounded-lg" />
        <Skeleton className="h-5 w-56 mx-auto rounded-md" />
        <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr] gap-2">
          <div />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 rounded-lg" />
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton
              key={`cell-${i}`}
              className={i % 4 === 0 ? "h-20 rounded-lg" : "h-20 rounded-2xl"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
