import { Skeleton } from "@/components/ui/skeleton";

export default function BulletinLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>

      {/* Placeholder Card */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-10 sm:p-16 flex flex-col items-center min-h-[50vh] justify-center space-y-6">
        <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl" />
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-5 w-72 max-w-full rounded-md" />
      </div>
    </div>
  );
}
