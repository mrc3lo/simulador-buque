import type { CargoLoad, Side } from "@/lib/types";

export const SHIP = {
  lengthM: 40,
  beamM: 12,
  initialDraftM: 2,
  seawaterDensityKgM3: 1025,
  emptyKgM: 2.5,
  firstContainerKgM: 4.5,
  containerHeightM: 2.6,
} as const;

export interface PositionedLoad extends CargoLoad {
  transverseM: number;
  heightM: number;
  stackLevel: number;
}

export interface ShipMetrics {
  cargoMassKg: number;
  totalMassKg: number;
  displacedVolumeM3: number;
  draftM: number;
  kgM: number;
  kbM: number;
  bmM: number;
  kmM: number;
  gmM: number;
  transverseGM: number;
  heelingMomentKgM: number;
  heelRadians: number;
  heelDegrees: number;
  stable: boolean;
  portCount: number;
  starboardCount: number;
  positionedLoads: PositionedLoad[];
}

const initialVolumeM3 =
  SHIP.lengthM * SHIP.beamM * SHIP.initialDraftM;
export const EMPTY_SHIP_MASS_KG =
  initialVolumeM3 * SHIP.seawaterDensityKgM3;

export function sideLabel(side: Side): string {
  return side === "port" ? "babor" : "estribor";
}

export function positionLoads(loads: CargoLoad[]): PositionedLoad[] {
  const stacks = new Map<string, number>();

  return [...loads]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((load) => {
      const key = `${load.longitudinal}:${load.side}`;
      const stackLevel = stacks.get(key) ?? 0;
      stacks.set(key, stackLevel + 1);

      return {
        ...load,
        transverseM: load.side === "port" ? -3 : 3,
        heightM:
          SHIP.firstContainerKgM + stackLevel * SHIP.containerHeightM,
        stackLevel,
      };
    });
}

export function calculateShipMetrics(loads: CargoLoad[]): ShipMetrics {
  const positionedLoads = positionLoads(loads);
  let cargoMassKg = 0;
  let verticalMomentKgM = EMPTY_SHIP_MASS_KG * SHIP.emptyKgM;
  let transverseMomentKgM = 0;

  for (const load of positionedLoads) {
    cargoMassKg += load.massKg;
    verticalMomentKgM += load.massKg * load.heightM;
    transverseMomentKgM += load.massKg * load.transverseM;
  }

  const totalMassKg = EMPTY_SHIP_MASS_KG + cargoMassKg;
  const kgM = verticalMomentKgM / totalMassKg;
  const transverseGM = transverseMomentKgM / totalMassKg;
  const displacedVolumeM3 = totalMassKg / SHIP.seawaterDensityKgM3;
  const draftM = displacedVolumeM3 / (SHIP.lengthM * SHIP.beamM);
  const kbM = draftM / 2;
  const waterplaneInertiaM4 =
    (SHIP.lengthM * Math.pow(SHIP.beamM, 3)) / 12;
  const bmM = waterplaneInertiaM4 / displacedVolumeM3;
  const kmM = kbM + bmM;
  const gmM = kmM - kgM;
  const stable = gmM > 0;
  const heelRadians = stable
    ? Math.atan(transverseMomentKgM / (totalMassKg * gmM))
    : Math.sign(transverseMomentKgM || 1) * (Math.PI / 6);

  return {
    cargoMassKg,
    totalMassKg,
    displacedVolumeM3,
    draftM,
    kgM,
    kbM,
    bmM,
    kmM,
    gmM,
    transverseGM,
    heelingMomentKgM: Math.abs(transverseMomentKgM),
    heelRadians,
    heelDegrees: (heelRadians * 180) / Math.PI,
    stable,
    portCount: positionedLoads.filter((load) => load.side === "port").length,
    starboardCount: positionedLoads.filter(
      (load) => load.side === "starboard",
    ).length,
    positionedLoads,
  };
}
