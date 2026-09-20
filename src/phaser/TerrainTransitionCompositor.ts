import Phaser from "phaser";
import type { IWorldCatalog, TerrainDefinition } from "../domain/catalog";
import {
  ALL_CARDINAL,
  ALL_NEIGHBORS,
  EAST,
  NORTH,
  SOUTH,
  WEST,
  terrainTopologyKey,
} from "../domain/autotile";
import { TILE_SIZE } from "../domain/map";
import type { AssetRenderContext, IAssetProvider, TextureRef } from "./IAssetProvider";

export type TerrainTransitionSide = "north" | "east" | "south" | "west";
export type TerrainTransitionMode = "edge-art" | "blend";

const TRANSITION_BAND = 14;

const sourceOpenBit = (side: TerrainTransitionSide): number => {
  switch (side) {
    case "north":
      return SOUTH;
    case "east":
      return WEST;
    case "south":
      return NORTH;
    case "west":
      return EAST;
  }
};

export const terrainTransitionMode = (
  terrain: TerrainDefinition,
): TerrainTransitionMode => (terrain.edgeStyle === "none" ? "blend" : "edge-art");

/**
 * Builds transparent edge overlays for layered roads.
 *
 * Priority:
 * 1. Reuse the adjacent terrain's own exposed-edge topology art.
 * 2. If that terrain declares no edge art, blend its interior texture into the
 *    road with a feathered alpha ramp (the same primary/secondary surface idea
 *    used by WorldXplore terrain blending).
 */
export class TerrainTransitionCompositor {
  readonly #generatedKeys = new Set<string>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly catalog: IWorldCatalog,
    private readonly assets: IAssetProvider,
  ) {}

  overlayRef(
    roadId: string,
    neighbor: TerrainDefinition,
    side: TerrainTransitionSide,
    x: number,
    y: number,
  ): TextureRef | undefined {
    const mode = terrainTransitionMode(neighbor);
    const variation = this.variation(x, y, neighbor.id);
    const key = `transition:${roadId}:${neighbor.id}:${side}:${mode}:v${variation}`;

    if (this.scene.textures.exists(key)) return { key };

    const source = this.sourceFrame(neighbor, side, mode, x, y, variation);
    if (!source) return undefined;

    const texture = this.scene.textures.createCanvas(key, TILE_SIZE, TILE_SIZE);
    if (!texture) return undefined;

    const ctx = texture.getContext();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);

    if (mode === "edge-art") {
      this.drawEdgeStrip(ctx, source, side);
    } else {
      this.drawFeatheredBlend(ctx, source, side);
    }

    texture.refresh();
    this.#generatedKeys.add(key);
    return { key };
  }

  destroy(): void {
    this.#generatedKeys.forEach((key) => {
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    });
    this.#generatedKeys.clear();
  }

  private sourceFrame(
    terrain: TerrainDefinition,
    side: TerrainTransitionSide,
    mode: TerrainTransitionMode,
    x: number,
    y: number,
    variation: number,
  ): Phaser.Textures.Frame | undefined {
    const context =
      mode === "edge-art"
        ? this.edgeContext(side, variation)
        : this.interiorContext(variation);
    const ref = this.assets.textureRef(terrain, x, y, context);
    if (!this.scene.textures.exists(ref.key)) return undefined;
    const texture = this.scene.textures.get(ref.key);
    return ref.frame === undefined ? texture.get() : texture.get(ref.frame);
  }

  private edgeContext(
    side: TerrainTransitionSide,
    variation: number,
  ): AssetRenderContext {
    const openBit = sourceOpenBit(side);
    const neighborMask = ALL_NEIGHBORS ^ openBit;
    return {
      terrain: {
        neighborMask,
        cardinalMask: ALL_CARDINAL ^ openBit,
        openMask: openBit,
        innerCornerMask: 0,
        topologyKey: terrainTopologyKey(neighborMask),
        variation,
      },
    };
  }

  private interiorContext(variation: number): AssetRenderContext {
    return {
      terrain: {
        neighborMask: ALL_NEIGHBORS,
        cardinalMask: ALL_CARDINAL,
        openMask: 0,
        innerCornerMask: 0,
        topologyKey: terrainTopologyKey(ALL_NEIGHBORS),
        variation,
      },
    };
  }

  private drawEdgeStrip(
    ctx: CanvasRenderingContext2D,
    frame: Phaser.Textures.Frame,
    side: TerrainTransitionSide,
  ): void {
    const image = frame.source.image as unknown as CanvasImageSource;
    const sx = frame.cutX;
    const sy = frame.cutY;
    const sw = frame.cutWidth;
    const sh = frame.cutHeight;
    const bandX = Math.max(1, (sw * TRANSITION_BAND) / TILE_SIZE);
    const bandY = Math.max(1, (sh * TRANSITION_BAND) / TILE_SIZE);

    switch (side) {
      case "north":
        ctx.drawImage(
          image,
          sx,
          sy + sh - bandY,
          sw,
          bandY,
          0,
          0,
          TILE_SIZE,
          TRANSITION_BAND,
        );
        break;
      case "east":
        ctx.drawImage(
          image,
          sx,
          sy,
          bandX,
          sh,
          TILE_SIZE - TRANSITION_BAND,
          0,
          TRANSITION_BAND,
          TILE_SIZE,
        );
        break;
      case "south":
        ctx.drawImage(
          image,
          sx,
          sy,
          sw,
          bandY,
          0,
          TILE_SIZE - TRANSITION_BAND,
          TILE_SIZE,
          TRANSITION_BAND,
        );
        break;
      case "west":
        ctx.drawImage(
          image,
          sx + sw - bandX,
          sy,
          bandX,
          sh,
          0,
          0,
          TRANSITION_BAND,
          TILE_SIZE,
        );
        break;
    }
  }

  private drawFeatheredBlend(
    ctx: CanvasRenderingContext2D,
    frame: Phaser.Textures.Frame,
    side: TerrainTransitionSide,
  ): void {
    const temp = document.createElement("canvas");
    temp.width = TILE_SIZE;
    temp.height = TILE_SIZE;
    const tempCtx = temp.getContext("2d");
    if (!tempCtx) return;

    tempCtx.imageSmoothingEnabled = false;
    tempCtx.drawImage(
      frame.source.image as unknown as CanvasImageSource,
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
      0,
      0,
      TILE_SIZE,
      TILE_SIZE,
    );

    tempCtx.globalCompositeOperation = "destination-in";
    const gradient = this.blendGradient(tempCtx, side);
    tempCtx.fillStyle = gradient;
    tempCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    tempCtx.globalCompositeOperation = "source-over";

    ctx.drawImage(temp, 0, 0);
  }

  private blendGradient(
    ctx: CanvasRenderingContext2D,
    side: TerrainTransitionSide,
  ): CanvasGradient {
    let gradient: CanvasGradient;

    switch (side) {
      case "north":
        gradient = ctx.createLinearGradient(0, 0, 0, TRANSITION_BAND);
        gradient.addColorStop(0, "rgba(255,255,255,0.96)");
        gradient.addColorStop(0.42, "rgba(255,255,255,0.76)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        return gradient;
      case "east":
        gradient = ctx.createLinearGradient(
          TILE_SIZE - TRANSITION_BAND,
          0,
          TILE_SIZE,
          0,
        );
        gradient.addColorStop(0, "rgba(255,255,255,0)");
        gradient.addColorStop(0.58, "rgba(255,255,255,0.76)");
        gradient.addColorStop(1, "rgba(255,255,255,0.96)");
        return gradient;
      case "south":
        gradient = ctx.createLinearGradient(
          0,
          TILE_SIZE - TRANSITION_BAND,
          0,
          TILE_SIZE,
        );
        gradient.addColorStop(0, "rgba(255,255,255,0)");
        gradient.addColorStop(0.58, "rgba(255,255,255,0.76)");
        gradient.addColorStop(1, "rgba(255,255,255,0.96)");
        return gradient;
      case "west":
        gradient = ctx.createLinearGradient(0, 0, TRANSITION_BAND, 0);
        gradient.addColorStop(0, "rgba(255,255,255,0.96)");
        gradient.addColorStop(0.42, "rgba(255,255,255,0.76)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        return gradient;
    }
  }

  private variation(x: number, y: number, terrainId: string): number {
    let salt = 0;
    for (let index = 0; index < terrainId.length; index += 1) {
      salt = Math.imul(salt ^ terrainId.charCodeAt(index), 16777619);
    }
    return (
      (Math.imul(x + 17, 73_856_093) ^
        Math.imul(y + 29, 19_349_663) ^
        salt) >>>
      0
    ) % 4;
  }
}
