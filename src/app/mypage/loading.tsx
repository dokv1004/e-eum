import { Skeleton } from "@/components/ui/skeleton";

export default function MyPageLoading() {
  return (
    <div className="max-w-md mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-10 space-y-8">
        <div className="flex flex-col items-center">
          <Skeleton className="w-28 h-28 sm:w-32 sm:h-32 rounded-full" />
        </div>
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}
