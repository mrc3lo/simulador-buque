"use client";

import type { ActionInput, RoomState, SessionIdentity } from "@/lib/types";

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;
  if (!response.ok) throw new Error(payload.error || "La operación no pudo completarse.");
  return payload;
}

export async function createRoom(input: {
  title: string;
  teacherName: string;
  pin: string;
}) {
  return jsonRequest<{ room: RoomState["room"]; identity: SessionIdentity }>(
    "/api/rooms",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function joinRoom(
  code: string,
  displayName: string,
  token?: string,
) {
  return jsonRequest<{ identity: SessionIdentity }>(
    `/api/rooms/${encodeURIComponent(code)}/join`,
    { method: "POST", body: JSON.stringify({ displayName, token }) },
  );
}

export async function recoverTeacher(code: string, pin: string) {
  return jsonRequest<{ identity: SessionIdentity }>(
    `/api/rooms/${encodeURIComponent(code)}/teacher`,
    { method: "POST", body: JSON.stringify({ pin }) },
  );
}

export async function getRoomState(code: string) {
  return jsonRequest<RoomState>(
    `/api/rooms/${encodeURIComponent(code)}/state`,
  );
}

export async function sendRoomAction(
  identity: SessionIdentity,
  action: ActionInput,
) {
  return jsonRequest<{ ok: true }>(
    `/api/rooms/${encodeURIComponent(identity.roomCode)}/actions`,
    {
      method: "POST",
      body: JSON.stringify({ ...action, token: identity.token }),
    },
  );
}

export async function heartbeat(identity: SessionIdentity) {
  return jsonRequest<{ ok: true }>(
    `/api/rooms/${encodeURIComponent(identity.roomCode)}/heartbeat`,
    { method: "POST", body: JSON.stringify({ token: identity.token }) },
  );
}
