"use client";

import { FormEvent, useEffect, useState } from "react";
import { DoorOpen, Plus, Radio } from "lucide-react";
import { AccessShell } from "@/components/access-shell";
import { Classroom } from "@/components/classroom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createRoom, recoverTeacher, getTeacherAccount, loginTeacher, logoutTeacher } from "@/lib/client-api";
import { readLocalStorage, writeLocalStorage } from "@/hooks/use-local-storage";
import type { SessionIdentity } from "@/lib/types";

const SESSION_KEY = "buque:teacher-session";

export default function TeacherPage() {
  const [identity, setIdentity] = useState<SessionIdentity | null>(null);
  const [account, setAccount] = useState<{ id: string; email: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void getTeacherAccount().then(({ teacher }) => {
      if (!active) return;
      setAccount(teacher);
      setIdentity(readLocalStorage<SessionIdentity>(`${SESSION_KEY}:${teacher.id}`));
    }).catch(() => {}).finally(() => { if (active) setReady(true); });
    const expired = () => {
      setAccount(null);
      setIdentity(null);
      setAuthError("Vuelve a iniciar sesión para continuar como profesor.");
    };
    window.addEventListener("teacher-session-expired", expired);
    return () => { active = false; window.removeEventListener("teacher-session-expired", expired); };
  }, []);

  const saveIdentity = (next: SessionIdentity) => {
    writeLocalStorage(`${SESSION_KEY}:${account?.id}`, next);
    setIdentity(next);
  };
  const leave = () => {
    window.localStorage.removeItem(`${SESSION_KEY}:${account?.id}`);
    setIdentity(null);
  };

  if (!ready) return <div className="loading-screen"><span /></div>;
  if (!account) return (
    <AccessShell role="Acceso docente" title="Inicia sesión como profesor" description="Usa la cuenta habilitada por el administrador para crear y dirigir tus clases.">
      <TeacherLoginForm message={authError} onSuccess={(teacher) => {
        setAccount(teacher);
        setAuthError(null);
        setIdentity(readLocalStorage<SessionIdentity>(`${SESSION_KEY}:${teacher.id}`));
      }} />
    </AccessShell>
  );
  if (identity) return <Classroom identity={identity} onLeave={leave} />;

  return (
    <AccessShell
      role="Acceso docente"
      title="Prepara el laboratorio"
      description="Crea una nueva sala o recupera una sesión usando su código y PIN."
    >
      <div className="teacher-account">
        <span>{account.email}</span>
        <Button variant="outline" onClick={async () => {
          try { await logoutTeacher(); leave(); setAccount(null); setAuthError(null); }
          catch (error) { setAuthError(error instanceof Error ? error.message : "No se pudo cerrar sesión."); }
        }}>Cerrar sesión</Button>
      </div>
      {authError && <p className="form-error" role="alert">{authError}</p>}
      <Tabs defaultValue="create" className="access-tabs">
        <TabsList className="tabs-full">
          <TabsTrigger value="create"><Plus /> Nueva sala</TabsTrigger>
          <TabsTrigger value="recover"><DoorOpen /> Recuperar</TabsTrigger>
        </TabsList>
        <TabsContent value="create"><CreateRoomForm onSuccess={saveIdentity} /></TabsContent>
        <TabsContent value="recover"><RecoverRoomForm onSuccess={saveIdentity} /></TabsContent>
      </Tabs>
    </AccessShell>
  );
}

function CreateRoomForm({ onSuccess }: { onSuccess: (identity: SessionIdentity) => void }) {
  const [title, setTitle] = useState("Taller de estabilidad naval");
  const [teacherName, setTeacherName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await createRoom({ title, teacherName, pin });
      onSuccess(result.identity);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear la sala.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="access-form" onSubmit={submit}>
      <label><span>Nombre de la clase</span><Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} required /></label>
      <label><span>Nombre del profesor</span><Input value={teacherName} onChange={(event) => setTeacherName(event.target.value)} placeholder="Ej. Jorge Díaz" maxLength={60} required /></label>
      <label><span>PIN de recuperación</span><Input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} placeholder="4 a 8 números" inputMode="numeric" minLength={4} maxLength={8} type="password" required /></label>
      <p className="form-help">Guarda este PIN: permite recuperar el control desde otro computador.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button size="lg" className="access-submit" disabled={busy}>
        {busy ? "Creando sala…" : <><Radio /> Crear sala colaborativa</>}
      </Button>
    </form>
  );
}

function RecoverRoomForm({ onSuccess }: { onSuccess: (identity: SessionIdentity) => void }) {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSuccess((await recoverTeacher(code, pin)).identity);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo recuperar la sala.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="access-form" onSubmit={submit}>
      <label><span>Código de sala</span><Input className="code-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="ABC234" autoCapitalize="characters" required /></label>
      <label><span>PIN del profesor</span><Input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} inputMode="numeric" type="password" required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button size="lg" className="access-submit" disabled={busy}>
        {busy ? "Verificando…" : <><DoorOpen /> Recuperar sala</>}
      </Button>
    </form>
  );
}

function TeacherLoginForm({ onSuccess, message }: {
  onSuccess: (teacher: { id: string; email: string }) => void;
  message: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null);
    try { onSuccess((await loginTeacher(email, password)).teacher); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo iniciar sesión."); }
    finally { setBusy(false); }
  };
  return (
    <form className="access-form standalone" onSubmit={submit}>
      <label><span>Correo del profesor</span><Input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></label>
      <label><span>Contraseña</span><Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} maxLength={1024} required /></label>
      {(error || message) && <p className="form-error" role="alert">{error || message}</p>}
      <Button size="lg" className="access-submit" disabled={busy}>{busy ? "Ingresando…" : "Iniciar sesión"}</Button>
      <p className="form-help">Si no tienes cuenta o necesitas recuperar tu contraseña, contacta al administrador. Los alumnos ingresan desde «Entrar como alumno» con su nombre y código de clase.</p>
    </form>
  );
}
