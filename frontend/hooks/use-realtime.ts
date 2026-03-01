"use client";

import { useEffect, useRef, useCallback } from "react";
import { getSession } from "next-auth/react";

type RealtimeEvent = {
  type:            string;
  interview_id?:   string;
  status?:         string;
  sentiment_overall?: string;
  updated_at?:     string;
};

type EventHandler = (event: RealtimeEvent) => void;

export function useRealtime(onEvent: EventHandler) {
  const wsRef      = useRef<WebSocket | null>(null);
  const handlerRef = useRef<EventHandler>(onEvent);
  const retryRef   = useRef<NodeJS.Timeout | null>(null);
  const retries    = useRef(0);
  const mounted    = useRef(true);

  // Keep handler ref fresh without reconnecting
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(async () => {
    if (!mounted.current) return;

    const session = await getSession() as any;
    const token   = session?.backendToken;
    const userId  = session?.user?.id;

    if (!token || !userId) return;

    const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
      .replace(/^http/, "ws");

    const url = `${baseUrl}/api/v1/ws/${userId}?token=${token}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retries.current = 0;
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          handlerRef.current(data);
        } catch {}
      };

      ws.onclose = (e) => {
        if (!mounted.current) return;
        // Exponential backoff — max 30s
        const delay = Math.min(1000 * 2 ** retries.current, 30000);
        retries.current++;
        retryRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {}
  }, []);

  useEffect(() => {
    mounted.current = true;
    connect();

    return () => {
      mounted.current = false;
      if (retryRef.current) clearTimeout(retryRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on unmount
        wsRef.current.close();
      }
    };
  }, [connect]);
}