import Phaser from "phaser";
import type { IWorldCatalog } from "../domain/catalog";
import type { MapDocument } from "../domain/map";
import { TILE_SIZE } from "../domain/map";
import fragment from "./waveWater.frag?raw";

/** Board-sized animated water surface driven by the semantic water cells. */
export class WaterSurface {
  readonly #textureKey = "wave-water-mask";
  readonly #scene: Phaser.Scene;
  readonly #catalog: IWorldCatalog;
  readonly #motion: number;
  #shader: Phaser.GameObjects.Shader | undefined;
  #time = 0;

  constructor(scene: Phaser.Scene, catalog: IWorldCatalog) {
    this.#scene = scene;
    this.#catalog = catalog;
    this.#motion = typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
    this.#scene.events.on("update", this.update, this);
  }

  render(document: MapDocument): void {
    this.clearSurface();
    if (this.#scene.game.renderer.type !== Phaser.WEBGL) {
      throw new Error("Animated water requires WebGL.");
    }

    const cells: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < document.height; y += 1) {
      for (let x = 0; x < document.width; x += 1) {
        const tile = document.tiles[y * document.width + x];
        const terrain = tile?.terrainId ? this.#catalog.get(tile.terrainId) : undefined;
        if (terrain?.layer === "terrain" && terrain.connectGroup === "water") {
          cells.push({ x, y });
        }
      }
    }
    if (cells.length === 0) return;

    const minX = Math.min(...cells.map((cell) => cell.x));
    const maxX = Math.max(...cells.map((cell) => cell.x));
    const minY = Math.min(...cells.map((cell) => cell.y));
    const maxY = Math.max(...cells.map((cell) => cell.y));
    const left = minX * TILE_SIZE - 3;
    const top = minY * TILE_SIZE - 3;
    const width = (maxX - minX + 1) * TILE_SIZE + 6;
    const height = (maxY - minY + 1) * TILE_SIZE + 6;

    const texture = this.#scene.textures.createCanvas(this.#textureKey, width, height);
    if (!texture) throw new Error("Cannot create water mask texture.");
    const ctx = texture.context;
    ctx.fillStyle = "#fff";
    cells.forEach((cell) => {
      ctx.fillRect(cell.x * TILE_SIZE - left, cell.y * TILE_SIZE - top, TILE_SIZE, TILE_SIZE);
    });

    const pixels = ctx.getImageData(0, 0, width, height);
    const distance = new Float32Array(width * height);
    for (let i = 0; i < distance.length; i += 1) {
      distance[i] = (pixels.data[i * 4 + 3] ?? 0) > 127 ? 96 : 0;
    }
    // Two-pass chamfer transform: O(pixels), including diagonal shore distances.
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const i = y * width + x;
        distance[i] = Math.min(
          distance[i] ?? 0,
          (distance[i - 1] ?? 0) + 1,
          (distance[i - width] ?? 0) + 1,
          (distance[i - width - 1] ?? 0) + Math.SQRT2,
          (distance[i - width + 1] ?? 0) + Math.SQRT2,
        );
      }
    }
    for (let y = height - 2; y > 0; y -= 1) {
      for (let x = width - 2; x > 0; x -= 1) {
        const i = y * width + x;
        distance[i] = Math.min(
          distance[i] ?? 0,
          (distance[i + 1] ?? 0) + 1,
          (distance[i + width] ?? 0) + 1,
          (distance[i + width - 1] ?? 0) + Math.SQRT2,
          (distance[i + width + 1] ?? 0) + Math.SQRT2,
        );
      }
    }
    for (let i = 0; i < distance.length; i += 1) {
      pixels.data[i * 4] = Math.round((distance[i] ?? 0) / 96 * 255);
      pixels.data[i * 4 + 1] = pixels.data[i * 4 + 3] ?? 0;
      pixels.data[i * 4 + 2] = 0;
      pixels.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    texture.refresh();

    const base = new Phaser.Display.BaseShader("wave-water", fragment, undefined, {
      environmentTime: { type: "1f", value: this.#time },
      motion: { type: "1f", value: this.#motion },
      mapAlpha: { type: "1f", value: 1 },
    });
    this.#shader = this.#scene.add.shader(
      base,
      left + width / 2,
      top + height / 2,
      width,
      height,
      [this.#textureKey],
      {
        repeat: false,
        wrapS: "clamp_to_edge",
        wrapT: "clamp_to_edge",
        minFilter: "linear",
        magFilter: "linear",
      },
    );
    this.#shader.setDepth(0.5);
  }

  setAlpha(alpha: number): void {
    this.#shader?.setUniform("mapAlpha.value", Math.max(0, Math.min(1, alpha)));
  }

  destroy(): void {
    this.clearSurface();
    this.#scene.events.off("update", this.update, this);
  }

  private update(_time: number, delta: number): void {
    this.#time += delta / 1000;
    this.#shader?.setUniform("environmentTime.value", this.#time);
  }

  private clearSurface(): void {
    this.#shader?.destroy();
    this.#shader = undefined;
    if (this.#scene.textures.exists(this.#textureKey)) {
      this.#scene.textures.remove(this.#textureKey);
    }
  }
}
