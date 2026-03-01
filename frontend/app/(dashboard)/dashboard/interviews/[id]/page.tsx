"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Download,
  Play,
  RefreshCw,
  AlertCircle,
  Clock,
  FileAudio,
  MessageSquare,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Interview } from "@/shared/types/dashboard";
import AnalysisSidebar from "@/components/interviews/AnalysisSidebar";
import { formatDuration } from "@/lib/utils";
import { ProcessingOverlay } from "@/components/interviews/ProcessingOverlay";
import TranscriptView from "@/components/interviews/TranscriptView";
import QAAccordion from "@/components/interviews/QAAccordion";


export default function InterviewDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const { toast } = useToast();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  async function load() {
    try {
      const res: any = await api.interviews.get(id);
      setInterview(res.data);
      return res.data;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  // Poll while processing
  useEffect(() => {
    if (!interview) return;
    const isProcessing = ["queued", "transcribing", "analysing"].includes(interview.status);
    if (isProcessing) {
      pollRef.current = setInterval(async () => {
        const updated = await load();
        if (updated && !["queued", "transcribing", "analysing"].includes(updated.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 4000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [interview?.status]);

  async function handleRetranscribe() {
    try {
      await api.interviews.transcribe(id);
      toast({ title: "Transcription started" });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  async function handleAnalyse() {
    try {
      await api.interviews.analyse(id);
      toast({ title: "Analysis started" });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="glass rounded-xl p-16 flex flex-col items-center text-center max-w-md mx-auto">
        <AlertCircle className="w-8 h-8 text-muted-foreground mb-3" strokeWidth={1.5} />
        <p className="text-sm font-medium">Interview not found</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link href="/dashboard/interviews">Back to interviews</Link>
        </Button>
      </div>
    );
  }

  const isProcessing = ["queued", "transcribing", "analysing"].includes(interview.status);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 flex-shrink-0"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold truncate">{interview.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={interview.status} />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(interview.created_at), { addSuffix: true })}
              </span>
              {interview.duration_seconds && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" strokeWidth={1.5} />
                    {formatDuration(interview.duration_seconds)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {interview.status === "uploaded" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-white/10 hover:bg-white/5"
              onClick={handleRetranscribe}
            >
              <Play className="w-3.5 h-3.5" strokeWidth={1.5} />
              Transcribe
            </Button>
          )}
          {interview.transcript && !interview.ai_analysis && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-white/10 hover:bg-white/5"
              onClick={handleAnalyse}
            >
              <Brain className="w-3.5 h-3.5" strokeWidth={1.5} />
              Analyse
            </Button>
          )}
          {interview.transcript && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 border-white/10 hover:bg-white/5"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {["txt", "pdf", "docx"].map((fmt) => (
                  <DropdownMenuItem key={fmt} asChild>
                    <a
                      href={api.interviews.exportUrl(id, fmt)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer uppercase text-xs font-medium"
                    >
                      Export as {fmt.toUpperCase()}
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>


      {isProcessing && <ProcessingOverlay status={interview.status} />}

      {/* Failed state */}
      {interview?.status === "failed" && (
        <div className="glass rounded-xl p-6 flex items-center gap-4 border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" strokeWidth={1.5} />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-500">Processing failed</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Something went wrong during processing. You can try again.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-red-500/20 hover:bg-red-500/10"
            onClick={handleRetranscribe}
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
            Retry
          </Button>
        </div>
      )}

      {/* Main content — only show when we have data */}
      {(interview?.transcript || interview?.ai_analysis) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — transcript + analysis tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue={interview?.transcript ? "transcript" : "analysis"}>
              <TabsList className="bg-white/5 border border-white/10 mb-4">
                <TabsTrigger
                  value="transcript"
                  disabled={!interview?.transcript}
                  className="gap-2 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500"
                >
                  <FileAudio className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Transcript
                </TabsTrigger>
                <TabsTrigger
                  value="summary"
                  disabled={!interview?.ai_analysis}
                  className="gap-2 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500"
                >
                  <Brain className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Summary
                </TabsTrigger>
                <TabsTrigger
                  value="qa"
                  disabled={!interview?.ai_analysis?.questions_answers?.length}
                  className="gap-2 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500"
                >
                  <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Q&A
                </TabsTrigger>
              </TabsList>

              {/* Transcript */}
              <TabsContent value="transcript">
                <div className="glass rounded-xl p-4 max-h-[600px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                    <p className="text-xs text-muted-foreground">
                      {interview.transcript?.utterances?.length ?? 0} segments ·{" "}
                      Language: {interview.transcript?.language_code?.toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Confidence: {((interview.transcript?.confidence ?? 0) * 100).toFixed(0)}%
                    </p>
                  </div>
                  <TranscriptView transcript={interview.transcript!} />
                </div>
              </TabsContent>

              {/* Summary */}
              <TabsContent value="summary">
                <div className="glass rounded-xl p-5 space-y-5">
                  {interview.ai_analysis?.summary && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Interview Summary</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {interview.ai_analysis.summary}
                      </p>
                    </div>
                  )}
                  {interview.ai_analysis?.candidate_summary && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Candidate Assessment</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {interview.ai_analysis.candidate_summary}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Q&A */}
              <TabsContent value="qa">
                {interview.ai_analysis?.questions_answers?.length ? (
                  <QAAccordion pairs={interview.ai_analysis.questions_answers} />
                ) : (
                  <div className="glass rounded-xl p-8 text-center">
                    <p className="text-sm text-muted-foreground">No Q&A pairs extracted</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right — analysis sidebar */}
          <div>
            {interview.ai_analysis ? (
              <AnalysisSidebar analysis={interview.ai_analysis} />
            ) : (
              <div className="glass rounded-xl p-8 text-center">
                <Brain className="w-6 h-6 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium">No analysis yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Run analysis to see sentiment, keywords and insights
                </p>
                {interview.transcript && (
                  <Button
                    size="sm"
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    onClick={handleAnalyse}
                  >
                    <Brain className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Analyse now
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}