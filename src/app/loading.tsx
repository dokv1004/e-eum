import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12">
        <div className="flex flex-col lg:grid lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-12 items-start">
          {/* Left Column */}
          <div className="space-y-8 order-3 lg:order-none w-full">
            {/* Video Player Skeleton */}
            <Skeleton className="w-full aspect-video rounded-[2rem]" />

            {/* Playlist Skeleton */}
            <div className="bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 space-y-5">
              <Skeleton className="h-7 w-48 rounded-lg" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center p-3 sm:p-4 rounded-2xl border-2 border-slate-100"
                  >
                    <Skeleton className="w-20 h-14 sm:w-24 sm:h-16 shrink-0 rounded-xl" />
                    <div className="flex-1 ml-4 sm:ml-6 space-y-2">
                      <Skeleton className="h-5 w-36 rounded-md" />
                      <Skeleton className="h-4 w-24 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8 w-full contents lg:block lg:space-y-8">
            {/* 오늘의 말씀 Skeleton */}
            <div className="order-1 lg:order-none bg-white rounded-[2rem] border border-slate-200 p-8 sm:p-12 flex flex-col items-center space-y-5">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-6 w-full max-w-md rounded-md" />
              <Skeleton className="h-6 w-3/4 max-w-sm rounded-md" />
              <Skeleton className="h-5 w-28 rounded-md" />
            </div>

            {/* 예배 시간 안내 Skeleton */}
            <div className="order-2 lg:order-none bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 flex flex-col items-center space-y-5">
              <Skeleton className="w-12 h-12 rounded-2xl" />
              <Skeleton className="h-7 w-36 rounded-md" />
              <div className="w-full space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center p-4 sm:p-5 rounded-2xl bg-slate-50 space-y-2"
                  >
                    <Skeleton className="h-5 w-28 rounded-md" />
                    <Skeleton className="h-5 w-20 rounded-md" />
                    <Skeleton className="h-4 w-24 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
