import { Interview } from "@/shared/types/dashboard";
import { motion } from "framer-motion";
import FileIcon from "./FileIcon";
import Link from "next/link";
import { StatusBadge } from "../ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileAudio,
  FileVideo,
  Search,
  Filter,
  AlertCircle,
  Upload,
  MoreHorizontal,
  Trash2,
  Play,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatDuration, formatSize } from "@/lib/utils";


const InterviewCard = ({
  interview,
  onDelete,
  onRetranscribe,
}: {
  interview:      Interview;
  onDelete:       (id: string) => void;
  onRetranscribe: (id: string) => void;
}) => {
  const isProcessing = ["queued", "transcribing", "analysing"].includes(interview.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="glass rounded-xl p-4 group hover:border-white/15 transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <FileIcon type={interview.file_type} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/dashboard/interviews/${interview._id}`}>
                <p className="text-sm font-semibold hover:text-emerald-500 transition-colors truncate cursor-pointer">
                  {interview.title}
                </p>
              </Link>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {interview.original_name}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={interview.status} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/dashboard/interviews/${interview._id}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" strokeWidth={1.5} />
                      View details
                    </Link>
                  </DropdownMenuItem>
                  {interview.status === "uploaded" && (
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer"
                      onClick={() => onRetranscribe(interview._id)}
                    >
                      <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Transcribe
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => onDelete(interview._id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-muted-foreground">
              {formatSize(interview.file_size)}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {formatDuration(interview.duration_seconds)}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(interview.created_at), { addSuffix: true })}
            </span>

            {interview.ai_analysis?.sentiment?.overall && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs capitalize text-muted-foreground">
                  {interview.ai_analysis.sentiment.overall} sentiment
                </span>
              </>
            )}
          </div>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-0.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500/50 rounded-full animate-pulse-slow w-2/3" />
              </div>
              <span className="text-xs text-muted-foreground capitalize">
                {interview.status}…
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default InterviewCard;