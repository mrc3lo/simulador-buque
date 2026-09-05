import { NextResponse } from "next/server";
import { apiError, badRequest } from "@/lib/api-response";
import { hashTeacherPin } from "@/lib/server-config";
import { eq, supabaseRequest } from "@/lib/supabase-rest";

type Context = { params: Promise<{ code: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { code: rawCode } = await context.params;
    const code = rawCode.toUpperCase();
    const body = (await request.json()) as { pin?: string };
    const pin = body.pin?.trim();
    if (!pin) return badRequest("Escribe el PIN de profesor.");

    const [room] = await supabaseRequest<
      Array<{
        id: string;
        code: string;
        teacher_pin_hash: string;
        teacher_name: string;
      }>
    >(
      `rooms?code=${eq(code)}&select=id,code,teacher_pin_hash,teacher_name&limit=1`,
    );
    if (!room) return badRequest("La sala no existe.", 404);
    if ((await hashTeacherPin(code, pin)) !== room.teacher_pin_hash) {
      return badRequest("El PIN no es correcto.", 401);
    }

    const [teacher] = await supabaseRequest<
      Array<{ id: string; display_name: string; role: "teacher" }>
    >(
      `participants?room_id=${eq(room.id)}&role=${eq("teacher")}&select=id,display_name,role&limit=1`,
    );
    if (!teacher) throw new Error("La sala no tiene un profesor asociado.");

    const token = crypto.randomUUID();
    await supabaseRequest(`participants?id=${eq(teacher.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ token, last_seen_at: new Date().toISOString() }),
    });

    return NextResponse.json({
      identity: {
        roomCode: room.code,
        participantId: teacher.id,
        displayName: teacher.display_name,
        role: teacher.role,
        token,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
