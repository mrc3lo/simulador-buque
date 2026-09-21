import { cookies } from "next/headers";
import { getServerConfig } from "@/lib/server-config";

export const TEACHER_COOKIE = "maritime-teacher-session";
export class AuthError extends Error {
  constructor(message: string, public status = 401) { super(message); }
}
export interface TeacherAccount { id: string; email: string }
interface AuthUser { id: string; email?: string; app_metadata?: { role?: string } }

export function assertTeacher(user: AuthUser): TeacherAccount {
  if (!user.id || !user.email || user.app_metadata?.role !== "teacher") {
    throw new AuthError("Esta cuenta no tiene acceso docente. Contacta al administrador.", 403);
  }
  return { id: user.id, email: user.email };
}

export async function authRequest(path: string, init: RequestInit = {}) {
  const { supabaseUrl, serviceRoleKey } = getServerConfig();
  return fetch(`${supabaseUrl}/auth/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: { apikey: serviceRoleKey, "Content-Type": "application/json", ...init.headers },
  });
}

export async function requireTeacher(): Promise<TeacherAccount> {
  const token = (await cookies()).get(TEACHER_COOKIE)?.value;
  if (!token) throw new AuthError("Inicia sesión como profesor.");
  const response = await authRequest("user", { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    if (response.status >= 500) throw new Error("El servicio de acceso no está disponible. Inténtalo nuevamente.");
    throw new AuthError("Tu sesión expiró. Inicia sesión nuevamente.");
  }
  return assertTeacher(await response.json());
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  let valid = false;
  try {
    const parsed = new URL(origin ?? "");
    // Next puede reconstruir request.url con el hostname interno del servidor.
    // Host conserva el destino real que recibió la petición del navegador.
    valid = ["http:", "https:"].includes(parsed.protocol)
      && parsed.host === request.headers.get("host")
      && request.headers.get("sec-fetch-site") !== "cross-site";
  } catch { /* Un Origin ausente o inválido se rechaza. */ }
  if (!valid) {
    throw new AuthError("Origen de solicitud no autorizado.", 403);
  }
}

export async function requireRoomTeacher(request: Request, ownerId: string | null) {
  assertSameOrigin(request);
  const teacher = await requireTeacher();
  if (ownerId && teacher.id !== ownerId) throw new AuthError("Esta clase pertenece a otro profesor.", 403);
  return teacher;
}
