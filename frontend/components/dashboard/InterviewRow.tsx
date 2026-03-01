import { Interview } from "@/shared/types/dashboard";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { StatusBadge } from "../ui/status-badge";
import { ChevronRight, FileAudio } from "lucide-react";
import { formatDuration, formatFileSize } from "@/lib/utils";

const InterviewRow = ({ interview }: { interview: Interview }) => {
  return (
    <Link href={`/dashboard/interviews/${interview._id}`}>
      <motion.div
        whileHover={{ x: 2 }}
        className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
      >
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <FileAudio className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{interview.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatFileSize(interview.file_size)} · {formatDuration(interview.duration_seconds)} ·{" "}
            {formatDistanceToNow(new Date(interview.created_at), { addSuffix: true })}
          </p>
        </div>

        {/* Status */}
        <StatusBadge status={interview.status} />

        {/* Arrow */}
        <ChevronRight
          className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          strokeWidth={1.5}
        />
      </motion.div>
    </Link>
  );
}

export default InterviewRow