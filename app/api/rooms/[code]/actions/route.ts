import { NextResponse } from "next/server";
import { apiError, badRequest } from "@/lib/api-response";
import { eq, supabaseRequest } from "@/lib/supabase-rest";
import type { ActionInput, Side } from "@/lib/types";

type Context = { params: Promise<{ code: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { code: rawCode } = await context.params;
    const code = rawCode.toUpperCase();
    const body = (await request.json()) as ActionInput & { token?: string };
    if (!body.token) return badRequest("Sesión no identificada.", 401);

    const [room] = await supabaseRequest<
      Array<{ id: string; status: "active" | "closed" }>
    >(`rooms?code=${eq(code)}&select=id,status&limit=1`);
    if (!room) return badRequest("La sala no existe.", 404);
    if (room.status !== "active") return badRequest("La sala está cerrada.", 409);

    const [actor] = await supabaseRequest<
      Array<{
        id: string;
        display_name: string;
        role: "teacher" | "student";
      }>
    >(
      `participants?room_id=${eq(room.id)}&token=${eq(body.token)}&select=id,display_name,role&limit=1`,
    );
    if (!actor) return badRequest("La sesión ya no es válida.", 401);

    if (body.type === "add") {
      const allowedSides: Side[] = ["port", "starboard"];
      const side = body.side;
      const massKg = Number(body.massKg);
      const longitudinal = Number(body.longitudinal);
      if (!side || !allowedSides.includes(side)) {
        return badRequest("Selecciona babor o estribor.");
      }
      if (!Number.isFinite(massKg) || massKg < 1000 || massKg > 100000) {
        return badRequest("La masa debe estar entre 1 y 100 toneladas.");
      }
      if (![-10, 0, 10].includes(longitudinal)) {
        return badRequest("Selecciona popa, centro o proa.");
      }

      await supabaseRequest("cargo_loads", {
        method: "POST",
        body: JSON.stringify({
          room_id: room.id,
          participant_id: actor.id,
          actor_name: actor.display_name,
          side,
          mass_kg: Math.round(massKg),
          longitudinal,
        }),
      });
      await recordActivity(room.id, actor, "add", side, Math.round(massKg));
    } else if (body.type === "remove") {
      const participantFilter =
        actor.role === "student" ? `&participant_id=${eq(actor.id)}` : "";
      const [latest] = await supabaseRequest<
        Array<{ id: string; side: Side; mass_kg: number }>
      >(
        `cargo_loads?room_id=${eq(room.id)}${participantFilter}&select=id,side,mass_kg&order=created_at.desc&limit=1`,
      );
      if (!latest) return badRequest("No hay cargas que retirar.", 409);
      await supabaseRequest(`cargo_loads?id=${eq(latest.id)}`, {
        method: "DELETE",
      });
      await recordActivity(
        room.id,
        actor,
        "remove",
        latest.side,
        latest.mass_kg,
      );
    } else if (body.type === "reset") {
      if (actor.role !== "teacher") return badRequest("Acción no autorizada.", 403);
      await supabaseRequest(`cargo_loads?room_id=${eq(room.id)}`, {
        method: "DELETE",
      });
      await recordActivity(room.id, actor, "reset", null, null);
    } else if (body.type === "close") {
      if (actor.role !== "teacher") return badRequest("Acción no autorizada.", 403);
      await supabaseRequest(`rooms?id=${eq(room.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "closed" }),
      });
      await recordActivity(room.id, actor, "close", null, null);
    } else {
      return badRequest("Acción no reconocida.");
    }

    await supabaseRequest(`participants?id=${eq(actor.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ last_seen_at: new Date().toISOString() }),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

async function recordActivity(
  roomId: string,
  actor: { id: string; display_name: string },
  kind: "add" | "remove" | "reset" | "close",
  side: Side | null,
  massKg: number | null,
) {
  await supabaseRequest("activities", {
    method: "POST",
    body: JSON.stringify({
      room_id: roomId,
      participant_id: actor.id,
      actor_name: actor.display_name,
      kind,
      side,
      mass_kg: massKg,
    }),
  });
}
