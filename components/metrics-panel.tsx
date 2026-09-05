import { Activity, Anchor, Gauge, Scale, Waves } from "lucide-react";
import type { ShipMetrics } from "@/lib/physics";

const tons = (kg: number) => `${(kg / 1000).toFixed(1)} t`;

export function MetricsPanel({ metrics }: { metrics: ShipMetrics }) {
  const metricsList = [
    { label: "Desplazamiento", value: tons(metrics.totalMassKg), icon: Scale },
    { label: "Carga total", value: tons(metrics.cargoMassKg), icon: Anchor },
    { label: "Calado", value: `${metrics.draftM.toFixed(2)} m`, icon: Waves },
    { label: "Altura GM", value: `${metrics.gmM.toFixed(2)} m`, icon: Gauge },
    { label: "Escora", value: `${Math.abs(metrics.heelDegrees).toFixed(2)}°`, icon: Activity },
  ];

  return (
    <section className="metrics-panel" aria-label="Resultados de estabilidad">
      <div className={`stability-banner ${metrics.stable ? "is-stable" : "is-unstable"}`}>
        <span className="status-orb" />
        <div>
          <span>Estado del buque</span>
          <strong>{metrics.stable ? "ESTABLE" : "INESTABLE"}</strong>
        </div>
      </div>

      <div className="metric-grid">
        {metricsList.map(({ label, value, icon: Icon }) => (
          <article className="metric-card" key={label}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <details className="technical-details">
        <summary>Ver parámetros navales</summary>
        <dl>
          <div><dt>Volumen desplazado</dt><dd>{metrics.displacedVolumeM3.toFixed(2)} m³</dd></div>
          <div><dt>KG</dt><dd>{metrics.kgM.toFixed(2)} m</dd></div>
          <div><dt>KB</dt><dd>{metrics.kbM.toFixed(2)} m</dd></div>
          <div><dt>BM</dt><dd>{metrics.bmM.toFixed(2)} m</dd></div>
          <div><dt>KM</dt><dd>{metrics.kmM.toFixed(2)} m</dd></div>
          <div><dt>G transversal</dt><dd>{metrics.transverseGM.toFixed(2)} m</dd></div>
          <div><dt>Momento escorante</dt><dd>{(metrics.heelingMomentKgM / 1000).toFixed(1)} t·m</dd></div>
        </dl>
      </details>
    </section>
  );
}
