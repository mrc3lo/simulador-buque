import { NextResponse } from "next/server";
import { apiError, badRequest } from "@/lib/api-response";
import { assertSameOrigin, authRequest, requireAdministrator } from "@/lib/teacher-auth";
import { getServerConfig } from "@/lib/server-config";

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
