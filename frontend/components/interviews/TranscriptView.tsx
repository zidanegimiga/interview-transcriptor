import { cn, formatMs, getSpeakerClass } from "@/lib/utils";
import { Transcript } from "@/shared/types/dashboard";
import { motion } from "framer-motion";
import { useState } from "react";



export default function TranscriptView({ transcript }: { transcript: Transcript }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!transcript.utterances?.length) {
    return (
      <div className="prose prose-sm max-w-none">
        <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
          {transcript.text}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transcript.utterances.map((u, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.02 }}
          className={cn(
            "flex gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group",
            activeIdx === i ? "bg-accent" : "hover:bg-accent/50"
          )}
          onClick={() => setActiveIdx(activeIdx === i ? null : i)}
        >
          {/* Speaker label */}
          <div className="flex-shrink-0 w-20 pt-0.5">
            <span className={cn("text-xs font-bold", getSpeakerClass(u.speaker))}>
              Speaker {u.speaker}
            </span>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm leading-relaxed transition-colors",
              activeIdx === i ? "utterance-active" : "utterance-inactive"
            )}>
              {u.text}
            </p>

            <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="timestamp">{formatMs(u.start_ms)}</span>
              {u.sentiment && (
                <span className="text-xs text-muted-foreground capitalize">
                  {u.sentiment}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}