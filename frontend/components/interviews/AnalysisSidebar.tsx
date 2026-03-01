import { cn, getSpeakerClass } from "@/lib/utils";
import { AIAnalysis } from "@/shared/types/dashboard";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, Tag, XCircle } from "lucide-react";
import SentimentIcon from "../shared/SentimentIcon";

export default function AnalysisSidebar({
  analysis,
}: {
  analysis: AIAnalysis;
}) {
  const sentimentScore = analysis.sentiment?.score ?? 0;
  const sentimentPct = ((sentimentScore + 1) / 2) * 100;

  return (
    <div className="space-y-4">
      {/* Sentiment */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <SentimentIcon overall={analysis.sentiment?.overall} />
          <h4 className="text-sm font-semibold">Sentiment</h4>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Negative</span>
            <span className="capitalize font-medium text-foreground">
              {analysis.sentiment?.overall}
            </span>
            <span>Positive</span>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden bg-border">
            <div className="sentiment-bar absolute inset-0" />
            <div
              className="absolute top-0 w-3 h-3 rounded-full bg-white border-2 border-white shadow -translate-y-0.5 -translate-x-1.5 transition-all"
              style={{ left: `${sentimentPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            {analysis.sentiment?.notes}
          </p>
        </div>

        {/* Per speaker */}
        {Object.entries(analysis.sentiment?.by_speaker ?? {}).map(
          ([speaker, data]) => (
            <div key={speaker} className="flex items-center justify-between">
              <span
                className={cn("text-xs font-bold", getSpeakerClass(speaker))}
              >
                Speaker {speaker}
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                {data.overall}
              </span>
            </div>
          ),
        )}
      </div>

      {/* Keywords */}
      {analysis.keywords?.length > 0 && (
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
            <h4 className="text-sm font-semibold">Keywords</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.keywords.map((kw: any) => (
              <span key={kw.term} className="keyword-pill">
                {kw.term}
                <span className="ml-1 opacity-50">{kw.frequency}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {analysis.strengths?.length > 0 && (
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle
              className="w-4 h-4 text-emerald-500"
              strokeWidth={1.5}
            />
            <h4 className="text-sm font-semibold">Strengths</h4>
          </div>
          <ul className="space-y-1.5">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                <span className="text-xs text-muted-foreground">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Red flags */}
      {analysis.red_flags?.length > 0 && (
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" strokeWidth={1.5} />
            <h4 className="text-sm font-semibold">Red Flags</h4>
          </div>
          <ul className="space-y-1.5">
            {analysis.red_flags.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                <span className="text-xs text-muted-foreground">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Model info */}
      <p className="text-xs text-muted-foreground/50 text-center">
        Analysed by {analysis.model_used} ·{" "}
        {formatDistanceToNow(new Date(analysis.analysed_at), {
          addSuffix: true,
        })}
      </p>
    </div>
  );
}
