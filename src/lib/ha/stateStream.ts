import { fetchStates } from "./client";
import type { HaState } from "./types";

function getHaWsConfig() {
  const baseUrl = process.env.HA_URL?.replace(/\/$/, "");
  const token = process.env.HA_TOKEN;
  if (!baseUrl || !token) {
    throw new Error("Missing HA_URL or HA_TOKEN");
  }
  const u = new URL(baseUrl);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/api/websocket";
  return { token, wsUrl: u.toString() };
}

export type StateStreamEvent =
  | { type: "snapshot"; states: HaState[] }
  | { type: "state"; state: HaState };

/**
 * Subscribe to Home Assistant state changes. Sends a REST snapshot first, then
 * WebSocket state_changed events. Calls cleanup when abortSignal fires.
 */
export function subscribeHaStateStream(
  onEvent: (event: StateStreamEvent) => void,
  abortSignal: AbortSignal,
): void {
  let closed = false;
  const { token, wsUrl } = getHaWsConfig();
  const ws = new WebSocket(wsUrl);

  const close = () => {
    if (closed) return;
    closed = true;
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  };

  abortSignal.addEventListener("abort", close);

  void fetchStates()
    .then((states) => {
      if (!closed) onEvent({ type: "snapshot", states });
    })
    .catch(() => {
      /* WS updates may still work */
    });

  ws.addEventListener("message", (event) => {
    if (closed) return;
    const data = JSON.parse(String(event.data)) as {
      type: string;
      event?: {
        event_type?: string;
        data?: { new_state?: HaState };
      };
    };

    if (data.type === "auth_required") {
      ws.send(JSON.stringify({ type: "auth", access_token: token }));
      return;
    }
    if (data.type === "auth_ok") {
      ws.send(
        JSON.stringify({
          id: 1,
          type: "subscribe_events",
          event_type: "state_changed",
        }),
      );
      return;
    }
    if (data.type === "event" && data.event?.event_type === "state_changed") {
      const newState = data.event.data?.new_state;
      if (newState?.entity_id && typeof newState.state === "string") {
        onEvent({ type: "state", state: newState });
      }
    }
  });

  ws.addEventListener("error", close);
  ws.addEventListener("close", () => {
    closed = true;
  });
}
