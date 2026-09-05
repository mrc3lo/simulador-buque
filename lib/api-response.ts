import { NextResponse } from "next/server";

export function apiError(error: unknown, fallback = "No fue posible completar la operación") {
  const message = error instanceof Error ? error.message : fallback;
  console.error(error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
