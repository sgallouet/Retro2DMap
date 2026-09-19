import type { WorldCommand } from "../domain/commands";
import type {
  GenerationPlan,
  GenerationRequest,
  IWorldGenerator,
} from "./WorldGenerator";

const hashSeed = (seed: number): number => {
  let x = seed | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
};

/**
 * Small deterministic example generator.
 *
 * Its job is not to be the final world algorithm; it proves that procedural
 * builders can emit the exact same semantic commands consumed by editor/AI
 * workflows rather than drawing tiles directly.
 */
export class VillageBlockGenerator implements IWorldGenerator {
  plan(request: GenerationRequest): GenerationPlan {
    const { origin, width, height } = request.region;
    if (width < 16 || height < 12) {
      throw new Error("Village block requires at least a 16×12 region.");
    }

    const commands: WorldCommand[] = [];
    const horizontalY = origin.y + Math.floor(height / 2);
    const verticalX = origin.x + Math.floor(width / 2);
    const seed = hashSeed(request.seed);

    commands.push({
      type: "paint-terrain-rect",
      terrainId: "grass",
      from: { x: origin.x, y: origin.y },
      to: { x: origin.x + width - 1, y: origin.y + height - 1 },
    });

    // Prefab positions occupy separate quadrants and remain deterministic.
    commands.push({
      type: "place-prefab",
      prefabId: "village-cottage-yard",
      anchor: { x: origin.x + 1, y: origin.y + 1 },
    });

    const secondX = origin.x + width - 8;
    const secondY = origin.y + height - 7;
    commands.push({
      type: "place-prefab",
      prefabId: "village-cottage-yard",
      anchor: { x: secondX, y: secondY },
    });

    // Roads are painted after prefab terrain so the global circulation graph
    // stays continuous through generated compounds.
    commands.push({
      type: "paint-terrain-path",
      terrainId: "path",
      width: 1,
      points: [
        { x: origin.x, y: horizontalY },
        { x: origin.x + width - 1, y: horizontalY },
      ],
    });
    commands.push({
      type: "paint-terrain-path",
      terrainId: "path",
      width: 1,
      points: [
        { x: verticalX, y: origin.y },
        { x: verticalX, y: origin.y + height - 1 },
      ],
    });

    const treeId = (seed & 1) === 0 ? "tree-round" : "tree-pine";
    const oppositeTreeId = treeId === "tree-round" ? "tree-pine" : "tree-round";

    commands.push(
      {
        type: "place-prop",
        catalogId: treeId,
        coord: { x: origin.x, y: origin.y },
        overlapPolicy: "reject",
      },
      {
        type: "place-prop",
        catalogId: oppositeTreeId,
        coord: { x: origin.x + width - 1, y: origin.y + height - 2 },
        overlapPolicy: "reject",
      },
    );

    return {
      id: `village-block:${request.seed}`,
      label: "Generated Village Block",
      commands,
    };
  }
}
