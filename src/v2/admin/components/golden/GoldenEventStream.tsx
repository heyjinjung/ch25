import { useEffect, useState, useRef } from "react";

interface GameEvent {
  eventId: string;
  userId: number;
  timestamp: string;
  gameType: string;
  result: string;
  betAmount: number;
  payoutAmount: number;
  currentBalance: number;
  source: string;
  sessionId?: string;
}

interface GoldenEventStreamProps {
  onConnectionChange?: (connected: boolean) => void;
  onEventsPerSecondChange?: (eventsPerSecond: number) => void;
}

export const GoldenEventStream = ({
  onConnectionChange,
  onEventsPerSecondChange,
}: GoldenEventStreamProps) => {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventCountRef = useRef(0);
  const rateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connectWebSocket = () => {
    // Get WebSocket URL from environment
    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
    const wsEndpoint = `${wsUrl}/api/admin/ws/golden/events`;

    try {
      const ws = new WebSocket(wsEndpoint);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        onConnectionChange?.(true);
        console.log("Golden Event Stream connected");
      };

      ws.onmessage = (e) => {
        try {
          const message = JSON.parse(e.data);

          if (message.type === "connection") {
            console.log("Golden 이벤트 스트림 연결됨");
            return;
          }

          if (message.type === "event" && message.data) {
            const event: GameEvent = {
              eventId: message.data.event_id,
              userId: message.data.user_id,
              timestamp: message.data.timestamp,
              gameType: message.data.game_type,
              result: message.data.result,
              betAmount: message.data.bet_amount,
              payoutAmount: message.data.payout_amount,
              currentBalance: message.data.current_balance,
              source: message.data.source,
              sessionId: message.data.session_id,
            };

            setEvents((prev) => [event, ...prev].slice(0, 100)); // Keep latest 100 events
            eventCountRef.current += 1;
          }

          if (message.type === "error") {
            console.error(`WebSocket 오류: ${message.message}`);
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        console.error("Golden 이벤트 스트림 연결 오류");
        setIsConnected(false);
        onConnectionChange?.(false);
      };

      ws.onclose = () => {
        console.log("WebSocket closed, will reconnect in 3s");
        setIsConnected(false);
        onConnectionChange?.(false);

        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      console.error("WebSocket 연결 실패");
    }
  };

  useEffect(() => {
    connectWebSocket();

    rateIntervalRef.current = setInterval(() => {
      const count = eventCountRef.current;
      eventCountRef.current = 0;
      onEventsPerSecondChange?.(count);
    }, 1000);

    return () => {
      // Cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (rateIntervalRef.current) {
        clearInterval(rateIntervalRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [onConnectionChange, onEventsPerSecondChange]);

  const getResultColor = (result: string) => {
    switch (result.toUpperCase()) {
      case "WIN":
      case "JACKPOT":
        return "text-emerald-400";
      case "LOSE":
        return "text-red-400";
      case "DRAW":
        return "text-gray-400";
      default:
        return "text-gray-300";
    }
  };

  const getGameTypeIcon = (gameType: string) => {
    switch (gameType.toUpperCase()) {
      case "DICE":
        return "🎲";
      case "SLOT":
        return "🎰";
      case "ROULETTE":
        return "🎡";
      case "POKER":
        return "♠️";
      case "BLACKJACK":
        return "🃏";
      default:
        return "🎮";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="admin-card-premium p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-100">
            실시간 게임 이벤트
          </h2>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
              }`}
            />
            <span className="text-xs text-gray-400">
              {isConnected ? "연결됨" : "연결 중..."}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-400">이벤트: {events.length}</div>
      </div>

      {/* Event Stream */}
      <div className="relative overflow-hidden rounded-lg border border-gray-700/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/50 border-b border-gray-700/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                  시간
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                  게임
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                  유저 ID
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                  결과
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                  베팅
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                  지급
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                  잔액
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                  출처
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {events.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-gray-500"
                  >
                    {isConnected ? "이벤트를 기다리는 중..." : "연결 중..."}
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.eventId}
                    className="hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-3 py-2 text-xs text-gray-400">
                      {formatTimestamp(event.timestamp)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span>{getGameTypeIcon(event.gameType)}</span>
                        <span className="text-xs text-gray-300">
                          {event.gameType}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-mono text-amber-400">
                        {event.userId}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs font-semibold ${getResultColor(
                          event.result,
                        )}`}
                      >
                        {event.result}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-gray-300">
                      {event.betAmount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-emerald-400">
                      {event.payoutAmount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-gray-100">
                      {event.currentBalance.toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-500 font-mono">
                        {event.source}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        최근 100개의 이벤트만 표시됩니다.
      </div>
    </div>
  );
};
