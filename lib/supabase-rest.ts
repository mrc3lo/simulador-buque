import { getServerConfig } from "@/lib/server-config";

interface RequestOptions extends RequestInit {
  prefer?: string;
}

export async function supabaseRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { supabaseUrl, serviceRoleKey } = getServerConfig();
  const headers = new Headers(options.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("Authorization", `Bearer ${serviceRoleKey}`);
  headers.set("Content-Type", "application/json");
  if (options.prefer) headers.set("Prefer", options.prefer);

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase respondió ${response.status}: ${body}`);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function eq(value: string) {
  return encodeURIComponent(`eq.${value}`);
}
