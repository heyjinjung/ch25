import { create } from 'zustand';
import { FeedMessage, JackpotWin } from '../types/feed';

const MAX_MESSAGES = 20;
const RECONNECT_INTERVAL = 5000;

interface FeedStore {
  isConnected: boolean;
  messages: JackpotWin[];
  connect: () => void;
  disconnect: () => void;
  addMessage: (msg: JackpotWin) => void;
}

const getWsUrl = () => {
  const rawEnvBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8000").trim();
  const baseUrl = rawEnvBase.replace(/\/+$/, ""); // remove trailing slash
  
  // Replace protocol
  if (baseUrl.startsWith("https")) {
    return baseUrl.replace("https", "wss") + "/api/ws/feed";
  } else if (baseUrl.startsWith("http")) {
    return baseUrl.replace("http", "ws") + "/api/ws/feed";
  } else {
    // Relative path support (unlikely strictly needed but good fallback if proxy)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = baseUrl || window.location.host;
    return `${protocol}//${host}/api/ws/feed`;
  }
};

export const useFeedStore = create<FeedStore>((set, get) => {
  let ws: WebSocket | null = null;
  let reconnectTimer: any = null;
  let pingInterval: any = null;

  const handleOpen = () => {
    set({ isConnected: true });
    // console.log("Feed WS Connected");
    
    // Start keep-alive
    pingInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send("PING");
        }
    }, 30000);
  };

  const handleClose = () => {
    set({ isConnected: false });
    // console.log("Feed WS Closed, reconnecting soon...");
    cleanup();
    reconnectTimer = setTimeout(() => {
      get().connect();
    }, RECONNECT_INTERVAL);
  };

  const handleMessage = (event: MessageEvent) => {
    try {
      if (event.data === "PONG") return;
      
      const data: FeedMessage = JSON.parse(event.data);
      if (data.type === "JACKPOT_WIN") {
        get().addMessage(data.payload);
      }
    } catch (err) {
      console.error("Feed WS parse error:", err);
    }
  };

  const cleanup = () => {
    if (pingInterval) clearInterval(pingInterval);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    pingInterval = null;
    reconnectTimer = null;
  };

  return {
    isConnected: false,
    messages: [],

    connect: () => {
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

      const url = getWsUrl();
      ws = new WebSocket(url);
      ws.onopen = handleOpen;
      ws.onclose = handleClose;
      ws.onmessage = handleMessage;
      // onError usually leads to onClose
    },

    disconnect: () => {
      cleanup();
      if (ws) {
        ws.onclose = null; // prevent reconnect trigger
        ws.close();
        ws = null;
      }
      set({ isConnected: false });
    },

    addMessage: (msg: JackpotWin) => {
      set((state) => ({
        messages: [msg, ...state.messages].slice(0, MAX_MESSAGES)
      }));
    }
  };
});
