"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getRoomState,
  heartbeat,
  sendRoomAction,
} from "@/lib/client-api";
import { readLocalStorage, writeLocalStorage } from "@/hooks/use-local-storage";
import type { ActionInput, RoomState, SessionIdentity } from "@/lib/types";

export type ConnectionState = "connecting" | "online" | "offline";

export function useRoomSession(identity: SessionIdentity | null) {
  const [state, setState] = useState<RoomState | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!identity) return;
    try {
      const nextState = await getRoomState(identity.roomCode);
      if (!mounted.current) return;
      setState(nextState);
      setConnection("online");
      setError(null);
      writeLocalStorage(`buque:cache:${identity.roomCode}`, nextState);
    } catch (caught) {
      if (!mounted.current) return;
      const cached = readLocalStorage<RoomState>(
        `buque:cache:${identity.roomCode}`,
      );
      if (cached) setState(cached);
      setConnection("offline");
      setError(caught instanceof Error ? caught.message : "Sin conexión");
    }
  }, [identity]);

  useEffect(() => {
    if (!identity) return;
    const cached = readLocalStorage<RoomState>(
      `buque:cache:${identity.roomCode}`,
    );
    if (cached) setState(cached);
    void refresh();
    const poll = window.setInterval(() => void refresh(), 2_000);
    const pulse = window.setInterval(
      () => void heartbeat(identity).catch(() => undefined),
      20_000,
    );
    void heartbeat(identity).catch(() => undefined);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(pulse);
    };
  }, [identity, refresh]);

  const act = useCallback(
    async (action: ActionInput) => {
      if (!identity) throw new Error("Debes entrar a una sala.");
      setBusy(true);
      setError(null);
      try {
        await sendRoomAction(identity, action);
        await refresh();
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "La acción no pudo enviarse.";
        setError(message);
        throw caught;
      } finally {
        setBusy(false);
      }
    },
    [identity, refresh],
  );

  return { state, connection, busy, error, refresh, act };
}
