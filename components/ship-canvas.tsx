"use client";

import { useEffect, useRef, useState } from "react";
import type { ShipMetrics } from "@/lib/physics";

interface P5Canvas {
  WEBGL: string;
  HALF_PI: number;
  TRIANGLES: string;
  width: number;
  height: number;
  setup?: () => void;
  draw?: () => void;
  windowResized?: () => void;
  createCanvas: (width: number, height: number, renderer: string) => void;
  resizeCanvas: (width: number, height: number) => void;
  pixelDensity: (density: number) => void;
  background: (...values: number[]) => void;
  orbitControl: (...values: number[]) => void;
  ambientLight: (...values: number[]) => void;
  directionalLight: (...values: number[]) => void;
  push: () => void;
  pop: () => void;
  translate: (x: number, y: number, z?: number) => void;
  rotateX: (angle: number) => void;
  rotateY: (angle: number) => void;
  noStroke: () => void;
  stroke: (...values: number[]) => void;
  strokeWeight: (weight: number) => void;
  fill: (...values: number[]) => void;
  plane: (width: number, height: number) => void;
  box: (width: number, height?: number, depth?: number) => void;
  sphere: (radius: number) => void;
  line: (...values: number[]) => void;
  beginShape: (kind: string) => void;
  vertex: (x: number, y: number, z: number) => void;
  endShape: () => void;
  textSize: (size: number) => void;
  text: (value: string, x: number, y: number) => void;
}

declare global {
  interface Window {
    p5?: new (
      sketch: (p: P5Canvas) => void,
      node: HTMLElement,
    ) => { remove: () => void };
  }
}

export function ShipCanvas({ metrics }: { metrics: ShipMetrics }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef(metrics);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    let instance: { remove: () => void } | undefined;
    let disposed = false;

    const start = () => {
      if (disposed || !containerRef.current || !window.p5) return;
      instance = new window.p5((p) => makeSketch(p, containerRef, metricsRef), containerRef.current);
    };

    if (window.p5) {
      start();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-p5="ship-simulator"]',
      );
      const script = existing ?? document.createElement("script");
      if (!existing) {
        script.src = "/p5.min.js";
        script.async = true;
        script.dataset.p5 = "ship-simulator";
        document.head.appendChild(script);
      }
      script.addEventListener("load", start, { once: true });
      script.addEventListener("error", () => setFailed(true), { once: true });
    }

    return () => {
      disposed = true;
      instance?.remove();
    };
  }, []);

  return (
    <div className="ship-viewport" aria-label="Visualización 3D del buque">
      <div ref={containerRef} className="ship-canvas" />
      <div className="canvas-hint">Arrastra para rotar · rueda para acercar</div>
      {failed && (
        <div className="canvas-error">No se pudo cargar la visualización 3D.</div>
      )}
    </div>
  );
}

function makeSketch(
  p: P5Canvas,
  containerRef: React.RefObject<HTMLDivElement | null>,
  metricsRef: React.MutableRefObject<ShipMetrics>,
) {
  const canvasSize = () => {
    const width = Math.max(320, Math.min(containerRef.current?.clientWidth ?? 760, 900));
    return { width, height: Math.max(390, Math.round(width * 0.62)) };
  };

  p.setup = () => {
    const size = canvasSize();
    p.createCanvas(size.width, size.height, p.WEBGL);
    p.pixelDensity(Math.min(window.devicePixelRatio, 2));
  };

  p.windowResized = () => {
    const size = canvasSize();
    p.resizeCanvas(size.width, size.height);
  };

  p.draw = () => {
    const metrics = metricsRef.current;
    p.background(7, 29, 46);
    p.orbitControl(1, 1, 0.12);
    p.ambientLight(125);
    p.directionalLight(255, 244, 214, -0.7, -1, -0.5);
    p.directionalLight(60, 180, 220, 0.8, 0.2, -1);

    const draftVisual = Math.min(118, (metrics.draftM / 5) * 118);
    const waterY = 58;

    p.push();
    p.translate(0, waterY, 0);
    p.rotateX(p.HALF_PI);
    p.noStroke();
    p.fill(17, 113, 157, 215);
    p.plane(1150, 1000);
    p.pop();

    p.push();
    p.translate(0, -25 + draftVisual, 0);
    p.rotateX(metrics.heelRadians);
    drawHull(p);

    p.push();
    p.translate(0, -44, 0);
    p.noStroke();
    p.fill(183, 194, 199);
    p.box(310, 9, 94);
    p.pop();

    p.push();
    p.translate(92, -78, 0);
    p.fill(231, 235, 234);
    p.box(78, 58, 62);
    p.translate(18, -40, 0);
    p.fill(173, 198, 207);
    p.box(42, 22, 62);
    p.pop();

    for (const load of metrics.positionedLoads) {
      p.push();
      p.translate(
        load.longitudinal * 10,
        -72 - load.stackLevel * 31,
        load.transverseM * 12,
      );
      p.noStroke();
      if (load.side === "port") p.fill(225, 70, 62);
      else p.fill(21, 184, 166);
      p.box(62, 29, 28);
      p.pop();
    }

    drawReferencePoints(p, metrics);
    p.pop();
  };
}

function drawHull(p: P5Canvas) {
  const bow = 185;
  const stern = -185;
  const beam = 49;
  const bottom = 40;
  const deck = -40;
  p.push();
  p.fill(39, 74, 91);
  p.stroke(112, 166, 186);
  p.strokeWeight(1.2);
  p.beginShape(p.TRIANGLES);
  const triangles = [
    [bow, deck, -beam, bow + 38, deck, 0, bow, deck, beam],
    [stern, deck, -beam, bow, deck, -beam, bow, bottom, 0],
    [stern, deck, -beam, bow, bottom, 0, stern, bottom, 0],
    [stern, deck, beam, bow, bottom, 0, bow, deck, beam],
    [stern, deck, beam, stern, bottom, 0, bow, bottom, 0],
    [stern, bottom, 0, bow, bottom, 0, stern, bottom, -beam],
    [stern, bottom, 0, bow, bottom, 0, stern, bottom, beam],
  ];
  for (const triangle of triangles) {
    for (let i = 0; i < triangle.length; i += 3) {
      p.vertex(triangle[i], triangle[i + 1], triangle[i + 2]);
    }
  }
  p.endShape();
  p.pop();
}

function drawReferencePoints(p: P5Canvas, metrics: ShipMetrics) {
  const keel = 35;
  const scale = 14;
  const front = 74;
  const points = [
    { label: "G", y: keel - metrics.kgM * scale, x: metrics.transverseGM * 11, color: [241, 86, 79] },
    { label: "B", y: keel - metrics.kbM * scale, x: 0, color: [62, 157, 255] },
    { label: "M", y: keel - metrics.kmM * scale, x: 0, color: [45, 211, 164] },
  ];
  for (const point of points) {
    p.push();
    p.translate(point.x, point.y, front);
    p.noStroke();
    p.fill(...point.color);
    p.sphere(7);
    p.translate(12, 1, 0);
    p.textSize(17);
    p.text(point.label, 0, 0);
    p.pop();
  }
}
