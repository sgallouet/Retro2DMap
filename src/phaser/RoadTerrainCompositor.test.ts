import { describe, expect, it } from "vitest";
import { ALL_CARDINAL, EAST, NORTH, NORTH_EAST, SOUTH, WEST } from "../domain/autotile";
import { applyRoadContour, roadContourPlan } from "./RoadTerrainCompositor";
import { terrainTransitionKey } from "./ProceduralAssetProvider";

const alphaContext = (): { alpha: Uint8Array; context: CanvasRenderingContext2D } => {
  const alpha = new Uint8Array(48 * 48).fill(255);
  const context = {
    clearRect(x: number, y: number, width: number, height: number) {
      for (let yy = y; yy < y + height; yy += 1) {
        for (let xx = x; xx < x + width; xx += 1) {
          if (xx >= 0 && yy >= 0 && xx < 48 && yy < 48) alpha[yy * 48 + xx] = 0;
        }
      }
    },
    drawImage(
      _image: CanvasImageSource,
      _sourceX: number,
      _sourceY: number,
      _sourceWidth: number,
      _sourceHeight: number,
      destinationX: number,
      destinationY: number,
      destinationWidth: number,
      destinationHeight: number,
    ) {
      for (let yy = destinationY; yy < destinationY + destinationHeight; yy += 1) {
        for (let xx = destinationX; xx < destinationX + destinationWidth; xx += 1) {
          if (xx >= 0 && yy >= 0 && xx < 48 && yy < 48) alpha[yy * 48 + xx] = 255;
        }
      }
    },
    fillRect(x: number, y: number, width: number, height: number) {
      for (let yy = y; yy < y + height; yy += 1) {
        for (let xx = x; xx < x + width; xx += 1) {
          if (xx >= 0 && yy >= 0 && xx < 48 && yy < 48) alpha[yy * 48 + xx] = 255;
        }
      }
    },
  } as unknown as CanvasRenderingContext2D;
  return { alpha, context };
};

describe("road terrain contour", () => {
  it("keeps an interior road tile completely opaque", () => {
    expect(roadContourPlan("path", 48, 48, ALL_CARDINAL, 0)).toEqual([]);
  });

  it("uses a narrow stepped contour on exposed sides", () => {
    const rects = roadContourPlan("path", 48, 48, SOUTH | EAST | WEST, 0);

    expect(rects).toHaveLength(6);
    expect(rects.slice(0, 3).every((rect) => rect.y === 0 && rect.height <= 3)).toBe(true);
    expect(rects.every((rect) => rect.width > 0 && rect.height > 0)).toBe(true);
  });

  it("does not cut a connected shared boundary", () => {
    const northConnected = roadContourPlan("cobble", 48, 48, NORTH | EAST | SOUTH | WEST, 0);
    const eastOpen = roadContourPlan("cobble", 48, 48, NORTH | SOUTH | WEST, 0);

    expect(northConnected).toEqual([]);
    expect(eastOpen).toHaveLength(6);
    expect(eastOpen.every((rect) => rect.x >= 46)).toBe(true);
  });

  it("adds a stepped inner-corner opening without adding a broad border", () => {
    const rects = roadContourPlan("path", 48, 48, ALL_CARDINAL, NORTH_EAST);

    expect(rects).toEqual([
      { x: 47, y: 0, width: 1, height: 1 },
      { x: 46, y: 1, width: 2, height: 1 },
      { x: 45, y: 2, width: 3, height: 1 },
    ]);
  });

  it("keeps material-aware transition keys distinct from empty road neighbors", () => {
    const empty = { grass: 0, path: 0, cobble: 0 } as const;
    const grassNorth = { grass: NORTH, path: 0, cobble: 0 } as const;
    const grassAndCobble = { grass: 0, path: 0, cobble: EAST } as const;

    expect(terrainTransitionKey("path", empty)).toBe("");
    expect(terrainTransitionKey("path", grassNorth)).toBe("g1");
    expect(terrainTransitionKey("grass", grassAndCobble)).toBe("p0-c2");
    expect(terrainTransitionKey("grass", { grass: 0, path: EAST, cobble: 0 })).not.toBe(
      terrainTransitionKey("grass", grassAndCobble),
    );
  });

  it("fills every exposed road contour pixel when the neighboring material is grass", () => {
    const { alpha, context } = alphaContext();
    applyRoadContour(
      context,
      "path",
      48,
      48,
      0,
      0,
      NORTH | EAST | SOUTH | WEST,
      { image: {} as CanvasImageSource, size: 48 },
    );

    expect([...alpha].every((value) => value === 255)).toBe(true);
  });

  it("keeps the existing transparent exposed-road behavior when the neighbor is empty", () => {
    const { alpha, context } = alphaContext();
    applyRoadContour(context, "path", 48, 48, 0, 0);

    expect([...alpha].some((value) => value === 0)).toBe(true);
  });
});
