import { NextResponse } from "next/server";
import { AuthError } from "@/lib/teacher-auth";

export function apiError(error: unknown, fallback = "No fue posible completar la operación") {
  if (error instanceof AuthError) return NextResponse.json({ error: error.message, code: "TEACHER_AUTH" }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  const message = error instanceof Error ? error.message : fallback;
  console.error(error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
