import { Skeleton } from "../ui/skeleton";

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  loading,
  color = "emerald",
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
  color?: "emerald" | "sky" | "amber" | "red";
}) => {
  const colorMap = {
    emerald: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400",
    sky: "bg-sky-500/10 text-sky-500 dark:text-sky-400",
    amber: "bg-amber-500/10 text-amber-500 dark:text-amber-400",
    red: "bg-red-500/10 text-red-500 dark:text-red-400",
  };

  return (
    <div className="glass rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}
        >
          <Icon className="w-4 h-4" strokeWidth={1.5} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className="text-2xl font-bold">{value}</p>
      )}
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
};

export default StatCard;
