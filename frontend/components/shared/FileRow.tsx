import { QueuedFile } from "@/shared/types/dashboard";
import { motion } from "framer-motion";
import FileIcon from "./FileIcon";
import { formatSize } from "@/lib/utils";
import { AlertCircle, CheckCircle, Loader2, X } from "lucide-react";
import { Input } from "../ui/input";

const FileRow = ({
  item,
  onTitleChange,
  onRemove,
}: {
  item: QueuedFile;
  onTitleChange: (id: string, title: string) => void;
  onRemove: (id: string) => void;
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass rounded-xl p-4"
    >
      <div className="flex items-start gap-4">
        <FileIcon type={item.file.type} />

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground truncate">
              {item.file.name}
              <span className="ml-2 text-xs">({formatSize(item.file.size)})</span>
            </p>

            {item.status === "idle" && (
              <button
                onClick={() => onRemove(item.id)}
                className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            )}

            {item.status === "uploading" && (
              <Loader2 className="w-4 h-4 text-emerald-500 animate-spin flex-shrink-0" strokeWidth={1.5} />
            )}

            {item.status === "success" && (
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" strokeWidth={1.5} />
            )}

            {item.status === "error" && (
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" strokeWidth={1.5} />
            )}
          </div>

          {item.status === "idle" && (
            <Input
              value={item.title}
              onChange={(e) => onTitleChange(item.id, e.target.value)}
              placeholder="Interview title (optional)"
              className="h-8 text-sm bg-white/5 border-white/10 focus:border-emerald-500/50"
            />
          )}

          {item.status === "success" && (
            <p className="text-xs text-emerald-500">
              Uploaded successfully
            </p>
          )}

          {item.status === "error" && (
            <p className="text-xs text-destructive">{item.error}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default FileRow