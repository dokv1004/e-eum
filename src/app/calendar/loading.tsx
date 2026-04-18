import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Calendar Card */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-4 sm:p-8">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl" />
          <Skeleton className="h-7 w-36 rounded-lg" />
          <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl" />
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-2 sm:mb-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex justify-center py-2">
              <Skeleton className="h-4 w-6 rounded" />
            </div>
          ))}
        </div>

        {/* Calendar Grid — 5 rows x 7 cols */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton
              key={i}
              className="min-h-[3.5rem] sm:min-h-[4.5rem] rounded-xl sm:rounded-2xl"
            />
          ))}
        </div>
      </div>

      {/* Selected Date Events */}
      <div className="mt-6 sm:mt-8 bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 space-y-4">
        <Skeleton className="h-6 w-40 rounded-md" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 sm:p-5 rounded-2xl bg-slate-50"
            >
              <Skeleton className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0" />
              <Skeleton className="h-5 w-32 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
