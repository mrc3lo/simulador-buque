import { NextResponse } from "next/server";
import { apiError, badRequest } from "@/lib/api-response";
import { hashTeacherPin } from "@/lib/server-config";
import { eq, supabaseRequest } from "@/lib/supabase-rest";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeRoomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => CODE_CHARS[byte % CODE_CHARS.length]).join("");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      teacherName?: string;
      pin?: string;
    };
    const title = body.title?.trim().slice(0, 80);
    const teacherName = body.teacherName?.trim().slice(0, 60);
    const pin = body.pin?.trim();

    if (!title || !teacherName) {
      return badRequest("Escribe el nombre de la clase y del profesor.");
    }
    if (!pin || !/^\d{4,8}$/.test(pin)) {
      return badRequest("El PIN debe tener entre 4 y 8 números.");
    }

    let code = "";
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate = makeRoomCode();
      const existing = await supabaseRequest<Array<{ id: string }>>(
        `rooms?code=${eq(candidate)}&select=id&limit=1`,
      );
      if (!existing.length) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error("No se pudo generar un código de sala único.");

    const pinHash = await hashTeacherPin(code, pin);
    const [room] = await supabaseRequest<
      Array<{
        id: string;
        code: string;
        title: string;
        teacher_name: string;
        status: "active" | "closed";
        created_at: string;
      }>
    >("rooms", {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify({
        code,
        title,
        teacher_name: teacherName,
        teacher_pin_hash: pinHash,
      }),
    });

    const token = crypto.randomUUID();
    let participant;
    try {
      [participant] = await supabaseRequest<
        Array<{ id: string; display_name: string; role: "teacher" }>
      >("participants", {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify({
          room_id: room.id,
          display_name: teacherName,
          role: "teacher",
          token,
        }),
      });
    } catch (error) {
      await supabaseRequest(`rooms?id=${eq(room.id)}`, { method: "DELETE" });
      throw error;
    }

    return NextResponse.json(
      {
        room: {
          id: room.id,
          code: room.code,
          title: room.title,
          teacherName: room.teacher_name,
          status: room.status,
          createdAt: room.created_at,
        },
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
