"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import {
  FileAudio,
  Search,
  Filter,
  AlertCircle,
  Upload,

} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Interview, Meta } from "@/shared/types/dashboard";
import InterviewCard from "@/components/shared/InterviewCard";
import CardSkeleton from "@/components/shared/CardSkeleton";


export default function InterviewsPage() {
  const { toast } = useToast();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [meta, setMeta]             = useState<Meta | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage]             = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page",  String(page));
      params.set("limit", "12");
      if (statusFilter !== "all") params.set("interview_status", statusFilter);
      if (search)                 params.set("search", search);

      const res: any = await api.interviews.list(`?${params.toString()}`);
      setInterviews(res.data ?? []);
      setMeta(res.meta ?? null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  // Poll for processing interviews
  useEffect(() => {
    const hasProcessing = interviews.some((i) =>
      ["queued", "transcribing", "analysing"].includes(i.status)
    );
    if (!hasProcessing) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [interviews, load]);

  async function handleDelete(id: string) {
    try {
      await api.interviews.delete(id);
      setInterviews((prev) => prev.filter((i) => i._id !== id));
      toast({ title: "Interview deleted" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  }

  async function handleRetranscribe(id: string) {
    try {
      await api.interviews.transcribe(id);
      toast({ title: "Transcription started" });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      setPage(1);
      load();
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Interviews</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {meta ? `${meta.total} interview${meta.total !== 1 ? "s" : ""}` : "All your interviews"}
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Link href="/dashboard/upload">
            <Upload className="w-4 h-4" strokeWidth={1.5} />
            Upload
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <Input
            placeholder="Search interviews…"
            className="pl-9 bg-white/5 border-white/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v: any) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-40 bg-white/5 border-white/10">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" strokeWidth={1.5} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="uploaded">Uploaded</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="transcribing">Transcribing</SelectItem>
            <SelectItem value="analysing">Analysing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="glass rounded-xl p-12 flex flex-col items-center text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium">Failed to load interviews</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={load}>
            Try again
          </Button>
        </div>
      ) : interviews.length === 0 ? (
        <div className="glass rounded-xl p-12 flex flex-col items-center text-center">
          <FileAudio className="w-8 h-8 text-muted-foreground mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium">
            {search || statusFilter !== "all" ? "No interviews match your filters" : "No interviews yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {search || statusFilter !== "all"
              ? "Try adjusting your search or filter"
              : "Upload your first interview to get started"}
          </p>
          {!search && statusFilter === "all" && (
            <Button asChild size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Link href="/dashboard/upload">
                <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                Upload Interview
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {interviews.map((interview) => (
              <InterviewCard
                key={interview._id}
                interview={interview}
                onDelete={handleDelete}
                onRetranscribe={handleRetranscribe}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {meta.page} of {meta.pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-white/10 hover:bg-white/5"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === meta.pages}
              onClick={() => setPage((p) => p + 1)}
              className="border-white/10 hover:bg-white/5"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}