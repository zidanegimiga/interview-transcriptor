import { Template } from "@/shared/types/dashboard";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Pencil,
  Trash2,
  Lock,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";


const TemplateCard = ({
  template,
  onEdit,
  onDelete,
}: {
  template:  Template;
  onEdit:    (t: Template) => void;
  onDelete:  (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="glass rounded-xl overflow-hidden group"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Icon */}
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border",
              template.is_system
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-blue-500/10 border-blue-500/20"
            )}>
              {template.is_system
                ? <Sparkles className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                : <BookOpen  className="w-4 h-4 text-blue-500"    strokeWidth={1.5} />
              }
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">{template.name}</p>
                {template.is_system && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex-shrink-0">
                    <Lock className="w-2.5 h-2.5" strokeWidth={2} />
                    System
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {template.description}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {!template.is_system && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 hover:text-emerald-500"
                  onClick={() => onEdit(template)}
                >
                  <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 hover:text-destructive"
                  onClick={() => onDelete(template._id)}
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Focus areas */}
        {template.focus_areas?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {template.focus_areas.map((area) => (
              <span key={area} className="keyword-pill">{area}</span>
            ))}
          </div>
        )}

        {/* Expand toggle */}
        {template.prompt && (
          <button
            className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? <><ChevronUp   className="w-3 h-3" strokeWidth={1.5} /> Hide prompt</>
              : <><ChevronDown className="w-3 h-3" strokeWidth={1.5} /> View prompt</>
            }
          </button>
        )}
      </div>

      {/* Prompt preview */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap bg-black/20 rounded-lg p-3">
                {template.prompt}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default TemplateCard;