"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteTeacher as removeTeacher, listTeachers, registerTeacher } from "@/lib/client-api";

type ManagedTeacher = { id: string; email: string; name: string };

export function TeacherRegistration() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<ManagedTeacher[]>([]);
  const [listBusy, setListBusy] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const refreshTeachers = useCallback(async () => {
    setListBusy(true); setListError(null);
    try { setTeachers((await listTeachers()).teachers); }
    catch (caught) { setListError(caught instanceof Error ? caught.message : "No se pudieron cargar las cuentas."); }
    finally { setListBusy(false); }
  }, []);

  useEffect(() => { void refreshTeachers(); }, [refreshTeachers]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null); setCreated(null);
    try {
      const result = await registerTeacher({ name, email, password });
      setCreated(result.teacher.email);
      setName(""); setEmail("");
      await refreshTeachers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear la cuenta.");
    } finally { setBusy(false); setPassword(""); }
  };

  const removeAccount = async (teacher: ManagedTeacher) => {
    const confirmed = window.confirm(
      `¿Eliminar definitivamente la cuenta de ${teacher.name} (${teacher.email})? Las salas que creó quedarán sin propietario y requerirán su PIN para recuperarlas.`,
    );
    if (!confirmed) return;
    setDeleting(teacher.id); setListError(null); setListMessage(null);
    try {
      await removeTeacher(teacher.id);
      setTeachers((current) => current.filter((item) => item.id !== teacher.id));
      setListMessage(`Se eliminó la cuenta de ${teacher.email}.`);
    } catch (caught) {
      setListError(caught instanceof Error ? caught.message : "No se pudo eliminar la cuenta.");
    } finally { setDeleting(null); }
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
      <div className="managed-teachers" aria-labelledby="managed-teachers-title">
        <div className="managed-teachers-heading">
          <h3 id="managed-teachers-title">Cuentas de profesores</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => void refreshTeachers()} disabled={listBusy}>
            <RefreshCw /> {listBusy ? "Actualizando…" : "Actualizar lista"}
          </Button>
        </div>
        <p>Eliminar una cuenta revoca el acceso del profesor. Las cuentas de administrador no aparecen aquí.</p>
        {listError && <p className="form-error" role="alert">{listError}</p>}
        {listMessage && <p role="status">{listMessage}</p>}
        {listBusy ? <p role="status">Cargando cuentas…</p> : teachers.length ? (
          <ul className="managed-teachers-list">
            {teachers.map((teacher) => (
              <li key={teacher.id}>
                <span><strong>{teacher.name}</strong><small>{teacher.email}</small></span>
                <Button type="button" variant="destructive" size="sm" onClick={() => void removeAccount(teacher)} disabled={Boolean(deleting)} aria-label={`Eliminar cuenta de ${teacher.email}`}>
                  <Trash2 /> {deleting === teacher.id ? "Eliminando…" : "Eliminar"}
                </Button>
              </li>
            ))}
          </ul>
        ) : <p>No hay cuentas de profesores para mostrar.</p>}
      </div>
    </section>
  );
}
