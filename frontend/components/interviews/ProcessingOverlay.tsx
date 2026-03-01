import { Brain, Loader2 } from "lucide-react";
import { StatusBadge } from "../ui/status-badge";

export function ProcessingOverlay({ status }: { status: string }) {
  const messages: Record<string, string> = {
    queued: "Queued for transcription…",
    transcribing: "Transcribing audio with Deepgram…",
    analysing: "Analysing with AI…",
  };

  return (
    <div className="glass rounded-xl p-16 flex flex-col items-center text-center processing-mesh">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-breathing">
          <Brain className="w-8 h-8 text-emerald-500" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
          <Loader2
            className="w-3 h-3 text-white animate-spin"
            strokeWidth={2}
          />
        </div>
      </div>
      <p className="text-sm font-semibold">
        {messages[status] ?? "Processing…"}
      </p>
      <p className="text-xs text-muted-foreground mt-2 max-w-xs">
        This usually takes 1–3 minutes depending on the file length. You can
        leave this page and come back.
      </p>
      <StatusBadge status={status} className="mt-4" />
    </div>
  );
}
