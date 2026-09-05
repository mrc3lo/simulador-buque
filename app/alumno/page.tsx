"use client";

import { FormEvent, useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { AccessShell } from "@/components/access-shell";
import { Classroom } from "@/components/classroom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinRoom } from "@/lib/client-api";
import { readLocalStorage, writeLocalStorage } from "@/hooks/use-local-storage";
import type { SessionIdentity } from "@/lib/types";

const SESSION_KEY = "buque:student-session";

export default function StudentPage() {
  const [identity, setIdentity] = useState<SessionIdentity | null>(null);
  const [suggestedCode, setSuggestedCode] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("sala")?.toUpperCase() ?? "";
    const stored = readLocalStorage<SessionIdentity>(SESSION_KEY);
    setSuggestedCode(code);
    if (stored && (!code || stored.roomCode === code)) setIdentity(stored);
    setReady(true);
  }, []);

  const saveIdentity = (next: SessionIdentity) => {
    writeLocalStorage(SESSION_KEY, next);
    setIdentity(next);
  };
  const leave = () => {
    window.localStorage.removeItem(SESSION_KEY);
    setIdentity(null);
  };

  if (!ready) return <div className="loading-screen"><span /></div>;
  if (identity) return <Classroom identity={identity} onLeave={leave} />;

  return (
    <AccessShell
      role="Acceso estudiante"
      title="Únete al ejercicio"
      description="Escribe tu nombre real y el código que aparece en la pantalla del profesor."
    >
      <JoinRoomForm suggestedCode={suggestedCode} onSuccess={saveIdentity} />
    </AccessShell>
  );
}

function JoinRoomForm({ suggestedCode, onSuccess }: { suggestedCode: string; onSuccess: (identity: SessionIdentity) => void }) {
  const [code, setCode] = useState(suggestedCode);
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setCode(suggestedCode), [suggestedCode]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const stored = readLocalStorage<SessionIdentity>(SESSION_KEY);
      const reusableToken = stored?.roomCode === code ? stored.token : undefined;
      onSuccess((await joinRoom(code, displayName, reusableToken)).identity);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo entrar a la sala.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="access-form standalone" onSubmit={submit}>
      <label><span>Código de sala</span><Input className="code-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="ABC234" autoCapitalize="characters" required /></label>
      <label><span>Tu nombre</span><Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Nombre y apellido" autoComplete="name" maxLength={60} required /></label>
      <p className="form-help">Este nombre permitirá al profesor reconocer tus acciones y cargas.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button size="lg" className="access-submit" disabled={busy}>
        {busy ? "Conectando…" : <><LogIn /> Entrar a la sala</>}
      </Button>
    </form>
  );
}
