import { QAPair } from "@/shared/types/dashboard";
import { AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { useState } from "react";
import {motion} from "framer-motion";
import { cn, getSpeakerClass } from "@/lib/utils";

export default function QAAccordion({ pairs }: { pairs: QAPair[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {pairs.map((pair, i) => (
        <div key={i} className="glass rounded-xl overflow-hidden">
          <button
            className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
          >
            <div className="flex items-start gap-3 min-w-0">
              <MessageSquare className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-sm font-medium">{pair.question}</p>
            </div>
            {openIdx === i
              ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            }
          </button>

          <AnimatePresence>
            {openIdx === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-0 border-t border-border">
                  <div className="flex items-start gap-3 pt-3">
                    <span className={cn("text-xs font-bold flex-shrink-0 mt-0.5", getSpeakerClass(pair.speaker_a))}>
                      Speaker {pair.speaker_a}
                    </span>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {pair.answer}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}