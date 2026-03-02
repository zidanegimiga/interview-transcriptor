"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  Maximize2,
  Music,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface MediaPlayerProps {
  interviewId: string;
  fileType: string;
  seekTo?: number | null;
}

function formatTime(seconds: number) {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  interviewId,
  fileType,
  seekTo,
}: MediaPlayerProps) {
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [urlError, setUrlError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [mode, setMode] = useState<"audio" | "video">(
    fileType.startsWith("video/") ? "video" : "audio",
  );

  const isVideo = fileType.startsWith("video/");

  // Fetch presigned URL
  useEffect(() => {
    setLoadingUrl(true);
    setUrlError(false);
    api.interviews
      .audioUrl(interviewId)
      .then((res: any) => setAudioUrl(res.data.url))
      .catch(() => setUrlError(true))
      .finally(() => setLoadingUrl(false));
  }, [interviewId]);

  // Seek when seekTo prop changes
  useEffect(() => {
    if (seekTo == null || !mediaRef.current) return;
    mediaRef.current.currentTime = seekTo;
    mediaRef.current.play();
    setPlaying(true);
  }, [seekTo]);

  // Sync src when mode switches
  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !audioUrl) return;
    const time = media.currentTime;
    const wasPlaying = !media.paused;
    media.load();
    media.currentTime = time;
    if (wasPlaying) media.play();
  }, [mode]);

  function togglePlay() {
    const media = mediaRef.current;
    if (!media) return;
    if (playing) media.pause();
    else media.play();
  }

  function toggleMute() {
    const media = mediaRef.current;
    if (!media) return;
    media.muted = !muted;
    setMuted(!muted);
  }

  function handleTimeUpdate() {
    const media = mediaRef.current;
    if (!media) return;
    setCurrentTime(media.currentTime);
    if (media.buffered.length > 0) {
      setBuffered(media.buffered.end(media.buffered.length - 1));
    }
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const bar = progressRef.current;
    const media = mediaRef.current;
    if (!bar || !media) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    media.currentTime = pct * duration;
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (mediaRef.current) {
      mediaRef.current.volume = val;
      setMuted(val === 0);
    }
  }

  function handleFullscreen() {
    mediaRef.current?.requestFullscreen?.();
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  if (loadingUrl) {
    return (
      <div className="glass rounded-xl p-4 flex items-center gap-3">
        <Loader2
          className="w-4 h-4 animate-spin text-muted-foreground"
          strokeWidth={1.5}
        />
        <span className="text-xs text-muted-foreground">Loading media...</span>
      </div>
    );
  }

  if (urlError || !audioUrl) {
    return (
      <div className="glass rounded-xl p-4 flex items-center gap-3">
        <AlertCircle
          className="w-4 h-4 text-muted-foreground"
          strokeWidth={1.5}
        />
        <span className="text-xs text-muted-foreground">Media unavailable</span>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      {isVideo && mode === "video" && (
        <div className="relative bg-black aspect-video">
          <video
            ref={mediaRef}
            src={audioUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() =>
              setDuration(mediaRef.current?.duration ?? 0)
            }
            onEnded={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            preload="metadata"
          />
          <button
            onClick={handleFullscreen}
            className="absolute bottom-3 right-3 w-7 h-7 rounded-lg bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {mode === "audio" && (
        <>
          <video
            ref={mediaRef}
            src={audioUrl}
            className="hidden"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() =>
              setDuration(mediaRef.current?.duration ?? 0)
            }
            onEnded={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            preload="metadata"
          />
          <div className="flex items-center justify-center h-16 bg-gradient-to-r from-emerald-500/5 via-emerald-500/10 to-emerald-500/5 border-b border-border">
            <div className="flex items-end gap-0.5 h-8">
              {[...Array(40)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-full transition-all duration-100",
                    playing
                      ? "bg-emerald-500/60 animate-pulse"
                      : "bg-emerald-500/20",
                  )}
                  style={{
                    height: `${20 + Math.sin(i * 0.8) * 10 + Math.cos(i * 0.4) * 8}px`,
                    animationDelay: `${i * 30}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Controls */}
      <div className="p-4 space-y-3">
        <div
          ref={progressRef}
          className="relative h-1.5 bg-border rounded-full cursor-pointer group"
          onClick={handleProgressClick}
        >
          <div
            className="absolute inset-y-0 left-0 bg-white/10 rounded-full"
            style={{ width: `${bufferedPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            {playing ? (
              <Pause className="w-4 h-4 text-white" strokeWidth={1.5} />
            ) : (
              <Play className="w-4 h-4 text-white ml-0.5" strokeWidth={1.5} />
            )}
          </button>

          {/* Time */}
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatTime(currentTime)}
          </span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <button
            onClick={toggleMute}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {muted || volume === 0 ? (
              <VolumeX className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <Volume2 className="w-4 h-4" strokeWidth={1.5} />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 accent-emerald-500 cursor-pointer"
          />

          {/* Audio / Video toggle — only shown for video files */}
          {isVideo && (
            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 ml-1">
              <button
                onClick={() => setMode("audio")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                  mode === "audio"
                    ? "bg-emerald-500/20 text-emerald-500"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Music className="w-3 h-3" strokeWidth={1.5} />
                Audio
              </button>
              <button
                onClick={() => setMode("video")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                  mode === "video"
                    ? "bg-emerald-500/20 text-emerald-500"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Video className="w-3 h-3" strokeWidth={1.5} />
                Video
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
