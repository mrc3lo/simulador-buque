"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerTeacher } from "@/lib/client-api";

export function TeacherRegistration() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null); setCreated(null);
    try {
      const result = await registerTeacher({ name, email, password });
      setCreated(result.teacher.email);
      setName(""); setEmail("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear la cuenta.");
    } finally { setBusy(false); setPassword(""); }
  };

  return (
    <section className="teacher-registration" aria-labelledby="register-teacher-title">
      <span className="eyebrow">Administración</span>
      <h2 id="register-teacher-title">Registrar profesor</h2>
      <p>Habilita una cuenta para que el profesor pueda crear y dirigir sus clases.</p>
      <form className="access-form" onSubmit={submit}>
        <label><span>Nombre del profesor</span><Input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required disabled={busy} /></label>
        <label><span>Correo del profesor</span><Input type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required disabled={busy} /></label>
        <label><span>Contraseña de la cuenta</span><Input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} required disabled={busy} /></label>
        <p className="form-help">Entrega las credenciales al profesor por un canal privado. No se envía un correo automático.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        {created && <p role="status">Cuenta habilitada: {created}. Ya puede iniciar sesión como profesor.</p>}
        <Button size="lg" disabled={busy}>{busy ? "Creando cuenta…" : "Crear cuenta de profesor"}</Button>
      </form>
    </section>
  );
}
