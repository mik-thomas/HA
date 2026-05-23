import { subscribeHaStateStream } from "@/lib/ha/stateStream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("ready", { ok: true });

      try {
        subscribeHaStateStream((ev) => {
          if (ev.type === "snapshot") {
            send("snapshot", ev.states);
          } else {
            send("state", ev.state);
          }
        }, request.signal);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Stream failed";
        send("error", { message });
        controller.close();
        return;
      }

      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(ping);
        }
      }, 25_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(ping);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
