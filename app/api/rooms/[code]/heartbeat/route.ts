import { NextResponse } from "next/server";
import { apiError, badRequest } from "@/lib/api-response";
import { eq, supabaseRequest } from "@/lib/supabase-rest";

type Context = { params: Promise<{ code: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { code: rawCode } = await context.params;
    const code = rawCode.toUpperCase();
    const body = (await request.json()) as { token?: string };
    if (!body.token) return badRequest("Sesión no identificada.", 401);

    const [room] = await supabaseRequest<Array<{ id: string }>>(
      `rooms?code=${eq(code)}&select=id&limit=1`,
    );
    if (!room) return badRequest("La sala no existe.", 404);

    const updated = await supabaseRequest<Array<{ id: string }>>(
      `participants?room_id=${eq(room.id)}&token=${eq(body.token)}`,
      {
        method: "PATCH",
        prefer: "return=representation",
        body: JSON.stringify({ last_seen_at: new Date().toISOString() }),
      },
    );
    if (!updated.length) return badRequest("La sesión ya no es válida.", 401);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
