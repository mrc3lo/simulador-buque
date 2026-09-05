import { Box, LogIn, RotateCcw, Trash2, XCircle } from "lucide-react";
import { sideLabel } from "@/lib/physics";
import type { Activity as ActivityItem } from "@/lib/types";

export function ActivityLog({ activities }: { activities: ActivityItem[] }) {
  return (
    <section className="activity-card">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">Bitácora</span>
          <h2>Actividad reciente</h2>
        </div>
      </div>
      {activities.length === 0 ? (
        <p className="empty-copy">Aún no se han registrado acciones.</p>
      ) : (
        <ol className="activity-list">
          {activities.map((activity) => {
            const Icon = activity.kind === "add" ? Box : activity.kind === "remove" ? Trash2 : activity.kind === "reset" ? RotateCcw : activity.kind === "close" ? XCircle : LogIn;
            return (
              <li key={activity.id}>
                <span className={`activity-icon ${activity.kind}`}><Icon /></span>
                <div>
                  <strong>{activity.actorName}</strong>
                  <span>{activityText(activity)}</span>
                </div>
                <time dateTime={activity.createdAt}>{new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" }).format(new Date(activity.createdAt))}</time>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function activityText(activity: ActivityItem) {
  if (activity.kind === "add") return `agregó ${(activity.massKg ?? 0) / 1000} t a ${activity.side ? sideLabel(activity.side) : "cubierta"}`;
  if (activity.kind === "remove") return "retiró una carga";
  if (activity.kind === "reset") return "reinició el ejercicio";
  if (activity.kind === "close") return "cerró la sala";
  return "se conectó a la clase";
}
