import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { verifyNeonToken } from "./auth";

type WsEvent =
  | { type: "new_message"; payload: Record<string, unknown> }
  | { type: "messages_read"; payload: { conversationId: string; readAt: string } }
  | { type: "conversation_updated"; payload: Record<string, unknown> };

// In-memory registry: userId -> Set of open WebSocket connections
const registry = new Map<string, Set<WebSocket>>();

function register(userId: string, ws: WebSocket) {
  if (!registry.has(userId)) registry.set(userId, new Set());
  registry.get(userId)!.add(ws);
}

function unregister(userId: string, ws: WebSocket) {
  const conns = registry.get(userId);
  if (!conns) return;
  conns.delete(ws);
  if (conns.size === 0) registry.delete(userId);
}

export function pushToUser(userId: string, event: WsEvent) {
  const conns = registry.get(userId);
  if (!conns) return;
  const payload = JSON.stringify(event);
  Array.from(conns).forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

export function setupWebSocketServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Unauthorized");
      return;
    }

    const payload = await verifyNeonToken(token);
    if (!payload) {
      ws.close(4001, "Unauthorized");
      return;
    }

    const userId = payload.sub;
    register(userId, ws);

    ws.on("close", () => {
      unregister(userId, ws);
    });

    ws.on("error", () => {
      unregister(userId, ws);
    });

    // Send a ping every 30s to keep the connection alive through proxies
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30_000);
  });

  return wss;
}
