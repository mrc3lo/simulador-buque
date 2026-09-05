import { GraduationCap, UserRound } from "lucide-react";
import type { Participant } from "@/lib/types";

export function ParticipantList({ participants }: { participants: Participant[] }) {
  return (
    <section className="participants-card">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">En línea</span>
          <h2>{participants.length} {participants.length === 1 ? "participante" : "participantes"}</h2>
        </div>
      </div>
      <ul className="participant-list">
        {participants.map((participant) => (
          <li key={participant.id}>
            <span className="participant-avatar">
              {participant.role === "teacher" ? <GraduationCap /> : <UserRound />}
            </span>
            <div>
              <strong>{participant.displayName}</strong>
              <span>{participant.role === "teacher" ? "Profesor" : `${participant.loadCount} cargas`}</span>
            </div>
            <span className="online-dot" title="En línea" />
          </li>
        ))}
      </ul>
    </section>
  );
}
