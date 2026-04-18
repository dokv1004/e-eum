import { Skeleton } from "@/components/ui/skeleton";

export default function BoardLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 sm:gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            className="h-11 sm:h-12 w-20 sm:w-24 rounded-full shrink-0"
          />
        ))}
      </div>

      {/* Post List */}
      <div className="mt-6 sm:mt-8 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-6 flex items-center gap-4"
          >
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-6 w-full max-w-sm rounded-md" />
              <div className="flex gap-3">
                <Skeleton className="h-4 w-14 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-14 rounded-md" />
              </div>
            </div>
            <Skeleton className="w-5 h-5 sm:w-6 sm:h-6 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
