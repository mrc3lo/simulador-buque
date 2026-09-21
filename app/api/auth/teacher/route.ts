import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiError, badRequest } from "@/lib/api-response";
import { assertSameOrigin, assertTeacher, authRequest, requireTeacher, TEACHER_COOKIE } from "@/lib/teacher-auth";

export async function GET() {
  try {
    return NextResponse.json({ teacher: await requireTeacher() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    if (typeof body.email !== "string" || typeof body.password !== "string" || !body.email.trim() || !body.password || body.email.length > 254 || body.password.length > 1024) {
      return badRequest("Escribe tu correo y contraseña.");
    }
    const result = await authRequest("token?grant_type=password", {
      method: "POST", body: JSON.stringify({ email: body.email.trim(), password: body.password }),
    });
    if (!result.ok) return badRequest(result.status === 429 ? "Demasiados intentos. Espera unos minutos." : "No se pudo iniciar sesión. Revisa tu correo y contraseña.", result.status === 429 ? 429 : 401);
    const session = await result.json();
    const teacher = assertTeacher(session.user);
    const response = NextResponse.json({ teacher }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(TEACHER_COOKIE, session.access_token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/",
      maxAge: Math.min(Number(session.expires_in) || 3600, 86400),
    });
    return response;
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const token = (await cookies()).get(TEACHER_COOKIE)?.value;
    if (token) {
      const result = await authRequest("logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!result.ok && result.status !== 401 && result.status !== 403) throw new Error("No se pudo cerrar la sesión. Inténtalo nuevamente.");
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(TEACHER_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
    return response;
  } catch (error) { return apiError(error); }
}
