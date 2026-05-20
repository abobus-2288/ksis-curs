import Echo from "laravel-echo";
import Pusher from "pusher-js";
import type { BrokerSnapshot } from "@/types/broker";

const reverbKey = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
const reverbHost = process.env.NEXT_PUBLIC_REVERB_HOST ?? "localhost";
const reverbPort = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080);
const reverbScheme = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http";

export interface BrokerStateUpdatedEvent {
  queue: string;
  snapshot: BrokerSnapshot;
}

export function createBrokerRealtime() {
  if (!reverbKey) {
    throw new Error("NEXT_PUBLIC_REVERB_APP_KEY is not configured.");
  }

  return new Echo({
    broadcaster: "reverb",
    key: reverbKey,
    wsHost: reverbHost,
    wsPort: reverbPort,
    wssPort: reverbPort,
    forceTLS: reverbScheme === "https",
    enabledTransports: ["ws", "wss"],
    client: new Pusher(reverbKey, {
      wsHost: reverbHost,
      wsPort: reverbPort,
      wssPort: reverbPort,
      forceTLS: reverbScheme === "https",
      enabledTransports: ["ws", "wss"],
      cluster: "mt1",
    }),
  });
}
