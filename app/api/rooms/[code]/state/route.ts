import { NextResponse } from "next/server";
import { apiError, badRequest } from "@/lib/api-response";
import { eq, supabaseRequest } from "@/lib/supabase-rest";

type Context = { params: Promise<{ code: string }> };

export async function GET(_: Request, context: Context) {
  try {
    const { code: rawCode } = await context.params;
    const code = rawCode.toUpperCase();
    const [room] = await supabaseRequest<
      Array<{
        id: string;
        code: string;
        title: string;
        teacher_name: string;
        status: "active" | "closed";
        created_at: string;
      }>
    >(
      `rooms?code=${eq(code)}&select=id,code,title,teacher_name,status,created_at&limit=1`,
    );
    if (!room) return badRequest("La sala no existe.", 404);

    const activeSince = new Date(Date.now() - 60_000).toISOString();
    const [participants, loads, activities] = await Promise.all([
      supabaseRequest<
        Array<{
          id: string;
          display_name: string;
          role: "teacher" | "student";
          last_seen_at: string;
        }>
      >(
        `participants?room_id=${eq(room.id)}&last_seen_at=${encodeURIComponent(`gte.${activeSince}`)}&select=id,display_name,role,last_seen_at&order=role.desc,display_name.asc`,
      ),
      supabaseRequest<
        Array<{
          id: string;
          participant_id: string;
          actor_name: string;
          side: "port" | "starboard";
          mass_kg: number;
          longitudinal: number;
          created_at: string;
        }>
      >(
        `cargo_loads?room_id=${eq(room.id)}&select=id,participant_id,actor_name,side,mass_kg,longitudinal,created_at&order=created_at.asc`,
      ),
      supabaseRequest<
        Array<{
          id: string;
          actor_name: string;
          kind: "add" | "remove" | "reset" | "close" | "join";
          side: "port" | "starboard" | null;
          mass_kg: number | null;
          created_at: string;
        }>
      >(
        `activities?room_id=${eq(room.id)}&select=id,actor_name,kind,side,mass_kg,created_at&order=created_at.desc&limit=12`,
      ),
    ]);

    const loadCountByParticipant = new Map<string, number>();
    for (const load of loads) {
      loadCountByParticipant.set(
        load.participant_id,
        (loadCountByParticipant.get(load.participant_id) ?? 0) + 1,
      );
    }

    return NextResponse.json({
      room: {
        id: room.id,
        code: room.code,
        title: room.title,
        teacherName: room.teacher_name,
        status: room.status,
        createdAt: room.created_at,
      },
      participants: participants.map((participant) => ({
        id: participant.id,
        displayName: participant.display_name,
        role: participant.role,
        lastSeenAt: participant.last_seen_at,
        loadCount: loadCountByParticipant.get(participant.id) ?? 0,
      })),
      loads: loads.map((load) => ({
        id: load.id,
        participantId: load.participant_id,
        actorName: load.actor_name,
        side: load.side,
        massKg: load.mass_kg,
        longitudinal: load.longitudinal,
        createdAt: load.created_at,
      })),
      activities: activities.map((activity) => ({
        id: activity.id,
        actorName: activity.actor_name,
        kind: activity.kind,
        side: activity.side,
        massKg: activity.mass_kg,
        createdAt: activity.created_at,
      })),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return apiError(error);
  }
}
