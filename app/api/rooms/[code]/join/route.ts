import { NextResponse } from "next/server";
import { apiError, badRequest } from "@/lib/api-response";
import { eq, supabaseRequest } from "@/lib/supabase-rest";

type Context = { params: Promise<{ code: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { code: rawCode } = await context.params;
    const code = rawCode.toUpperCase();
    const body = (await request.json()) as { displayName?: string; token?: string };
    const displayName = body.displayName?.trim().slice(0, 60);
    if (!displayName) return badRequest("Escribe tu nombre para entrar a la sala.");

    const [room] = await supabaseRequest<
      Array<{ id: string; code: string; status: "active" | "closed" }>
    >(`rooms?code=${eq(code)}&select=id,code,status&limit=1`);
    if (!room) return badRequest("La sala no existe.", 404);
    if (room.status !== "active") return badRequest("La sala ya fue cerrada.", 409);

    if (body.token) {
      const [existing] = await supabaseRequest<
        Array<{ id: string; display_name: string; role: "student" }>
      >(
        `participants?room_id=${eq(room.id)}&token=${eq(body.token)}&role=${eq("student")}&select=id,display_name,role&limit=1`,
      );
      if (existing) {
        const [updated] = await supabaseRequest<
          Array<{ id: string; display_name: string; role: "student" }>
        >(`participants?id=${eq(existing.id)}`, {
          method: "PATCH",
          prefer: "return=representation",
          body: JSON.stringify({
            display_name: displayName,
            last_seen_at: new Date().toISOString(),
          }),
        });
        return NextResponse.json({
          identity: {
            roomCode: room.code,
            participantId: updated.id,
            displayName: updated.display_name,
            role: updated.role,
            token: body.token,
          },
        });
      }
    }

    const token = crypto.randomUUID();
    const [participant] = await supabaseRequest<
      Array<{ id: string; display_name: string; role: "student" }>
    >("participants", {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify({
        room_id: room.id,
        display_name: displayName,
        role: "student",
        token,
      }),
    });

    await supabaseRequest("activities", {
      method: "POST",
      body: JSON.stringify({
        room_id: room.id,
        participant_id: participant.id,
        actor_name: displayName,
        kind: "join",
      }),
    });

    return NextResponse.json(
      {
        identity: {
          roomCode: room.code,
          participantId: participant.id,
          displayName: participant.display_name,
          role: participant.role,
          token,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
