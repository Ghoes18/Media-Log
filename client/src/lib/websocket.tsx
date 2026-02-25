import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "./auth";

type WsEventType = "new_message" | "messages_read" | "conversation_updated";

interface WsEvent {
  type: WsEventType;
  payload: Record<string, unknown>;
}

type EventHandler = (payload: Record<string, unknown>) => void;

interface WebSocketContextValue {
  subscribe: (event: WsEventType, handler: EventHandler) => () => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  subscribe: () => () => {},
  isConnected: false,
});

export function useWebSocket() {
  return useContext(WebSocketContext);
}

async function getToken(): Promise<string | null> {
  if (!authClient?.auth) return null;
  try {
    const result = await authClient.auth.getSession();
    const token =
      result.data?.session?.token ??
      (result.data?.session as { access_token?: string })?.access_token;
    return token ?? null;
  } catch {
    return null;
  }
}

export function WebSocketProvider({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryDelayRef = useRef(1000);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef<Map<WsEventType, Set<EventHandler>>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const unmountedRef = useRef(false);

  const emit = useCallback((event: WsEvent) => {
    const handlers = handlersRef.current.get(event.type);
    if (handlers) {
      Array.from(handlers).forEach((handler) => handler(event.payload));
    }
  }, []);

  const connect = useCallback(async () => {
    if (unmountedRef.current) return;

    const token = await getToken();
    if (!token) return;

    const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${globalThis.location.host}/ws?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) { ws.close(); return; }
      setIsConnected(true);
      retryDelayRef.current = 1000;
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as WsEvent;
        emit(event);

        // Global cache invalidation on relevant events
        if (event.type === "new_message") {
          const convId = event.payload.conversationId as string | undefined;
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
          queryClient.invalidateQueries({ queryKey: ["/api/conversations/unread-count"] });
          if (convId) {
            queryClient.invalidateQueries({
              queryKey: [`/api/conversations/${convId}/messages`],
            });
          }
        } else if (event.type === "conversation_updated") {
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        } else if (event.type === "messages_read") {
          const convId = event.payload.conversationId as string | undefined;
          if (convId) {
            queryClient.invalidateQueries({
              queryKey: [`/api/conversations/${convId}/messages`],
            });
          }
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setIsConnected(false);
      wsRef.current = null;
      // Exponential backoff reconnect (max 30s)
      const delay = Math.min(retryDelayRef.current, 30_000);
      retryDelayRef.current = delay * 2;
      retryTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [emit, queryClient]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback(
    (event: WsEventType, handler: EventHandler) => {
      if (!handlersRef.current.has(event)) {
        handlersRef.current.set(event, new Set());
      }
      handlersRef.current.get(event)!.add(handler);
      return () => {
        handlersRef.current.get(event)?.delete(handler);
      };
    },
    [],
  );

  const contextValue = useMemo(
    () => ({ subscribe, isConnected }),
    [subscribe, isConnected],
  );

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}
