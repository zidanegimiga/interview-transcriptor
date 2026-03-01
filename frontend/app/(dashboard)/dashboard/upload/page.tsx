"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useDropzone,
  type DropzoneOptions,
  type FileRejection,
} from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getSession } from "next-auth/react";
import { ACCEPTED, cn } from "@/lib/utils";
import { QueuedFile, Template } from "@/shared/types/dashboard";
import FileRow from "@/components/shared/FileRow";
import { api } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>("none");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.templates
      .list()
      .then((res: any) => setTemplates(res.data ?? []))
      .catch(() => {});
  }, []);

  // Load templates on mount
  // useState(() => {
  //   fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/templates`, {
  //     headers: { "Content-Type": "application/json" },
  //   })
  //     .then((r) => r.json())
  //     .then((res) => setTemplates(res.data ?? []))
  //     .catch(() => {});
  // });

  // Dropzone

  const onDrop = useCallback((accepted: File[]) => {
    const newItems: QueuedFile[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      title: file.name.replace(/\.[^.]+$/, ""),
      status: "idle",
    }));
    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      rejections.forEach((r) => {
        toast({
          title: "File rejected",
          description: `${r.file.name}: ${r.errors[0]?.message}`,
          variant: "destructive",
        });
      });
    },
    [toast],
  );

  // @ts-ignore
  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    onDropRejected,
    accept: ACCEPTED,
    maxSize: 500 * 1024 * 1024,
    multiple: true,
  };

  const { getRootProps, getInputProps, isDragActive } =
    useDropzone(dropzoneOptions);

  // Handlers

  function updateTitle(id: string, title: string) {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title } : item)),
    );
  }

  function removeFile(id: string) {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }

  function updateStatus(
    id: string,
    status: QueuedFile["status"],
    extra: Partial<QueuedFile> = {},
  ) {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status, ...extra } : item,
      ),
    );
  }

  async function uploadAll() {
    const idle = queue.filter((item) => item.status === "idle");
    if (!idle.length) return;

    setUploading(true);

    const session = (await getSession()) as any;
    const token = session?.backendToken;

    if (!token) {
      toast({
        title: "Not authenticated",
        description: "Please sign in again.",
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    let successCount = 0;
    let lastId: string | null = null;

    for (const item of idle) {
      updateStatus(item.id, "uploading");

      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("title", item.title || item.file.name);
      if (templateId && templateId !== "none") {
        formData.append("template_id", templateId);
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/interviews/upload`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );

        if (!res.ok) {
          const err = await res
            .json()
            .catch(() => ({ detail: "Upload failed" }));
          updateStatus(item.id, "error", {
            error: err.detail ?? "Upload failed",
          });
          continue;
        }

        const data = await res.json();
        const interviewId = data.data._id;
        updateStatus(item.id, "success", { resultId: interviewId });
        lastId = interviewId;
        successCount++;

        // Auto-trigger transcription
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/interviews/${interviewId}/transcribe`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (err: any) {
        updateStatus(item.id, "error", {
          error: err.message ?? "Upload failed",
        });
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast({
        title: `${successCount} file${successCount > 1 ? "s" : ""} uploaded`,
        description: "Transcription has started automatically.",
      });

      // Navigate to the interview if single upload
      setTimeout(() => {
        if (successCount === 1 && lastId) {
          router.push(`/dashboard/interviews/${lastId}`);
        } else {
          router.push("/dashboard/interviews");
        }
      }, 1200);
    }
  }

  const idleCount = queue.filter((i) => i.status === "idle").length;
  const successCount = queue.filter((i) => i.status === "success").length;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Upload Interview</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Upload audio or video files for AI transcription and analysis
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative cursor-pointer rounded-xl p-10 text-center transition-all duration-300 outline-none",
          isDragActive ? "dropzone-active" : "dropzone-idle",
        )}
      >
        {/* @ts-ignore */}
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
              isDragActive
                ? "bg-emerald-500/20 border-2 border-emerald-500/50"
                : "bg-emerald-500/10 border border-emerald-500/20",
            )}
          >
            {isDragActive ? (
              <Sparkles
                className="w-7 h-7 text-emerald-400 animate-breathing"
                strokeWidth={1.5}
              />
            ) : (
              <Upload className="w-7 h-7 text-emerald-500" strokeWidth={1.5} />
            )}
          </motion.div>

          <div>
            <p className="text-sm font-medium">
              {isDragActive ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or{" "}
              <span className="text-emerald-500 hover:text-emerald-400 transition-colors">
                click to browse
              </span>
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            MP3, MP4, WAV, M4A, MOV, WebM · Max 500MB per file
          </p>
        </div>
      </div>

      {/* Template selector */}
      {templates.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Analysis Template (optional)
          </Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                No template — standard analysis
              </SelectItem>
              {templates.map((t) => (
                <SelectItem key={t._id} value={t._id}>
                  {t.name}
                  {t.is_system && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (System)
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Queue */}
      <AnimatePresence mode="popLayout">
        {queue.map((item) => (
          <FileRow
            key={item.id}
            item={item}
            onTitleChange={updateTitle}
            onRemove={removeFile}
          />
        ))}
      </AnimatePresence>

      {/* Actions */}
      {queue.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between pt-2"
        >
          <p className="text-sm text-muted-foreground">
            {idleCount > 0 &&
              `${idleCount} file${idleCount > 1 ? "s" : ""} ready`}
            {successCount > 0 && ` · ${successCount} uploaded`}
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQueue([])}
              disabled={uploading}
              className="border-white/10 hover:bg-white/5"
            >
              Clear all
            </Button>
            <Button
              size="sm"
              onClick={uploadAll}
              disabled={uploading || idleCount === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {uploading ? (
                <Loader2
                  className="w-3.5 h-3.5 animate-spin"
                  strokeWidth={1.5}
                />
              ) : (
                <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
              {uploading
                ? "Uploading…"
                : `Upload ${idleCount} file${idleCount > 1 ? "s" : ""}`}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
