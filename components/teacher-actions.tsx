"use client";

import { LockKeyhole, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ActionInput } from "@/lib/types";

export function TeacherActions({
  disabled,
  onAction,
}: {
  disabled: boolean;
  onAction: (action: ActionInput) => Promise<void>;
}) {
  return (
    <section className="teacher-actions">
      <div>
        <span className="eyebrow">Control docente</span>
        <h2>Administrar ejercicio</h2>
      </div>
      <div className="teacher-buttons">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={disabled}><RefreshCcw /> Reiniciar carga</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Reiniciar el ejercicio?</AlertDialogTitle>
              <AlertDialogDescription>
                Se retirarán todos los contenedores, pero los alumnos seguirán conectados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => void onAction({ type: "reset" })}>Reiniciar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={disabled}><LockKeyhole /> Cerrar sala</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cerrar esta sala?</AlertDialogTitle>
              <AlertDialogDescription>
                Los alumnos podrán consultar el resultado final, pero ya no podrán modificar el buque.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => void onAction({ type: "close" })}>Cerrar sala</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
