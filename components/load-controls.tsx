"use client";

import { useState } from "react";
import { Box, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { ActionInput, Side } from "@/lib/types";

export function LoadControls({
  storageKey,
  disabled,
  busy,
  ownLoadCount,
  onAction,
}: {
  storageKey: string;
  disabled: boolean;
  busy: boolean;
  ownLoadCount: number;
  onAction: (action: ActionInput) => Promise<void>;
}) {
  const [side, setSide] = useLocalStorage<Side>(`${storageKey}:side`, "port");
  const [massKg, setMassKg] = useLocalStorage<number>(`${storageKey}:mass`, 30000);
  const [longitudinal, setLongitudinal] = useLocalStorage<number>(
    `${storageKey}:position`,
    0,
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const run = async (action: ActionInput) => {
    setLocalError(null);
    try {
      await onAction(action);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "No se pudo enviar la acción.");
    }
  };

  return (
    <section className="control-card" aria-labelledby="load-controls-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">Mesa de carga</span>
          <h2 id="load-controls-title">Agregar un contenedor</h2>
        </div>
        <Box aria-hidden="true" />
      </div>

      <fieldset className="control-fieldset" disabled={disabled || busy}>
        <legend>Lado del buque</legend>
        <div className="side-selector">
          <button
            type="button"
            className={`side-option port ${side === "port" ? "selected" : ""}`}
            onClick={() => setSide("port")}
            aria-pressed={side === "port"}
          >
            <span>Babor</span>
            <small>lado izquierdo</small>
          </button>
          <button
            type="button"
            className={`side-option starboard ${side === "starboard" ? "selected" : ""}`}
            onClick={() => setSide("starboard")}
            aria-pressed={side === "starboard"}
          >
            <span>Estribor</span>
            <small>lado derecho</small>
          </button>
        </div>

        <div className="control-row">
          <label>
            <span>Masa</span>
            <Select value={String(massKg)} onValueChange={(value) => setMassKg(Number(value))}>
              <SelectTrigger className="select-wide" aria-label="Masa del contenedor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 40, 50].map((tons) => (
                  <SelectItem key={tons} value={String(tons * 1000)}>{tons} toneladas</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label>
            <span>Posición longitudinal</span>
            <Select value={String(longitudinal)} onValueChange={(value) => setLongitudinal(Number(value))}>
              <SelectTrigger className="select-wide" aria-label="Posición longitudinal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-10">Popa</SelectItem>
                <SelectItem value="0">Centro</SelectItem>
                <SelectItem value="10">Proa</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>

        <Button
          className="primary-action"
          size="lg"
          onClick={() => run({ type: "add", side, massKg, longitudinal })}
        >
          <Box /> Agregar {massKg / 1000} t a {side === "port" ? "babor" : "estribor"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="secondary-action"
          disabled={disabled || busy || ownLoadCount === 0}
          onClick={() => run({ type: "remove" })}
        >
          <RotateCcw /> Retirar {ownLoadCount > 0 ? "mi última carga" : "carga"}
        </Button>
      </fieldset>
      {localError && <p className="inline-error" role="alert">{localError}</p>}
    </section>
  );
}
