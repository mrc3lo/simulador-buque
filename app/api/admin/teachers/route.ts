import { NextResponse } from "next/server";
import { apiError, badRequest } from "@/lib/api-response";
import { assertSameOrigin, authRequest, requireAdministrator } from "@/lib/teacher-auth";
import { getServerConfig } from "@/lib/server-config";
import { eq, supabaseRequest } from "@/lib/supabase-rest";

interface AdminUser {
  id: string;
  email?: string;
  app_metadata?: { role?: string };
  user_metadata?: { display_name?: string };
}

export async function GET() {
  try {
    await requireAdministrator();
    const { serviceRoleKey } = getServerConfig();
    const users: AdminUser[] = [];
    for (let page = 1; page <= 20; page += 1) {
      const result = await authRequest(`admin/users?page=${page}&per_page=1000`, {
        headers: { Authorization: `Bearer ${serviceRoleKey}` },
      });
      if (!result.ok) return badRequest("No se pudieron cargar las cuentas de profesores.", 502);
      const payload = await result.json();
      const batch: AdminUser[] = payload.users ?? [];
      users.push(...batch);
      if (batch.length < 1000) break;
    }
    const teachers = users
      .filter((user) => user.app_metadata?.role === "teacher" && user.email)
      .map((user) => ({ id: user.id, email: user.email!, name: user.user_metadata?.display_name || user.email! }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    return NextResponse.json({ teachers }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdministrator();
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!name || name.length > 60 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return badRequest("Escribe un nombre y un correo válido.");
    }
    if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) {
      return badRequest("La contraseña debe tener entre 8 y 128 caracteres.");
    }
    const { serviceRoleKey } = getServerConfig();
    const result = await authRequest("admin/users", {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({
        email, password: body.password, email_confirm: true,
        app_metadata: { role: "teacher" }, user_metadata: { display_name: name },
      }),
    });
    if (!result.ok) {
      const error = await result.json().catch(() => ({}));
      if (["email_exists", "user_already_exists"].includes(error.code ?? error.error_code)) {
        return badRequest("Ese correo ya tiene una cuenta. No se modificaron sus permisos ni su contraseña.", 409);
      }
      if ((error.code ?? error.error_code) === "weak_password") return badRequest("La contraseña no cumple los requisitos de seguridad del servicio.");
      return badRequest("No se pudo crear la cuenta. Inténtalo nuevamente.", result.status === 429 ? 429 : 502);
    }
    const user = await result.json();
    return NextResponse.json({ teacher: { id: user.id, email: user.email, role: "teacher" } }, {
      status: 201, headers: { "Cache-Control": "no-store" },
    });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const administrator = await requireAdministrator();
    const body = await request.json().catch(() => ({}));
    const id = body?.id;
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return badRequest("La cuenta seleccionada no es válida.");
    }
    if (id === administrator.id) return badRequest("No puedes eliminar tu propia cuenta de administrador.", 409);

    const { serviceRoleKey } = getServerConfig();
    const adminHeaders = { Authorization: `Bearer ${serviceRoleKey}` };
    const targetResponse = await authRequest(`admin/users/${encodeURIComponent(id)}`, { headers: adminHeaders });
    if (!targetResponse.ok) return badRequest("No se encontró la cuenta seleccionada.", targetResponse.status === 404 ? 404 : 502);
    const targetPayload = await targetResponse.json();
    const target: AdminUser = targetPayload.user ?? targetPayload;
    if (target.app_metadata?.role !== "teacher") {
      return badRequest("Solo se pueden eliminar cuentas de profesores; las cuentas de administrador están protegidas.", 403);
    }

    const rooms = await supabaseRequest<Array<{ id: string }>>(
      `rooms?teacher_user_id=${eq(id)}&select=id`,
    );
    if (rooms.length) {
      const roomIds = rooms.map((room) => room.id);
      const roomFilter = encodeURIComponent(`in.(${roomIds.join(",")})`);
      await supabaseRequest(`rooms?id=${roomFilter}`, {
        method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ teacher_user_id: null }),
      });
    }

    let deletion: Response | null = null;
    let deletionError: unknown;
    try {
      deletion = await authRequest(`admin/users/${encodeURIComponent(id)}`, {
        method: "DELETE", headers: adminHeaders,
      });
    } catch (error) { deletionError = error; }
    if (!deletion?.ok) {
      let roomsRestored = true;
      if (rooms.length) {
        const roomIds = encodeURIComponent(`in.(${rooms.map((room) => room.id).join(",")})`);
        try {
          await supabaseRequest(`rooms?id=${roomIds}&teacher_user_id=is.null`, {
            method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ teacher_user_id: id }),
          });
        } catch (error) {
          roomsRestored = false;
          console.error("No se pudo restaurar la propiedad de las salas tras fallar la eliminación de la cuenta.", error);
        }
      }
      if (deletionError) console.error("No se recibió confirmación de Supabase al eliminar una cuenta docente.", deletionError);
      return badRequest(roomsRestored
        ? "No se pudo eliminar la cuenta. No se realizaron cambios en sus salas."
        : "No se pudo eliminar la cuenta y no fue posible restaurar la propiedad de todas sus salas. Contacta al administrador del sistema.", 502);
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
