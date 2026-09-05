export function getServerConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appSecret = process.env.APP_SECRET;

  if (!supabaseUrl || !serviceRoleKey || !appSecret) {
    throw new Error(
      "Configuración incompleta. Revisa SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y APP_SECRET.",
    );
  }

  return { supabaseUrl, serviceRoleKey, appSecret };
}

export async function hashTeacherPin(roomCode: string, pin: string) {
  const { appSecret } = getServerConfig();
  const value = new TextEncoder().encode(
    `${appSecret}:${roomCode.toUpperCase()}:${pin}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
