export type QuarterTurn = 0 | 90 | 180 | 270;

export interface GridSize {
  width: number;
  height: number;
}

export function normalizeQuarterTurn(value: number): QuarterTurn {
  const normalized = ((value % 360) + 360) % 360;
  if (normalized === 0 || normalized === 90 || normalized === 180 || normalized === 270) {
    return normalized;
  }
  throw new Error(`Rotation must be a quarter turn, got ${value}.`);
}

export function rotateQuarterTurn(
  current: QuarterTurn | undefined,
  clockwise = true,
): QuarterTurn {
  const value = current ?? 0;
  return normalizeQuarterTurn(value + (clockwise ? 90 : -90));
}

export function rotatedFootprint(
  footprint: Readonly<GridSize>,
  rotation: QuarterTurn | undefined,
): GridSize {
  const value = rotation ?? 0;
  return value === 90 || value === 270
    ? { width: footprint.height, height: footprint.width }
    : { width: footprint.width, height: footprint.height };
}
