import { Minus, TrendingDown, TrendingUp } from "lucide-react";

export default function SentimentIcon({ overall }: { overall: string }) {
  if (overall === "positive") return <TrendingUp className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />;
  if (overall === "negative") return <TrendingDown className="w-4 h-4 text-red-500" strokeWidth={1.5} />;
  return <Minus className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />;
}