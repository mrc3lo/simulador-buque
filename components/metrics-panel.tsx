import { Activity, Anchor, Gauge, Scale, Waves } from "lucide-react";
import { SHIP, type ShipMetrics } from "@/lib/physics";

const tons = (kg: number) => `${(kg / 1000).toFixed(1)} t`;

export function MetricsPanel({ metrics }: { metrics: ShipMetrics }) {
  const metricsList = [
    { label: "Desplazamiento", value: tons(metrics.totalMassKg), icon: Scale },
    { label: "Carga total", value: tons(metrics.cargoMassKg), icon: Anchor },
    { label: "Calado", value: metrics.floats ? `${metrics.draftM.toFixed(2)} m` : `> ${SHIP.maxDraftM.toFixed(2)} m`, icon: Waves },
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
        <div className={`buoyancy-status ${metrics.floats ? "is-floating" : "is-sinking"}`}>
          <span>Flotabilidad según Arquímedes</span>
          <strong>{metrics.floats ? "FLOTA" : "SE HUNDE"}</strong>
          <small>Empuje máx. {`${(metrics.maxBuoyantForceN / 1_000_000).toFixed(2)} MN`} {metrics.floats ? "≥" : "<"} peso {`${(metrics.weightForceN / 1_000_000).toFixed(2)} MN`}</small>
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
        <summary>Parámetros de Flotabilidad y Estabilidad</summary>
        <dl>
          <div><dt>Desplazamiento (Δ)</dt><dd>{tons(metrics.totalMassKg)}</dd></div>
          <div><dt>Volumen desplazado (∇)</dt><dd>{metrics.displacedVolumeM3.toFixed(2)} m³</dd></div>
          <div><dt>Volumen requerido para flotar</dt><dd>{metrics.requiredDisplacedVolumeM3.toFixed(2)} m³</dd></div>
          <div><dt>Calado requerido (T)</dt><dd>{metrics.floats ? `${metrics.draftM.toFixed(2)} m` : `> ${SHIP.maxDraftM.toFixed(2)} m (requiere ${metrics.draftM.toFixed(2)} m)`}</dd></div>
          <div><dt>Densidad media del buque</dt><dd>{metrics.averageDensityKgM3.toFixed(1)} kg/m³</dd></div>
          <div><dt>Densidad del agua de mar</dt><dd>{SHIP.seawaterDensityKgM3} kg/m³</dd></div>
          <div><dt>KG</dt><dd>{metrics.kgM.toFixed(2)} m</dd></div>
          <div><dt>KB</dt><dd>{metrics.kbM.toFixed(2)} m</dd></div>
          <div><dt>BM</dt><dd>{metrics.bmM.toFixed(2)} m</dd></div>
          <div><dt>KM</dt><dd>{metrics.kmM.toFixed(2)} m</dd></div>
          <div><dt>GM</dt><dd>{metrics.gmM.toFixed(2)} m</dd></div>
          <div><dt>G transversal (yG)</dt><dd>{metrics.transverseGM.toFixed(2)} m</dd></div>
          <div><dt>Momento escorante</dt><dd>{(metrics.heelingMomentKgM / 1000).toFixed(1)} t·m</dd></div>
        </dl>
        <div className="parameter-legend">
          <h3>Leyenda de variables</h3>
          <ul>
            <li><strong>Δ:</strong> desplazamiento, masa total equivalente al agua desplazada.</li>
            <li><strong>∇:</strong> volumen de agua desplazado por el casco.</li>
            <li><strong>T:</strong> calado, distancia de la quilla a la línea de flotación.</li>
            <li><strong>Flotabilidad:</strong> compara el empuje máximo del casco (calado límite {SHIP.maxDraftM} m) con el peso total; si el casco supera ese límite, se hunde.</li>
            <li><strong>Densidad media:</strong> masa total dividida por el volumen máximo del casco; debe ser menor o igual a la densidad del agua para flotar.</li>
            <li><strong>KG:</strong> altura del centro de gravedad sobre la quilla.</li>
            <li><strong>KB:</strong> altura del centro de carena o flotabilidad sobre la quilla.</li>
            <li><strong>BM:</strong> distancia del centro de carena al metacentro.</li>
            <li><strong>KM:</strong> altura del metacentro sobre la quilla (KB + BM).</li>
            <li><strong>GM:</strong> altura metacéntrica (KM − KG); indica la estabilidad inicial.</li>
            <li><strong>yG:</strong> desplazamiento transversal del centro de gravedad desde la línea central.</li>
          </ul>
        </div>
      </details>
    </section>
  );
}
