"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, LogOut, Radio, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityLog } from "@/components/activity-log";
import { ConnectionBadge } from "@/components/connection-badge";
import { LoadControls } from "@/components/load-controls";
import { MetricsPanel } from "@/components/metrics-panel";
import { ParticipantList } from "@/components/participant-list";
import { ShipCanvas } from "@/components/ship-canvas";
import { TeacherActions } from "@/components/teacher-actions";
import { useRoomSession } from "@/hooks/use-room-session";
import { calculateShipMetrics } from "@/lib/physics";
import type { SessionIdentity } from "@/lib/types";

export function Classroom({
  identity,
  onLeave,
}: {
  identity: SessionIdentity;
  onLeave: () => void;
}) {
  const { state, connection, busy, error, act } = useRoomSession(identity);
  const [copied, setCopied] = useState(false);
  const metrics = useMemo(
    () => calculateShipMetrics(state?.loads ?? []),
    [state?.loads],
  );
  const isTeacher = identity.role === "teacher";
  const roomClosed = state?.room.status === "closed";
  const ownLoadCount =
    state?.loads.filter((load) => load.participantId === identity.participantId).length ?? 0;

  const copyInvite = async () => {
    const origin = window.location.origin;
    await navigator.clipboard.writeText(
      `${origin}/alumno?sala=${identity.roomCode}`,
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main className="classroom-shell">
      <header className="classroom-header">
        <div className="brand-lockup">
          <span className="brand-mark"><span /></span>
          <div>
            <span className="eyebrow">Simulador de buque</span>
            <strong>Laboratorio Logística Marítima y Portuaria</strong>
          </div>
        </div>
        <div className="header-actions">
          <ConnectionBadge state={connection} />
          <Button variant="ghost" size="sm" onClick={onLeave}><LogOut /> Salir</Button>
        </div>
      </header>

      <section className="room-identity">
        <div>
          <span className="eyebrow">{isTeacher ? "Vista del profesor" : `Alumno · ${identity.displayName}`}</span>
          <h1>{state?.room.title ?? "Cargando clase…"}</h1>
          <p>{isTeacher ? "Observa cómo cada decisión modifica la estabilidad del buque." : "Distribuye la carga y observa la respuesta del buque en tiempo real."}</p>
        </div>
        <div className="room-code-card">
          <span>Código de sala</span>
          <strong>{identity.roomCode}</strong>
          {isTeacher && (
            <button type="button" onClick={copyInvite}>
              {copied ? <Check /> : <Clipboard />}
              {copied ? "Enlace copiado" : "Copiar invitación"}
            </button>
          )}
        </div>
      </section>

      {roomClosed && (
        <div className="room-notice closed"><Radio /> Esta sala está cerrada. El resultado queda disponible para consulta.</div>
      )}
      {error && connection === "offline" && (
        <div className="room-notice warning">Se muestra el último estado guardado en este dispositivo. Las acciones están pausadas.</div>
      )}

      <div className="simulator-grid">
        <section className="simulation-card">
          <div className="simulation-toolbar">
            <div><span className="live-indicator" /> Estado compartido</div>
            <div className="load-balance">
              <span className="port-text">Babor {metrics.portCount}</span>
              <span className="balance-line"><i style={{ left: `${Math.max(3, Math.min(97, 50 + metrics.heelDegrees * 2))}%` }} /></span>
              <span className="starboard-text">Estribor {metrics.starboardCount}</span>
            </div>
          </div>
          <ShipCanvas metrics={metrics} />
        </section>
        <MetricsPanel metrics={metrics} />
      </div>

      <div className="workspace-grid">
        <LoadControls
          storageKey={`buque:controls:${identity.participantId}`}
          disabled={connection !== "online" || Boolean(roomClosed)}
          busy={busy}
          ownLoadCount={isTeacher ? state?.loads.length ?? 0 : ownLoadCount}
          onAction={act}
        />
        <div className="classroom-side-column">
          <ParticipantList participants={state?.participants ?? []} />
          <ActivityLog activities={state?.activities ?? []} />
        </div>
      </div>

      {isTeacher && (
        <TeacherActions
          disabled={connection !== "online" || busy || Boolean(roomClosed)}
          onAction={act}
        />
      )}

      <footer className="classroom-footer">
        <span><Users /> {state?.participants.length ?? 0} conectados</span>
        <span>Modelo educativo · L 40 m · B 12 m · ρ 1025 kg/m³</span>
      </footer>
    </main>
  );
}
