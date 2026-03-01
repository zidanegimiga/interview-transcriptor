import { Skeleton } from "../ui/skeleton";


const CardSkeleton = () => {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    </div>
  );
}

export default CardSkeleton