import Phaser from "phaser";
import type {
  ActorDefinition,
  CatalogEntry,
  IWorldCatalog,
  PropDefinition,
  TerrainDefinition,
} from "../domain/catalog";
import {
  EAST,
  NORTH,
  NORTH_EAST,
  NORTH_WEST,
  SOUTH,
  SOUTH_EAST,
  SOUTH_WEST,
  WEST,
  enumerateTerrainTopologies,
} from "../domain/autotile";
import { TILE_SIZE } from "../domain/map";
import type { AssetRenderContext, IAssetProvider } from "./IAssetProvider";

type Draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const hash = (value: string): number => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const rng = (seed: number): (() => number) => {
  let state = seed || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
};

const rect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke?: string,
): void => {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(x) + 1, Math.round(y) + 1, Math.max(0, Math.round(w) - 2), Math.max(0, Math.round(h) - 2));
  }
};

const ellipse = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  stroke?: string,
): void => {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};

const line = (
  ctx: CanvasRenderingContext2D,
  points: readonly [number, number][],
  stroke: string,
  width = 2,
): void => {
  if (points.length < 2) return;
  const first = points[0];
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first[0], first[1]);
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    if (point) ctx.lineTo(point[0], point[1]);
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
};

export class ProceduralAssetProvider implements IAssetProvider {
  prepare(scene: Phaser.Scene, catalog: IWorldCatalog): void {
    const terrainTopologies = enumerateTerrainTopologies();

    catalog.terrains.forEach((entry) => {
      terrainTopologies.forEach((topology) => {
        for (let variant = 0; variant < 4; variant += 1) {
          this.create(
            scene,
            this.terrainKey(entry.id, variant, topology.topologyKey),
            TILE_SIZE,
            TILE_SIZE,
            (ctx, w, h) => {
              this.drawTerrain(
                ctx,
                w,
                h,
                entry,
                variant,
                topology.cardinalMask,
                topology.innerCornerMask,
              );
            },
          );
        }
      });
    });

    catalog.props.forEach((entry) => {
      const width = entry.footprint.width * TILE_SIZE;
      const height = entry.footprint.height * TILE_SIZE;

      if (entry.network) {
        for (let networkMask = 0; networkMask < 16; networkMask += 1) {
          this.create(
            scene,
            this.networkKey(entry.id, networkMask),
            width,
            height,
            (ctx, w, h) => this.drawProp(ctx, w, h, entry, networkMask),
          );
        }
      } else {
        this.create(
          scene,
          this.entryKey(entry.id),
          width,
          height,
          (ctx, w, h) => this.drawProp(ctx, w, h, entry),
        );
      }
    });

    catalog.actors.forEach((entry) => {
      this.create(scene, this.entryKey(entry.id), TILE_SIZE, TILE_SIZE, (ctx, w, h) => this.drawActor(ctx, w, h, entry));
    });
  }

  textureKey(
    entry: CatalogEntry,
    x: number,
    y: number,
    context?: AssetRenderContext,
  ): string {
    if (entry.layer === "terrain") {
      const variant = context?.terrain?.variation ?? hash(`${entry.id}:${x}:${y}`) % 4;
      const topologyKey = context?.terrain?.topologyKey ?? "c15-i0";
      return this.terrainKey(entry.id, variant, topologyKey);
    }

    if (entry.layer === "prop" && entry.network) {
      return this.networkKey(entry.id, context?.network?.neighborMask ?? 0);
    }

    return this.entryKey(entry.id);
  }

  private create(scene: Phaser.Scene, key: string, width: number, height: number, draw: Draw): void {
    if (scene.textures.exists(key)) return;
    const texture = scene.textures.createCanvas(key, width, height);
    if (!texture) throw new Error(`Could not create texture ${key}`);
    const ctx = texture.getContext();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    draw(ctx, width, height);
    texture.refresh();
  }

  private entryKey(id: string): string {
    return `proc:${id}`;
  }

  private terrainKey(id: string, variant: number, topologyKey: string): string {
    return `proc:${id}:${variant}:${topologyKey}`;
  }

  private networkKey(id: string, neighborMask: number): string {
    return `proc:${id}:network-${neighborMask & 15}`;
  }

  private drawTerrain(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    entry: TerrainDefinition,
    variant: number,
    cardinalMask: number,
    innerCornerMask: number,
  ): void {
    this.drawTerrainBase(ctx, width, height, entry, variant);
    this.drawTerrainEdges(ctx, width, height, entry, cardinalMask, innerCornerMask);
  }

  private drawTerrainBase(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    entry: TerrainDefinition,
    variant: number,
  ): void {
    const random = rng(hash(entry.id) + variant * 997);
    const palette: Record<string, readonly [string, string, string]> = {
      grass: ["#5ebf55", "#70d363", "#388c45"],
      "grass-dark": ["#3e9950", "#53ad57", "#2f743e"],
      path: ["#d9b66b", "#efcf83", "#a67e42"],
      cobble: ["#a9aaa1", "#c4c3b8", "#777c77"],
      "stone-floor": ["#9a9d99", "#b3b5af", "#696e6d"],
      "wood-floor": ["#ad7740", "#c69055", "#6f482c"],
      water: ["#187cc4", "#2f9ee0", "#0b599e"],
      "deep-water": ["#1265ad", "#2089cc", "#08477f"],
      soil: ["#8a5c35", "#a87342", "#5d3d29"],
    };
    const colors = palette[entry.id] ?? ["#777", "#999", "#555"];
    rect(ctx, 0, 0, width, height, colors[0]);

    if (entry.id === "water" || entry.id === "deep-water") {
      for (let y = 5; y < height; y += 9) {
        const offset = Math.floor(random() * 7);
        for (let x = -8 + offset; x < width; x += 18) {
          line(ctx, [[x, y], [x + 5, y - 2], [x + 11, y], [x + 16, y - 2]], colors[1], 2);
        }
      }
      rect(ctx, 0, height - 3, width, 3, colors[2]);
      return;
    }

    if (entry.id === "cobble" || entry.id === "stone-floor") {
      rect(ctx, 0, 0, width, height, colors[0]);
      for (let y = 0; y < height; y += 12) {
        const shift = (Math.floor(y / 12) % 2) * 7;
        for (let x = -shift; x < width; x += 14) {
          rect(ctx, x, y, 13, 11, y % 24 === 0 ? colors[1] : colors[0], colors[2]);
        }
      }
      return;
    }

    if (entry.id === "wood-floor") {
      for (let y = 0; y < height; y += 10) {
        rect(ctx, 0, y, width, 9, y % 20 === 0 ? colors[0] : colors[1]);
        line(ctx, [[0, y + 9], [width, y + 9]], colors[2], 1);
        for (let x = (y / 10) % 2 === 0 ? 16 : 30; x < width; x += 30) {
          line(ctx, [[x, y], [x, y + 9]], colors[2], 1);
        }
      }
      return;
    }

    if (entry.id === "soil") {
      for (let x = 4; x < width; x += 8) line(ctx, [[x, 0], [x - 2, height]], colors[2], 1);
    }

    const count = entry.id === "path" ? 18 : 25;
    for (let i = 0; i < count; i += 1) {
      const x = Math.floor(random() * width);
      const y = Math.floor(random() * height);
      const size = 1 + Math.floor(random() * 3);
      rect(ctx, x, y, size, size, random() > 0.45 ? colors[1] : colors[2]);
    }
  }

  private drawTerrainEdges(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    entry: TerrainDefinition,
    cardinalMask: number,
    innerCornerMask: number,
  ): void {
    if (entry.edgeStyle === "none") return;

    const missingNorth = (cardinalMask & NORTH) === 0;
    const missingEast = (cardinalMask & EAST) === 0;
    const missingSouth = (cardinalMask & SOUTH) === 0;
    const missingWest = (cardinalMask & WEST) === 0;

    if (
      !missingNorth &&
      !missingEast &&
      !missingSouth &&
      !missingWest &&
      innerCornerMask === 0
    ) {
      return;
    }

    const thickness = entry.edgeStyle === "shore" ? 6 : entry.edgeStyle === "hard" ? 3 : 4;
    const edgeColor =
      entry.edgeStyle === "shore"
        ? "#d8c27a"
        : entry.edgeStyle === "hard"
          ? "rgba(49,57,54,.55)"
          : "rgba(44,55,42,.24)";
    const highlight =
      entry.edgeStyle === "shore"
        ? "rgba(247,231,165,.72)"
        : entry.edgeStyle === "hard"
          ? "rgba(235,238,229,.18)"
          : "rgba(255,255,255,.10)";

    if (missingNorth) {
      rect(ctx, 0, 0, width, thickness, edgeColor);
      rect(ctx, 0, thickness, width, 1, highlight);
    }
    if (missingEast) {
      rect(ctx, width - thickness, 0, thickness, height, edgeColor);
      rect(ctx, width - thickness - 1, 0, 1, height, highlight);
    }
    if (missingSouth) {
      rect(ctx, 0, height - thickness, width, thickness, edgeColor);
      rect(ctx, 0, height - thickness - 1, width, 1, highlight);
    }
    if (missingWest) {
      rect(ctx, 0, 0, thickness, height, edgeColor);
      rect(ctx, thickness, 0, 1, height, highlight);
    }

    // Convex outer corners are determined by missing cardinal neighbours.
    if (missingNorth && missingWest) rect(ctx, 0, 0, thickness + 1, thickness + 1, edgeColor);
    if (missingNorth && missingEast) rect(ctx, width - thickness - 1, 0, thickness + 1, thickness + 1, edgeColor);
    if (missingSouth && missingWest) rect(ctx, 0, height - thickness - 1, thickness + 1, thickness + 1, edgeColor);
    if (missingSouth && missingEast) {
      rect(ctx, width - thickness - 1, height - thickness - 1, thickness + 1, thickness + 1, edgeColor);
    }

    // Concave inner corners require diagonal knowledge. These tiny cut-ins are
    // deliberately derived here rather than encoded in map data.
    const innerSize = thickness + 3;
    if ((innerCornerMask & NORTH_EAST) !== 0) {
      rect(ctx, width - innerSize, 0, innerSize, innerSize, edgeColor);
      rect(ctx, width - innerSize - 1, innerSize, innerSize + 1, 1, highlight);
    }
    if ((innerCornerMask & SOUTH_EAST) !== 0) {
      rect(ctx, width - innerSize, height - innerSize, innerSize, innerSize, edgeColor);
      rect(ctx, width - innerSize - 1, height - innerSize - 1, innerSize + 1, 1, highlight);
    }
    if ((innerCornerMask & SOUTH_WEST) !== 0) {
      rect(ctx, 0, height - innerSize, innerSize, innerSize, edgeColor);
      rect(ctx, 0, height - innerSize - 1, innerSize + 1, 1, highlight);
    }
    if ((innerCornerMask & NORTH_WEST) !== 0) {
      rect(ctx, 0, 0, innerSize, innerSize, edgeColor);
      rect(ctx, 0, innerSize, innerSize + 1, 1, highlight);
    }
  }

  private drawProp(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    entry: PropDefinition,
    networkMask = 0,
  ): void {
    switch (entry.id) {
      case "tree-round":
        this.drawTree(ctx, width, height, false);
        return;
      case "tree-pine":
        this.drawTree(ctx, width, height, true);
        return;
      case "flowers":
        this.drawFlowers(ctx, width, height);
        return;
      case "rock":
        ellipse(ctx, width / 2, height * 0.65, 15, 11, "#777f76", "#4f5852");
        ellipse(ctx, width / 2 - 4, height * 0.58, 8, 5, "#aab0a4");
        return;
      case "cliff":
        this.drawCliffNetwork(ctx, width, height, networkMask);
        return;
      case "fence":
        this.drawFenceNetwork(ctx, width, height, networkMask);
        return;
      case "bridge":
        this.drawBridgeNetwork(ctx, width, height, networkMask);
        return;
      case "house-blue":
      case "house-red":
        this.drawHouse(ctx, width, height, entry.id === "house-blue" ? "#2f77ba" : "#b94e32");
        return;
      case "shop-sign":
      case "inn-sign":
        this.drawSign(ctx, width, height, entry.id === "shop-sign" ? "SHOP" : "INN");
        return;
      case "crops":
        for (let x = 5; x < width; x += 9) {
          line(ctx, [[x, height - 4], [x - 1, 13]], "#80622c", 2);
          for (let y = 16; y < height - 5; y += 7) {
            ellipse(ctx, x - 4, y, 4, 2, "#e9c74d");
            ellipse(ctx, x + 3, y + 2, 4, 2, "#d6aa32");
          }
        }
        return;
      case "sheep":
        ellipse(ctx, 24, 27, 16, 10, "#f3f0dd", "#777568");
        ellipse(ctx, 36, 26, 7, 6, "#56574f");
        rect(ctx, 15, 34, 3, 8, "#4d4e48");
        rect(ctx, 30, 34, 3, 8, "#4d4e48");
        return;
      case "boat":
        this.drawBoat(ctx, width, height);
        return;
      case "castle-wall":
        this.drawWallNetwork(ctx, width, height, networkMask);
        return;
      case "castle-tower":
        this.drawTower(ctx, width, height);
        return;
      case "castle-gate":
        this.drawGate(ctx, width, height);
        return;
      case "stairs":
        for (let y = 8; y < height; y += 7) rect(ctx, 2, y, width - 4, 6, "#a8aaa5", "#6a6e6b");
        return;
      case "banner":
        rect(ctx, 13, 2, 22, 31, "#b7202f", "#7a1520");
        ctx.fillStyle = "#e1b846";
        ctx.beginPath();
        ctx.moveTo(13, 33);
        ctx.lineTo(24, 43);
        ctx.lineTo(35, 33);
        ctx.fill();
        ellipse(ctx, 24, 17, 5, 6, "#e4c14f");
        return;
      case "torch":
        rect(ctx, 22, 16, 4, 25, "#6c4327");
        ellipse(ctx, 24, 13, 7, 10, "#f4a72d");
        ellipse(ctx, 24, 12, 3, 6, "#fff0a1");
        return;
      case "fountain":
        this.drawFountain(ctx, width, height);
        return;
      case "statue":
        rect(ctx, 8, 34, 32, 10, "#777d7b", "#505555");
        ellipse(ctx, 24, 23, 12, 14, "#a9afac", "#676d6a");
        ellipse(ctx, 20, 20, 3, 3, "#5d6360");
        ellipse(ctx, 29, 20, 3, 3, "#5d6360");
        return;
      case "bookshelf":
        this.drawBookshelf(ctx, width, height);
        return;
      case "table":
        this.drawTable(ctx, width, height);
        return;
      case "bed-red":
      case "bed-blue":
        this.drawBed(ctx, width, height, entry.id === "bed-red" ? "#a83c3f" : "#3f67a7");
        return;
      case "throne":
        this.drawThrone(ctx, width, height);
        return;
      case "weapon-rack":
        this.drawWeaponRack(ctx, width, height);
        return;
      case "barrels":
        ellipse(ctx, 24, 24, 15, 18, "#8b5b31", "#56391f");
        line(ctx, [[10, 19], [38, 19]], "#4f4f4d", 3);
        line(ctx, [[10, 30], [38, 30]], "#4f4f4d", 3);
        return;
      case "rug-red":
        rect(ctx, 5, 3, width - 10, height - 6, "#9f2734", "#e1b548");
        rect(ctx, 10, 8, width - 20, height - 16, "#b9303e");
        return;
      default:
        rect(ctx, 4, 4, width - 8, height - 8, "#d54f7b", "#6b243e");
    }
  }

  private drawActor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    entry: ActorDefinition,
  ): void {
    ellipse(ctx, width / 2, height - 5, 13, 5, "rgba(25,30,27,.35)");
    const isGuard = entry.id === "guard";
    const isKing = entry.id === "king";
    const isFarmer = entry.id === "farmer";
    const body = isGuard ? "#2d68a4" : isKing ? "#b92637" : entry.id === "hero" ? "#306eaa" : "#5b9f58";

    rect(ctx, 15, 24, 18, 16, body, "#26333b");
    rect(ctx, 18, 38, 5, 7, "#26333b");
    rect(ctx, 27, 38, 5, 7, "#26333b");
    ellipse(ctx, 24, 18, 10, 10, "#f0c69b", "#5f4231");

    if (isGuard) {
      rect(ctx, 14, 8, 20, 10, "#cbd2d3", "#4e5960");
      rect(ctx, 20, 5, 8, 17, "#dce2e1", "#4e5960");
      line(ctx, [[24, 6], [24, 22]], "#567b9c", 2);
    } else if (isKing) {
      ctx.fillStyle = "#e5bd38";
      ctx.beginPath();
      ctx.moveTo(14, 12);
      ctx.lineTo(17, 4);
      ctx.lineTo(22, 10);
      ctx.lineTo(26, 3);
      ctx.lineTo(30, 10);
      ctx.lineTo(35, 4);
      ctx.lineTo(34, 14);
      ctx.fill();
      rect(ctx, 15, 12, 20, 5, "#e5bd38", "#8e6a1c");
    } else if (isFarmer) {
      rect(ctx, 9, 10, 30, 5, "#d8b45e", "#7f6031");
      rect(ctx, 16, 6, 16, 7, "#c49a49", "#7f6031");
    } else {
      rect(ctx, 14, 9, 20, 8, entry.id === "villager-f" ? "#7a4b2f" : "#4d3a31");
    }

    if (entry.id === "villager-f") {
      rect(ctx, 15, 25, 18, 16, "#b94a4d", "#663039");
      rect(ctx, 11, 14, 7, 14, "#6e3f2d");
      rect(ctx, 30, 14, 7, 14, "#6e3f2d");
    }
  }

  private drawTree(ctx: CanvasRenderingContext2D, width: number, height: number, pine: boolean): void {
    ellipse(ctx, width / 2, height - 8, 18, 6, "rgba(31,61,31,.32)");
    rect(ctx, width / 2 - 5, height - 43, 10, 37, "#76502d", "#4b351f");
    if (pine) {
      const layers = [[15, 18], [28, 24], [41, 29], [55, 33]] as const;
      for (const [y, half] of layers) {
        ctx.fillStyle = y % 2 === 0 ? "#237943" : "#2f9450";
        ctx.beginPath();
        ctx.moveTo(width / 2, y - 12);
        ctx.lineTo(width / 2 - half, y + 20);
        ctx.lineTo(width / 2 + half, y + 20);
        ctx.fill();
      }
      return;
    }
    [
      [width / 2, 29, 25, "#2f8c48"],
      [width / 2 - 13, 42, 21, "#3da052"],
      [width / 2 + 14, 42, 21, "#2d8446"],
      [width / 2, 51, 24, "#3f9f50"],
    ].forEach(([x, y, radius, fill]) => ellipse(ctx, Number(x), Number(y), Number(radius), Number(radius) * 0.82, String(fill), "#226d3d"));
    ellipse(ctx, width / 2 - 9, 25, 9, 7, "#69bd62");
  }

  private drawFlowers(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const colors = ["#fff6d5", "#ef6b88", "#f4d34c", "#75b8f4"];
    for (let i = 0; i < 8; i += 1) {
      const x = 7 + ((i * 13) % (width - 12));
      const y = 10 + ((i * 17) % (height - 14));
      line(ctx, [[x, y + 4], [x, y + 10]], "#337a42", 1);
      ellipse(ctx, x, y, 3, 3, colors[i % colors.length] ?? "#fff");
    }
  }

  private drawHouse(ctx: CanvasRenderingContext2D, width: number, height: number, roof: string): void {
    ellipse(ctx, width / 2, height - 8, width * 0.4, 7, "rgba(35,45,31,.28)");
    rect(ctx, 14, 55, width - 28, height - 62, "#d8b775", "#694b31");
    rect(ctx, width / 2 - 12, height - 42, 24, 35, "#7b4d2e", "#4b321f");
    rect(ctx, 25, 76, 21, 19, "#7bc0d9", "#4f402e");
    rect(ctx, width - 46, 76, 21, 19, "#7bc0d9", "#4f402e");
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(5, 63);
    ctx.lineTo(width / 2, 18);
    ctx.lineTo(width - 5, 63);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#55342b";
    ctx.lineWidth = 4;
    ctx.stroke();
    for (let y = 32; y < 62; y += 8) {
      line(ctx, [[18, y], [width - 18, y]], "rgba(255,255,255,.17)", 2);
    }
  }

  private drawSign(ctx: CanvasRenderingContext2D, width: number, height: number, text: string): void {
    rect(ctx, 20, 22, 6, 24, "#6a4228");
    rect(ctx, 3, 3, 42, 27, "#8b5a32", "#4b301f");
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f5e7b3";
    ctx.fillText(text, 24, 17);
  }

  private drawBoat(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = "#8a542f";
    ctx.beginPath();
    ctx.moveTo(6, 13);
    ctx.lineTo(width - 6, 13);
    ctx.lineTo(width - 22, height - 7);
    ctx.lineTo(22, height - 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#4e3523";
    ctx.lineWidth = 3;
    ctx.stroke();
    line(ctx, [[width / 2, 4], [width / 2, height - 8]], "#d3a064", 3);
  }

  private drawFenceNetwork(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mask: number,
  ): void {
    const cx = width / 2;
    const cy = height / 2;
    const rail = "#7b4b2b";
    const railDark = "#4e321f";
    const post = "#9b6238";

    const effectiveMask = mask === 0 ? EAST | WEST : mask;

    if ((effectiveMask & NORTH) !== 0) rect(ctx, cx - 3, 0, 6, cy, rail, railDark);
    if ((effectiveMask & SOUTH) !== 0) rect(ctx, cx - 3, cy, 6, height - cy, rail, railDark);
    if ((effectiveMask & WEST) !== 0) rect(ctx, 0, cy - 3, cx, 6, rail, railDark);
    if ((effectiveMask & EAST) !== 0) rect(ctx, cx, cy - 3, width - cx, 6, rail, railDark);

    rect(ctx, cx - 5, cy - 7, 10, 14, post, railDark);
    rect(ctx, cx - 3, cy - 10, 6, 5, "#b67b48", railDark);
  }

  private drawBridgeNetwork(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mask: number,
  ): void {
    const cx = width / 2;
    const cy = height / 2;
    const wood = "#9a6338";
    const dark = "#5b3b28";
    const light = "#c18a52";
    const effectiveMask = mask === 0 ? EAST | WEST : mask;
    const halfDeck = 13;

    if ((effectiveMask & NORTH) !== 0) rect(ctx, cx - halfDeck, 0, halfDeck * 2, cy + halfDeck, wood, dark);
    if ((effectiveMask & SOUTH) !== 0) rect(ctx, cx - halfDeck, cy - halfDeck, halfDeck * 2, height - cy + halfDeck, wood, dark);
    if ((effectiveMask & WEST) !== 0) rect(ctx, 0, cy - halfDeck, cx + halfDeck, halfDeck * 2, wood, dark);
    if ((effectiveMask & EAST) !== 0) rect(ctx, cx - halfDeck, cy - halfDeck, width - cx + halfDeck, halfDeck * 2, wood, dark);

    rect(ctx, cx - halfDeck, cy - halfDeck, halfDeck * 2, halfDeck * 2, wood, dark);

    if ((effectiveMask & (EAST | WEST)) !== 0) {
      for (let x = 3; x < width; x += 8) {
        line(ctx, [[x, cy - halfDeck + 2], [x, cy + halfDeck - 2]], dark, 1);
      }
      line(ctx, [[0, cy - halfDeck + 4], [width, cy - halfDeck + 4]], light, 2);
    }
    if ((effectiveMask & (NORTH | SOUTH)) !== 0) {
      for (let y = 3; y < height; y += 8) {
        line(ctx, [[cx - halfDeck + 2, y], [cx + halfDeck - 2, y]], dark, 1);
      }
      line(ctx, [[cx - halfDeck + 4, 0], [cx - halfDeck + 4, height]], light, 2);
    }
  }

  private drawCliffNetwork(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mask: number,
  ): void {
    const cx = width / 2;
    const cy = height / 2;
    const rock = "#8b6644";
    const dark = "#5f4837";
    const grass = "#68b653";
    const effectiveMask = mask === 0 ? EAST | WEST : mask;
    const half = 12;

    if ((effectiveMask & NORTH) !== 0) rect(ctx, cx - half, 0, half * 2, cy + half, rock, dark);
    if ((effectiveMask & SOUTH) !== 0) rect(ctx, cx - half, cy - half, half * 2, height - cy + half, rock, dark);
    if ((effectiveMask & WEST) !== 0) rect(ctx, 0, cy - half, cx + half, half * 2, rock, dark);
    if ((effectiveMask & EAST) !== 0) rect(ctx, cx - half, cy - half, width - cx + half, half * 2, rock, dark);
    rect(ctx, cx - half, cy - half, half * 2, half * 2, rock, dark);

    // Green lip and rock striations keep the generated placeholder readable.
    if ((effectiveMask & (EAST | WEST)) !== 0) {
      rect(ctx, 0, cy - half, width, 5, grass);
      for (let x = 4; x < width; x += 12) {
        line(ctx, [[x, cy - 5], [x + 4, cy + half - 2]], dark, 2);
      }
    }
    if ((effectiveMask & (NORTH | SOUTH)) !== 0) {
      rect(ctx, cx - half, 0, 5, height, grass);
      for (let y = 4; y < height; y += 12) {
        line(ctx, [[cx - 5, y], [cx + half - 2, y + 4]], dark, 2);
      }
    }
  }

  private drawWallNetwork(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mask: number,
  ): void {
    const cx = width / 2;
    const cy = height / 2;
    const stone = "#979d9c";
    const stoneLight = "#b4b9b6";
    const mortar = "#555e60";
    const effectiveMask = mask === 0 ? EAST | WEST : mask;
    const half = 15;

    if ((effectiveMask & NORTH) !== 0) rect(ctx, cx - half, 0, half * 2, cy + half, stone, mortar);
    if ((effectiveMask & SOUTH) !== 0) rect(ctx, cx - half, cy - half, half * 2, height - cy + half, stone, mortar);
    if ((effectiveMask & WEST) !== 0) rect(ctx, 0, cy - half, cx + half, half * 2, stone, mortar);
    if ((effectiveMask & EAST) !== 0) rect(ctx, cx - half, cy - half, width - cx + half, half * 2, stone, mortar);
    rect(ctx, cx - half, cy - half, half * 2, half * 2, stone, mortar);

    // Small masonry highlights make topology visible without baking sprite IDs.
    for (let y = 6; y < height; y += 12) {
      for (let x = (Math.floor(y / 12) % 2) * 8; x < width; x += 16) {
        if (ctx.getImageData(Math.min(x + 2, width - 1), Math.min(y + 2, height - 1), 1, 1).data[3] > 0) {
          rect(ctx, x, y, 10, 5, stoneLight, mortar);
        }
      }
    }
  }

  private drawWall(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    rect(ctx, 0, 10, width, height - 10, "#979d9c", "#555e60");
    for (let x = 0; x < width; x += 16) rect(ctx, x, 1, 12, 14, "#b4b9b6", "#555e60");
    for (let y = 18; y < height; y += 13) {
      const shift = (Math.floor(y / 13) % 2) * 8;
      for (let x = -shift; x < width; x += 16) rect(ctx, x, y, 15, 12, "#9ca19f", "#6a706f");
    }
  }

  private drawTower(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ellipse(ctx, width / 2, height - 8, width * 0.38, 8, "rgba(35,41,42,.35)");
    rect(ctx, 12, 24, width - 24, height - 31, "#939a9a", "#4f585a");
    for (let y = 35; y < height - 10; y += 14) {
      for (let x = 15; x < width - 12; x += 18) rect(ctx, x, y, 16, 12, "#a6acaa", "#686f70");
    }
    for (let x = 8; x < width; x += 20) rect(ctx, x, 8, 14, 24, "#b0b6b4", "#4f585a");
    ellipse(ctx, width / 2, 24, width * 0.35, 10, "#767e7e", "#4f585a");
  }

  private drawGate(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.drawWall(ctx, width, height);
    ctx.fillStyle = "#372a23";
    ctx.beginPath();
    ctx.arc(width / 2, height - 29, 26, Math.PI, 0);
    ctx.lineTo(width / 2 + 26, height);
    ctx.lineTo(width / 2 - 26, height);
    ctx.closePath();
    ctx.fill();
    for (let x = width / 2 - 20; x <= width / 2 + 20; x += 8) line(ctx, [[x, height - 50], [x, height]], "#9b783e", 5);
    line(ctx, [[width / 2 - 26, height - 24], [width / 2 + 26, height - 24]], "#5b4328", 5);
  }

  private drawFountain(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ellipse(ctx, width / 2, height * 0.68, width * 0.38, height * 0.2, "#777f80", "#4c5556");
    ellipse(ctx, width / 2, height * 0.64, width * 0.30, height * 0.13, "#35a7dc", "#d1dfdc");
    rect(ctx, width / 2 - 6, height * 0.28, 12, height * 0.36, "#a8b0af", "#616a6a");
    ellipse(ctx, width / 2, height * 0.28, 11, 7, "#3cc0ee", "#d1f4ff");
    line(ctx, [[width / 2, 10], [width / 2, height * 0.30]], "#a7ecff", 3);
  }

  private drawBookshelf(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    rect(ctx, 4, 3, width - 8, height - 7, "#6c4229", "#402a20");
    for (let y = 11; y < height - 6; y += 15) {
      line(ctx, [[6, y + 10], [width - 6, y + 10]], "#3d281f", 3);
      for (let x = 9; x < width - 9; x += 7) {
        const colors = ["#a33d42", "#356b8d", "#c7a13e", "#557c48"];
        rect(ctx, x, y, 5, 10, colors[(x + y) % colors.length] ?? "#aaa");
      }
    }
  }

  private drawTable(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ellipse(ctx, width / 2, height / 2 + 3, width * 0.43, height * 0.28, "#80502e", "#4c3323");
    for (let x = 26; x < width - 18; x += 42) {
      ellipse(ctx, x, height / 2, 7, 4, "#ded5bc", "#877f6d");
      ellipse(ctx, x + 2, height / 2, 2, 2, "#bc4e3d");
    }
  }

  private drawBed(ctx: CanvasRenderingContext2D, width: number, height: number, blanket: string): void {
    rect(ctx, 7, 4, width - 14, height - 8, "#74492c", "#4c321f");
    rect(ctx, 10, 10, width - 20, 24, "#e9e2cf", "#aa9c80");
    rect(ctx, 10, 32, width - 20, height - 42, blanket, "#663b3b");
    rect(ctx, 13, 12, width - 26, 14, "#f7f2df");
  }

  private drawThrone(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    rect(ctx, 8, 9, width - 16, height - 15, "#8f2732", "#63301f");
    rect(ctx, 4, 46, 8, 36, "#c89b34", "#725923");
    rect(ctx, width - 12, 46, 8, 36, "#c89b34", "#725923");
    rect(ctx, 11, 6, width - 22, 8, "#d1a63d", "#725923");
    ellipse(ctx, width / 2, 25, 7, 7, "#e0b84a");
  }

  private drawWeaponRack(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    rect(ctx, 4, 8, width - 8, 7, "#6d442b");
    rect(ctx, 4, 32, width - 8, 7, "#6d442b");
    for (let x = 16; x < width - 7; x += 25) {
      line(ctx, [[x, 3], [x + 11, 44]], "#b7bdba", 3);
      line(ctx, [[x - 4, 17], [x + 8, 13]], "#76512f", 3);
    }
  }
}
