"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";

interface AudioPlayerProps {
  interviewId: string;
  seekTo?: number | null; // timestamp in seconds to seek to
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ interviewId, seekTo }: AudioPlayerProps) {
  const audioRef                    = useRef<HTMLAudioElement | null>(null);
  const progressRef                 = useRef<HTMLDivElement | null>(null);
  const [audioUrl, setAudioUrl]     = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [urlError, setUrlError]     = useState(false);
  const [playing, setPlaying]       = useState(false);
  const [muted, setMuted]           = useState(false);
  const [duration, setDuration]     = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered]     = useState(0);
  const [volume, setVolume]         = useState(1);

  // Fetch presigned URL on mount
  useEffect(() => {
    setLoadingUrl(true);
    setUrlError(false);
    api.interviews.audioUrl(interviewId)
      .then((res: any) => setAudioUrl(res.data.url))
      .catch(() => setUrlError(true))
      .finally(() => setLoadingUrl(false));
  }, [interviewId]);

  // Seek when seekTo prop changes
  useEffect(() => {
    if (seekTo == null || !audioRef.current) return;
    audioRef.current.currentTime = seekTo;
    audioRef.current.play();
    setPlaying(true);
  }, [seekTo]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !muted;
    setMuted(!muted);
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);

    if (audio.buffered.length > 0) {
      setBuffered(audio.buffered.end(audio.buffered.length - 1));
    }
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const bar   = progressRef.current;
    const audio = audioRef.current;
    if (!bar || !audio) return;
    const rect  = bar.getBoundingClientRect();
    const pct   = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val === 0) setMuted(true);
      else setMuted(false);
    }
  }

  const progress  = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  if (loadingUrl) {
    return (
      <div className="glass rounded-xl p-4 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
        <span className="text-xs text-muted-foreground">Loading audio...</span>
      </div>
    );
  }

  if (urlError || !audioUrl) {
    return (
      <div className="glass rounded-xl p-4 flex items-center gap-3">
        <AlertCircle className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-xs text-muted-foreground">Audio unavailable</span>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        preload="metadata"
      />

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center flex-shrink-0 transition-colors"
        >
          {playing
            ? <Pause  className="w-4 h-4 text-white" strokeWidth={1.5} />
            : <Play   className="w-4 h-4 text-white ml-0.5" strokeWidth={1.5} />
          }
        </button>

        {/* Timestamps */}
        <span className="text-xs text-muted-foreground tabular-nums w-10 flex-shrink-0">
          {formatTime(currentTime)}
        </span>

        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative flex-1 h-1.5 bg-border rounded-full cursor-pointer group"
          onClick={handleProgressClick}
        >
          {/* Buffered */}
          <div
            className="absolute inset-y-0 left-0 bg-white/10 rounded-full"
            style={{ width: `${bufferedPct}%` }}
          />
          {/* Played */}
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progress}%` }}
          />
        </div>

        <span className="text-xs text-muted-foreground tabular-nums w-10 flex-shrink-0 text-right">
          {formatTime(duration)}
        </span>

        {/* Mute */}
        <button
          onClick={toggleMute}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          {muted || volume === 0
            ? <VolumeX className="w-4 h-4" strokeWidth={1.5} />
            : <Volume2 className="w-4 h-4" strokeWidth={1.5} />
          }
        </button>

        {/* Volume slider */}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-16 h-1 accent-emerald-500 cursor-pointer"
        />
      </div>
    </div>
  );
}