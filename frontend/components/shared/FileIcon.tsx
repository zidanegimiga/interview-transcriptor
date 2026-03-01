import {
  FileAudio,
  FileVideo,
} from "lucide-react";


const FileIcon = ({ type }: { type: string }) => {
  const isVideo = type.startsWith("video/");
  const Icon = isVideo ? FileVideo : FileAudio;
  return (
    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
    </div>
  );
}

export default FileIcon