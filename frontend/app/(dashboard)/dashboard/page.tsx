"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileAudio,
  CheckCircle,
  Clock,
  Upload,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { Interview, Metrics } from "@/shared/types/dashboard";
import StatCard from "@/components/dashboard/StatCard";
import InterviewRow from "@/components/dashboard/InterviewRow";


export default function DashboardPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.interviews
      .list("?page=1&limit=8")
      .then((res: any) => setInterviews(res.data ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingList(false));

    api.interviews
      .metrics()
      .then((res: any) => setMetrics(res.data))
      .catch(() => {})
      .finally(() => setLoadingMetrics(false));
  }, []);

  const total = metrics
    ? Object.values(metrics.by_status).reduce((a, b) => a + b, 0)
    : 0;
  const completed = metrics?.by_status?.completed ?? 0;
  const inProgress =
    (metrics?.by_status?.transcribing ?? 0) +
    (metrics?.by_status?.analysing ?? 0) +
    (metrics?.by_status?.queued ?? 0);
  const failed = metrics?.by_status?.failed ?? 0;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Your interview analysis overview
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Link href="/dashboard/upload">
            <Upload className="w-4 h-4" strokeWidth={1.5} />
            Upload Interview
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileAudio}
          label="Total Interviews"
          value={total}
          loading={loadingMetrics}
          color="emerald"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={completed}
          sub={
            total
              ? `${Math.round((completed / total) * 100)}% success rate`
              : undefined
          }
          loading={loadingMetrics}
          color="sky"
        />
        <StatCard
          icon={Clock}
          label="In Progress"
          value={inProgress}
          loading={loadingMetrics}
          color="amber"
        />
        <StatCard
          icon={AlertCircle}
          label="Failed"
          value={failed}
          loading={loadingMetrics}
          color="red"
        />
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold">Recent Interviews</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your latest uploads and analyses
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <Link href="/dashboard/interviews">
              View all
              <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
            </Link>
          </Button>
        </div>

        <div className="p-2">
          {loadingList ? (
            <div className="space-y-1 p-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle
                className="w-8 h-8 text-muted-foreground mb-3"
                strokeWidth={1.5}
              />
              <p className="text-sm text-muted-foreground">
                Failed to load interviews
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">{error}</p>
            </div>
          ) : interviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileAudio
                className="w-8 h-8 text-muted-foreground mb-3"
                strokeWidth={1.5}
              />
              <p className="text-sm font-medium">No interviews yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload your first interview to get started
              </p>
              <Button
                asChild
                size="sm"
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Link href="/dashboard/upload">
                  <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Upload Interview
                </Link>
              </Button>
            </div>
          ) : (
            <div>
              {interviews.map((interview) => (
                <InterviewRow key={interview._id} interview={interview} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top keywords */}
      {metrics?.top_keywords && metrics.top_keywords.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">
            Top Keywords Across Interviews
          </h3>
          <div className="flex flex-wrap gap-2">
            {metrics.top_keywords.map((kw) => (
              <span key={kw.term} className="keyword-pill">
                {kw.term}
                <span className="ml-1.5 opacity-60">{kw.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
