import { describe, expect, it } from "vitest";
import {
  rotateQuarterTurn,
  rotatedFootprint,
} from "./geometry";

describe("quarter-turn geometry", () => {
  it("swaps rectangular footprints at 90 and 270 degrees", () => {
    expect(rotatedFootprint({ width: 3, height: 1 }, 0)).toEqual({
      width: 3,
      height: 1,
    });
    expect(rotatedFootprint({ width: 3, height: 1 }, 90)).toEqual({
      width: 1,
      height: 3,
    });
    expect(rotatedFootprint({ width: 3, height: 1 }, 270)).toEqual({
      width: 1,
      height: 3,
    });
  });

  it("rotates clockwise and counter-clockwise deterministically", () => {
    expect(rotateQuarterTurn(0, true)).toBe(90);
    expect(rotateQuarterTurn(0, false)).toBe(270);
    expect(rotateQuarterTurn(270, true)).toBe(0);
  });
});
