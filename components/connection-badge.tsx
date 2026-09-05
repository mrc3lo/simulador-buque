import { Cloud, CloudOff, LoaderCircle } from "lucide-react";
import type { ConnectionState } from "@/hooks/use-room-session";

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  if (state === "online") {
    return <span className="connection-badge online"><Cloud /> Sincronizado</span>;
  }
  if (state === "offline") {
    return <span className="connection-badge offline"><CloudOff /> Sin conexión</span>;
  }
  return <span className="connection-badge"><LoaderCircle className="spin" /> Conectando</span>;
}
