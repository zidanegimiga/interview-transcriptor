import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  uploaded: {
    label: "Uploaded",
    dot:   "status-dot-uploaded",
    badge: "status-uploaded",
  },
  queued: {
    label: "Queued",
    dot:   "status-dot-queued",
    badge: "status-queued",
  },
  transcribing: {
    label: "Transcribing",
    dot:   "status-dot-transcribing",
    badge: "status-transcribing",
  },
  analysing: {
    label: "Analysing",
    dot:   "status-dot-analysing",
    badge: "status-analysing",
  },
  completed: {
    label: "Completed",
    dot:   "status-dot-completed",
    badge: "status-completed",
  },
  failed: {
    label: "Failed",
    dot:   "status-dot-failed",
    badge: "status-failed",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    dot:   "status-dot-uploaded",
    badge: "status-uploaded",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border",
        config.badge,
        className
      )}
    >
      <span className={cn("status-dot", config.dot)} />
      {config.label}
    </span>
  );
}