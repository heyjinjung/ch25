import { useEffect, useRef } from "react";
import { useToast } from "../components/common/ToastProvider";
import type { Ch25EventPayload } from "../types/ch25Events";

const RECONNECT_INTERVAL = 5000;

const getWsUrl = () => {
  const rawEnvBase = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ""
  ).trim();
  const baseUrl = rawEnvBase.replace(/\/+$/, "");

  if (baseUrl.startsWith("https")) {
    return baseUrl.replace("https", "wss") + "/api/ws/events";
  }
  if (baseUrl.startsWith("http")) {
    return baseUrl.replace("http", "ws") + "/api/ws/events";
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = baseUrl || window.location.host;
  return `${protocol}//${host}/api/ws/events`;
};

const getToastMessage = (payload: Ch25EventPayload) => {
  switch (payload.event_type) {
    case "LOSS_STREAK":
      return "?°íŒ¨ ê°ì?: ë¬´ë£Œ ?¤í?/ë¯¸ì…˜???•ì¸?˜ì„¸??";
    case "ASSET_DEPLETION":
      return "?ì‚° ê¸‰ê° ê°ì?: ìºì‹œë°?êµ¬ì œ ?œíƒ???•ì¸?˜ì„¸??";
    case "SESSION_END":
      return "?¸ì…˜ ì¢…ë£Œ: ë³µê? ?œíƒ??ì¤€ë¹„ë˜???ˆìŠµ?ˆë‹¤.";
    default:
      return "?´ë²¤???Œë¦¼???„ì°©?ˆìŠµ?ˆë‹¤.";
  }
};

export const useCh25Events = () => {
  const { addToast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const cleanup = () => {
      if (pingInterval.current) clearInterval(pingInterval.current);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      pingInterval.current = null;
      reconnectTimer.current = null;
    };

    const connect = () => {
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const url = getWsUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        pingInterval.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("PING");
          }
        }, 30000);
      };

      ws.onclose = () => {
        cleanup();
        reconnectTimer.current = setTimeout(connect, RECONNECT_INTERVAL);
      };

      ws.onmessage = (event) => {
        if (event.data === "PONG") return;
        try {
          const payload: Ch25EventPayload = JSON.parse(event.data);
          addToast(getToastMessage(payload), "info");
        } catch {
          // ignore malformed payloads
        }
      };
    };

    connect();

    return () => {
      cleanup();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [addToast]);
};
