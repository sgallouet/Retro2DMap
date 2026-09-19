import Phaser from "phaser";
import { referenceColor } from "../assets/ReferencePalette";
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
import type { AssetRenderContext, IAssetProvider, TextureRef } from "./IAssetProvider";

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
  ctx.fillStyle = referenceColor(fill);
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (stroke) {
    ctx.strokeStyle = referenceColor(stroke);
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
  ctx.fillStyle = referenceColor(fill);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = referenceColor(stroke);
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
  ctx.strokeStyle = referenceColor(stroke);
  ctx.lineWidth = width;
  ctx.stroke();
};

export class ProceduralAssetProvider implements IAssetProvider {
  preload(_scene: Phaser.Scene, _catalog: IWorldCatalog): void {
    // Procedural textures are created synchronously in prepare().
  }

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
      (["north", "east", "south", "west"] as const).forEach((facing) => {
        this.create(
          scene,
          this.actorKey(entry.id, facing),
          TILE_SIZE,
          TILE_SIZE,
          (ctx, w, h) => this.drawActor(ctx, w, h, entry, facing),
        );
      });
    });
  }

  textureRef(
    entry: CatalogEntry,
    x: number,
    y: number,
    context?: AssetRenderContext,
  ): TextureRef {
    if (entry.layer === "terrain") {
      const variant = context?.terrain?.variation ?? hash(`${entry.id}:${x}:${y}`) % 4;
      const topologyKey = context?.terrain?.topologyKey ?? "c15-i0";
      return { key: this.terrainKey(entry.id, variant, topologyKey) };
    }

    if (entry.layer === "prop" && entry.network) {
      return { key: this.networkKey(entry.id, context?.network?.neighborMask ?? 0) };
    }

    if (entry.layer === "actor") {
      return {
        key: this.actorKey(entry.id, context?.actor?.facing ?? "south"),
      };
    }

    return { key: this.entryKey(entry.id) };
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

  private actorKey(id: string, facing: "north" | "east" | "south" | "west"): string {
    return `proc:${id}:facing-${facing}`;
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
      grass: ["#78BE22", "#94D53E", "#639A1E"],
      "grass-dark": ["#29671D", "#39902C", "#053523"],
      path: ["#ECC75E", "#F4DC73", "#A58D35"],
      cobble: ["#BCB9B5", "#C4BFBB", "#7B7B7B"],
      "stone-floor": ["#97999B", "#A3A29C", "#656666"],
      "wood-floor": ["#A87F45", "#C48743", "#614221"],
      water: ["#187cc4", "#2f9ee0", "#0b599e"],
      "deep-water": ["#1265ad", "#2089cc", "#08477f"],
      soil: ["#8E7520", "#C8A736", "#4E3F11"],
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

    if (entry.id === "grass" || entry.id === "grass-dark") {
      const tuftCount = entry.id === "grass" ? 7 : 10;
      for (let i = 0; i < tuftCount; i += 1) {
        const x = 3 + Math.floor(random() * Math.max(1, width - 7));
        const y = 6 + Math.floor(random() * Math.max(1, height - 12));
        const shade = random() > 0.42 ? colors[1] : colors[2];
        line(ctx, [[x, y + 4], [x + 1, y]], shade, 1);
        line(ctx, [[x + 2, y + 4], [x + 4, y + 1]], shade, 1);
        if (random() > 0.72) rect(ctx, x + 5, y + 3, 2, 2, shade);
      }

      // Large, faint tonal patches keep grass from reading as noisy confetti.
      for (let i = 0; i < 3; i += 1) {
        const x = Math.floor(random() * width);
        const y = Math.floor(random() * height);
        ellipse(ctx, x, y, 7 + random() * 5, 3 + random() * 3, "rgba(255,255,220,.035)");
      }
      return;
    }

    if (entry.id === "path") {
      for (let i = 0; i < 18; i += 1) {
        const x = Math.floor(random() * width);
        const y = Math.floor(random() * height);
        const pebble = random() > 0.52 ? colors[1] : colors[2];
        ellipse(ctx, x, y, 0.7 + random() * 1.5, 0.7 + random() * 0.8, pebble);
      }

      // Two soft travel tracks make roads feel used rather than painted.
      line(ctx, [[3, 13], [width - 4, 11]], "rgba(97,66,33,.11)", 1);
      line(ctx, [[3, height - 12], [width - 4, height - 14]], "rgba(97,66,33,.11)", 1);
      return;
    }

    if (entry.id === "cobble") {
      rect(ctx, 0, 0, width, height, colors[0]);
      for (let y = 0; y < height; y += 9) {
        const shift = (Math.floor(y / 9) % 2) * 5;
        for (let x = -shift; x < width; x += 11) {
          const tone = (x + y + variant) % 4 === 0 ? colors[1] : colors[0];
          rect(ctx, x, y, 10, 8, tone, colors[2]);
          if ((x + y) % 5 === 0) {
            rect(ctx, x + 2, y + 2, 3, 1, "rgba(229,229,223,.15)");
          }
        }
      }
      return;
    }

    if (entry.id === "stone-floor") {
      rect(ctx, 0, 0, width, height, colors[0]);
      const cell = 12;
      for (let y = 0; y < height; y += cell) {
        for (let x = 0; x < width; x += cell) {
          const alternate = ((x / cell) + (y / cell) + variant) % 3 === 0;
          rect(
            ctx,
            x,
            y,
            cell - 1,
            cell - 1,
            alternate ? colors[1] : colors[0],
          );
          line(
            ctx,
            [[x, y + cell - 1], [x + cell - 1, y + cell - 1]],
            "rgba(91,91,93,.24)",
            1,
          );
          line(
            ctx,
            [[x + cell - 1, y], [x + cell - 1, y + cell - 1]],
            "rgba(91,91,93,.18)",
            1,
          );
          line(
            ctx,
            [[x + 2, y + 2], [x + cell - 4, y + 2]],
            "rgba(229,229,223,.22)",
            1,
          );
        }
      }

      if (variant % 2 === 1) {
        line(ctx, [[30, 4], [27, 9], [31, 13]], "rgba(58,62,60,.35)", 1);
      }
      return;
    }

    if (entry.id === "wood-floor") {
      for (let y = 0; y < height; y += 8) {
        rect(ctx, 0, y, width, 7, y % 16 === 0 ? colors[0] : colors[1]);
        line(ctx, [[0, y + 7], [width, y + 7]], "rgba(97,66,33,.36)", 1);
        for (let x = (y / 8) % 2 === 0 ? 13 : 27; x < width; x += 27) {
          line(ctx, [[x, y], [x, y + 7]], "rgba(97,66,33,.24)", 1);
        }
      }
      return;
    }

    if (entry.id === "soil") {
      for (let x = 3; x < width; x += 7) {
        line(ctx, [[x, 0], [x - 3, height]], colors[2], 1);
        line(ctx, [[x + 2, 0], [x - 1, height]], "rgba(210,166,112,.12)", 1);
      }
      return;
    }

    const count = 18;
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
        ellipse(ctx, width / 2, height * 0.65, 15, 11, "#949392", "#65625C");
        ellipse(ctx, width / 2 - 4, height * 0.58, 8, 5, "#C6C2BB");
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
        this.drawHouse(ctx, width, height, entry.id === "house-blue" ? "#366CD6" : "#E76735");
        return;
      case "shop-sign":
      case "inn-sign":
        this.drawSign(ctx, width, height, entry.id === "shop-sign" ? "SHOP" : "INN");
        return;
      case "crops":
        for (let x = 4; x < width; x += 6) {
          const sway = ((x / 6) % 3) - 1;
          const top = 10 + ((x * 7) % 6);
          line(ctx, [[x, height - 3], [x + sway, top + 5]], "#6E491E", 2);
          ellipse(ctx, x + sway, top, 3, 6, "#C8A736", "#8E7520");
          ellipse(ctx, x + sway - 2, top + 1, 2, 4, "#E9C752");
          if (x % 12 === 4) {
            line(ctx, [[x, 28], [x - 5, 23]], "#8E7520", 1);
            line(ctx, [[x, 32], [x + 5, 27]], "#8E7520", 1);
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
      case "dock":
        this.drawDock(ctx, width, height);
        return;
      case "waterfall":
        this.drawWaterfall(ctx, width, height);
        return;
      case "castle-wall":
        this.drawWallNetwork(ctx, width, height, networkMask);
        return;
      case "garden-border":
        this.drawGardenBorderNetwork(ctx, width, height, networkMask);
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
        rect(ctx, 12, 2, 24, 31, "#B22022", "#602B11");
        rect(ctx, 15, 5, 18, 24, "#B22022");
        ctx.fillStyle = referenceColor("#DE9136");
        ctx.beginPath();
        ctx.moveTo(12, 33);
        ctx.lineTo(24, 44);
        ctx.lineTo(36, 33);
        ctx.closePath();
        ctx.fill();
        line(ctx, [[13, 3], [35, 3]], "#F1A346", 3);

        // Tiny heraldic beast mark; deliberately abstract at one-tile scale.
        ellipse(ctx, 24, 15, 5, 5, "#F1A346");
        rect(ctx, 22, 18, 5, 8, "#F1A346");
        line(ctx, [[22, 20], [17, 24]], "#F1A346", 2);
        line(ctx, [[27, 20], [31, 16]], "#F1A346", 2);
        line(ctx, [[23, 26], [20, 29]], "#F1A346", 2);
        line(ctx, [[26, 26], [29, 29]], "#F1A346", 2);
        return;
      case "torch":
        rect(ctx, 21, 18, 6, 22, "#6b4930", "#3d3026");
        rect(ctx, 17, 18, 14, 5, "#9b7242", "#4d3828");
        ellipse(ctx, 24, 13, 8, 11, "#d96d24");
        ellipse(ctx, 24, 11, 5, 8, "#f3a333");
        ellipse(ctx, 24, 9, 2.5, 5, "#fff0a2");
        return;
      case "fountain":
        this.drawFountain(ctx, width, height);
        return;
      case "statue":
        rect(ctx, 8, 34, 32, 10, "#949392", "#505555");
        ellipse(ctx, 24, 23, 12, 14, "#a9afac", "#65625C");
        ellipse(ctx, 20, 20, 3, 3, "#5d6360");
        ellipse(ctx, 29, 20, 3, 3, "#5d6360");
        return;
      case "pillar":
        this.drawPillar(ctx, width, height);
        return;
      case "potted-flowers":
        this.drawPottedFlowers(ctx, width, height);
        return;
      case "candelabra":
        this.drawCandelabra(ctx, width, height);
        return;
      case "painting":
        this.drawPainting(ctx, width, height);
        return;
      case "bookshelf":
        this.drawBookshelf(ctx, width, height);
        return;
      case "table":
        this.drawTable(ctx, width, height);
        return;
      case "bed-red":
      case "bed-blue":
        this.drawBed(ctx, width, height, entry.id === "bed-red" ? "#B81F25" : "#116ACE");
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
        rect(ctx, 5, 3, width - 10, height - 6, "#B81F25", "#F3CF63");
        rect(ctx, 9, 7, width - 18, height - 14, "#B22022");
        line(ctx, [[10, 10], [width - 10, 10]], "#ECC75E", 1);
        line(ctx, [[10, height - 10], [width - 10, height - 10]], "#ECC75E", 1);
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
    facing: "north" | "east" | "south" | "west",
  ): void {
    const cx = width / 2;
    const side = facing === "east" || facing === "west";
    ellipse(ctx, cx + 1, height - 4, 12, 4, "rgba(7,22,25,.28)");

    const palette: Record<string, readonly [string, string, string]> = {
      hero: ["#B81F25", "#F3CF63", "#4C2A12"],
      guard: ["#116ACE", "#E5E5DF", "#123659"],
      king: ["#B81F25", "#F3CF63", "#8C2015"],
      scholar: ["#6F794D", "#E1D0A7", "#4D4533"],
      farmer: ["#8B6230", "#F3CF63", "#4C2A12"],
      "villager-f": ["#B81F25", "#E5E5DF", "#614221"],
      "villager-m": ["#639A1E", "#E1D0A7", "#4D4533"],
    };
    const [body, accent, dark] = palette[entry.id] ?? ["#639A1E", "#E1D0A7", "#4D4533"];

    // Chibi legs/body: compact and readable like the target.
    rect(ctx, cx - 8, 31, 6, 11, dark, "#071619");
    rect(ctx, cx + 2, 31, 6, 11, dark, "#071619");
    rect(ctx, cx - 11, 24, 22, 13, body, "#071619");
    rect(ctx, cx - 14, 25, 5, 10, body, "#071619");
    rect(ctx, cx + 9, 25, 5, 10, body, "#071619");
    rect(ctx, cx - 7, 25, 4, 9, accent);

    // Oversized head is a major part of the target's JRPG readability.
    ellipse(ctx, cx + (side ? 1 : 0), 16, 10, 10, "#E1D0A7", "#29180C");
    rect(ctx, cx - 8, 9, 16, facing === "north" ? 10 : 6, "#614221", "#29180C");
    rect(ctx, cx - 9, 12, 4, 9, "#614221");
    rect(ctx, cx + 5, 12, 4, 9, "#614221");

    if (facing === "south") {
      rect(ctx, cx - 4, 16, 2, 2, "#071619");
      rect(ctx, cx + 3, 16, 2, 2, "#071619");
      rect(ctx, cx - 1, 20, 3, 1, "#8C2015");
    } else if (side) {
      const eyeX = facing === "east" ? cx + 4 : cx - 5;
      rect(ctx, eyeX, 16, 2, 2, "#071619");
    }

    if (entry.id === "guard") {
      rect(ctx, cx - 10, 7, 20, 10, "#BCB9B5", "#123659");
      rect(ctx, cx - 7, 4, 14, 6, "#E5E5DF", "#123659");
      rect(ctx, cx - 2, 5, 4, 13, "#116ACE");
      rect(ctx, cx - 9, 25, 18, 5, "#116ACE", "#123659");
      line(ctx, [[cx + 14, 35], [cx + 14, 7]], "#BEA475", 2);
      line(ctx, [[cx + 12, 9], [cx + 16, 9]], "#E5E5DF", 2);
    } else if (entry.id === "king") {
      rect(ctx, cx - 10, 24, 20, 5, "#F3CF63", "#8C2015");
      ctx.fillStyle = referenceColor("#F3CF63");
      ctx.beginPath();
      ctx.moveTo(cx - 9, 10);
      ctx.lineTo(cx - 7, 3);
      ctx.lineTo(cx - 2, 8);
      ctx.lineTo(cx + 1, 2);
      ctx.lineTo(cx + 5, 8);
      ctx.lineTo(cx + 9, 3);
      ctx.lineTo(cx + 8, 11);
      ctx.closePath();
      ctx.fill();
      rect(ctx, cx - 9, 10, 17, 4, "#F3CF63", "#8E7520");
    } else if (entry.id === "farmer") {
      ellipse(ctx, cx, 8, 15, 4, "#CEB56D", "#795B30");
      rect(ctx, cx - 10, 5, 20, 6, "#F3CF63", "#795B30");
    } else if (entry.id === "scholar") {
      rect(ctx, cx - 10, 7, 20, 5, "#6F794D", "#4D4533");
      ctx.fillStyle = referenceColor("#6F794D");
      ctx.beginPath();
      ctx.moveTo(cx - 6, 9);
      ctx.lineTo(cx + 1, 1);
      ctx.lineTo(cx + 7, 10);
      ctx.closePath();
      ctx.fill();
    } else if (entry.id === "hero") {
      rect(ctx, cx - 12, 22, 24, 5, "#B81F25", "#4C2A12");
      if (facing === "north") {
        rect(ctx, cx - 9, 25, 18, 14, "#B81F25", "#4C2A12");
      } else {
        line(ctx, [[cx + 12, 31], [cx + 17, 11]], "#E5E5DF", 3);
      }
    } else if (entry.id === "villager-f") {
      rect(ctx, cx - 12, 31, 24, 8, "#E5E5DF", dark);
      rect(ctx, cx - 8, 23, 16, 5, body, dark);
    }
  }

  private drawTree(ctx: CanvasRenderingContext2D, width: number, height: number, pine: boolean): void {
    const cx = width / 2;
    ellipse(ctx, cx + 2, height - 5, 19, 5, "rgba(5,53,35,.24)");

    // The target hides most of the trunk under a broad crown.
    rect(ctx, cx - 5, height - 30, 10, 24, "#795B30", "#29180C");
    rect(ctx, cx - 2, height - 28, 3, 20, "#A87F45");

    if (pine) {
      const bands = [
        { y: 18, half: 15, fill: "#29671D" },
        { y: 30, half: 21, fill: "#39902C" },
        { y: 43, half: 25, fill: "#639A1E" },
        { y: 57, half: 28, fill: "#39902C" },
        { y: 68, half: 24, fill: "#29671D" },
      ];

      for (const band of bands) {
        ctx.fillStyle = referenceColor("#053523");
        ctx.beginPath();
        ctx.moveTo(cx, band.y - 15);
        ctx.lineTo(cx - band.half - 3, band.y + 13);
        ctx.lineTo(cx + band.half + 3, band.y + 13);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = referenceColor(band.fill);
        ctx.beginPath();
        ctx.moveTo(cx, band.y - 13);
        ctx.lineTo(cx - band.half, band.y + 10);
        ctx.lineTo(cx + band.half, band.y + 10);
        ctx.closePath();
        ctx.fill();

        line(
          ctx,
          [[cx - band.half + 5, band.y + 6], [cx - 1, band.y - 6]],
          "rgba(148,213,62,.46)",
          2,
        );
      }
      return;
    }

    const silhouette = [
      [cx, 29, 27, 22],
      [cx - 15, 39, 23, 20],
      [cx + 15, 39, 23, 20],
      [cx - 10, 54, 24, 19],
      [cx + 11, 54, 24, 19],
      [cx, 63, 25, 17],
    ] as const;
    silhouette.forEach(([x, y, rx, ry]) =>
      ellipse(ctx, x, y, rx, ry, "#053523"),
    );

    const lobes: ReadonlyArray<readonly [number, number, number, number, string]> = [
      [cx - 8, 23, 16, 13, "#639A1E"],
      [cx + 8, 24, 15, 13, "#78BE22"],
      [cx - 19, 37, 16, 14, "#39902C"],
      [cx, 36, 19, 16, "#8BC731"],
      [cx + 19, 38, 15, 14, "#639A1E"],
      [cx - 13, 51, 18, 14, "#39902C"],
      [cx + 9, 51, 19, 15, "#78BE22"],
      [cx - 2, 62, 19, 12, "#639A1E"],
    ];
    lobes.forEach(([x, y, rx, ry, fill]) => ellipse(ctx, x, y, rx, ry, fill));

    // Small concentrated highlights make the crown read as glossy foliage.
    ellipse(ctx, cx - 8, 20, 9, 5, "#94D53E");
    ellipse(ctx, cx + 9, 30, 7, 4, "#8BC731");
    ellipse(ctx, cx - 15, 42, 6, 4, "#72C33D");
    ellipse(ctx, cx + 2, 47, 5, 3, "#94D53E");
  }

  private drawFlowers(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const colors = ["#E5E5DF", "#F3CF63", "#E76735", "#B81F25", "#5793F5"];
    for (let i = 0; i < 14; i += 1) {
      const x = 5 + ((i * 11) % Math.max(8, width - 10));
      const y = 7 + ((i * 17) % Math.max(10, height - 12));
      line(ctx, [[x, y + 2], [x, y + 8]], "#39902C", 1);
      ellipse(ctx, x - 2, y, 2.5, 2.5, colors[i % colors.length] ?? "#E5E5DF");
      ellipse(ctx, x + 2, y + 1, 2.5, 2.5, colors[(i + 2) % colors.length] ?? "#F3CF63");
      ellipse(ctx, x, y - 2, 2, 2, "#E5E5DF");
    }
  }

  private drawHouse(ctx: CanvasRenderingContext2D, width: number, height: number, roof: string): void {
    const cx = width / 2;
    ellipse(ctx, cx + 4, height - 5, width * 0.39, 7, "rgba(41,24,12,.24)");

    // Deep facade and warm plaster.
    rect(ctx, 13, 62, width - 26, height - 68, "#614221", "#29180C");
    rect(ctx, 19, 67, width - 38, height - 76, "#E1D0A7", "#795B30");
    rect(ctx, cx - 15, height - 45, 30, 39, "#795B30", "#29180C");
    rect(ctx, cx - 10, height - 39, 20, 33, "#4C2A12");
    ellipse(ctx, cx + 6, height - 24, 2, 2, "#F3CF63");

    // Timber frame.
    rect(ctx, 18, 66, 6, height - 75, "#614221");
    rect(ctx, width - 24, 66, 6, height - 75, "#614221");
    line(ctx, [[24, 70], [width - 24, height - 21]], "#614221", 3);
    line(ctx, [[width - 24, 70], [24, height - 21]], "#614221", 3);

    // Windows with pale glass.
    for (const x of [30, width - 50]) {
      rect(ctx, x, 80, 20, 18, "#123659", "#4C2A12");
      rect(ctx, x + 3, 83, 14, 12, "#238EC7");
      line(ctx, [[x + 10, 83], [x + 10, 95]], "#E1D0A7", 1);
      line(ctx, [[x + 3, 89], [x + 17, 89]], "#E1D0A7", 1);
    }

    // Dark roof underlay.
    ctx.fillStyle = referenceColor("#29180C");
    ctx.beginPath();
    ctx.moveTo(2, 68);
    ctx.lineTo(cx, 13);
    ctx.lineTo(width - 2, 68);
    ctx.lineTo(width - 9, 76);
    ctx.lineTo(cx, 29);
    ctx.lineTo(9, 76);
    ctx.closePath();
    ctx.fill();

    // Main roof plane.
    ctx.fillStyle = referenceColor(roof);
    ctx.beginPath();
    ctx.moveTo(7, 63);
    ctx.lineTo(cx, 17);
    ctx.lineTo(width - 7, 63);
    ctx.lineTo(width - 14, 69);
    ctx.lineTo(cx, 29);
    ctx.lineTo(14, 69);
    ctx.closePath();
    ctx.fill();

    // Target-like scalloped tile rows.
    for (let row = 0; row < 5; row += 1) {
      const y = 34 + row * 7;
      const inset = 18 + row * 8;
      line(ctx, [[inset, y], [width - inset, y]], "rgba(229,229,223,.34)", 2);
      for (let x = inset + 5; x < width - inset; x += 11) {
        ellipse(ctx, x, y + 2, 5, 2, roof, "rgba(41,24,12,.18)");
      }
    }

    // Attic face and window.
    ctx.fillStyle = referenceColor("#614221");
    ctx.beginPath();
    ctx.moveTo(cx - 28, 58);
    ctx.lineTo(cx, 30);
    ctx.lineTo(cx + 28, 58);
    ctx.closePath();
    ctx.fill();
    rect(ctx, cx - 10, 42, 20, 16, "#E1D0A7", "#29180C");
    rect(ctx, cx - 7, 45, 14, 10, "#238EC7", "#4C2A12");

    rect(ctx, width - 40, 27, 13, 30, "#8D8371", "#4C2A12");
    rect(ctx, width - 43, 23, 19, 7, "#BCB9B5", "#4C2A12");
  }

  private drawSign(ctx: CanvasRenderingContext2D, width: number, height: number, text: string): void {
    ellipse(ctx, width / 2 + 2, height - 4, 11, 3, "rgba(49,36,24,.25)");
    rect(ctx, 21, 20, 6, 27, "#69472f", "#3f2d23");
    rect(ctx, 2, 3, 44, 27, "#755035", "#3c2a21");
    rect(ctx, 5, 6, 38, 21, "#8e6340", "#b88953");
    line(ctx, [[6, 8], [42, 8]], "rgba(235,204,146,.22)", 1);
    ctx.font = "bold 10px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = referenceColor("#f1dfb0");
    ctx.fillText(text, 24, 17);
  }

  private drawBoat(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = referenceColor("#8a542f");
    ctx.beginPath();
    ctx.moveTo(6, 13);
    ctx.lineTo(width - 6, 13);
    ctx.lineTo(width - 22, height - 7);
    ctx.lineTo(22, height - 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = referenceColor("#4e3523");
    ctx.lineWidth = 3;
    ctx.stroke();
    line(ctx, [[width / 2, 4], [width / 2, height - 8]], "#d3a064", 3);
  }

  private drawDock(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    rect(ctx, 4, 4, width - 8, height - 8, "#8d5d35", "#543722");
    for (let y = 8; y < height - 6; y += 12) {
      line(ctx, [[6, y], [width - 6, y]], "#c1884f", 2);
      line(ctx, [[6, y + 5], [width - 6, y + 5]], "#5d3d27", 1);
    }
    for (let x = 9; x < width - 4; x += 22) {
      rect(ctx, x, 0, 5, height, "#6a452b", "#422c1e");
    }
  }

  private drawWaterfall(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    rect(ctx, 4, 0, width - 8, height, "#2b91d3", "#0a568d");
    for (let x = 9; x < width - 8; x += 13) {
      line(ctx, [[x, 2], [x - 3, height - 7]], "rgba(196,238,255,.72)", 3);
    }
    for (let y = 16; y < height - 8; y += 22) {
      line(
        ctx,
        [[6, y], [width * 0.28, y - 5], [width * 0.52, y + 2], [width - 6, y - 4]],
        "#e9fbff",
        3,
      );
    }
    ellipse(ctx, width / 2, height - 9, width * 0.43, 8, "rgba(220,250,255,.9)");
    ellipse(ctx, width / 2, height - 5, width * 0.34, 5, "rgba(120,220,255,.72)");
  }

  private drawPillar(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    ellipse(ctx, width / 2, height - 7, 18, 7, "rgba(38,43,43,.28)");
    rect(ctx, 13, 14, width - 26, height - 26, "#C6C2BB", "#65625C");
    rect(ctx, 8, 8, width - 16, 13, "#c2c6c2", "#646b69");
    rect(ctx, 8, height - 22, width - 16, 13, "#8b9290", "#565d5c");
    for (let y = 28; y < height - 26; y += 14) {
      line(ctx, [[17, y], [width - 17, y]], "rgba(255,255,255,.22)", 2);
    }
  }

  private drawFenceNetwork(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mask: number,
  ): void {
    const cx = width / 2;
    const cy = height / 2;
    const rail = "#6E491E";
    const railLight = "#BB8848";
    const railDark = "#392610";
    const effectiveMask = mask === 0 ? EAST | WEST : mask;

    const horizontalRail = (y: number): void => {
      if ((effectiveMask & WEST) !== 0) {
        rect(ctx, 0, y, cx, 4, rail, railDark);
        rect(ctx, 1, y + 1, Math.max(1, cx - 2), 1, railLight);
      }
      if ((effectiveMask & EAST) !== 0) {
        rect(ctx, cx, y, width - cx, 4, rail, railDark);
        rect(ctx, cx + 1, y + 1, Math.max(1, width - cx - 2), 1, railLight);
      }
    };

    const verticalRail = (x: number): void => {
      if ((effectiveMask & NORTH) !== 0) {
        rect(ctx, x, 0, 4, cy, rail, railDark);
        rect(ctx, x + 1, 1, 1, Math.max(1, cy - 2), railLight);
      }
      if ((effectiveMask & SOUTH) !== 0) {
        rect(ctx, x, cy, 4, height - cy, rail, railDark);
        rect(ctx, x + 1, cy + 1, 1, Math.max(1, height - cy - 2), railLight);
      }
    };

    horizontalRail(cy - 8);
    horizontalRail(cy + 4);
    verticalRail(cx - 8);
    verticalRail(cx + 4);

    // Chunky post with a pointed cap like the target farm/village fences.
    rect(ctx, cx - 6, cy - 11, 12, 23, "#9B6C32", railDark);
    rect(ctx, cx - 4, cy - 9, 8, 18, "#BB8848");
    ctx.fillStyle = referenceColor("#BB8848");
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 11);
    ctx.lineTo(cx, cy - 17);
    ctx.lineTo(cx + 6, cy - 11);
    ctx.closePath();
    ctx.fill();
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

  private drawGardenBorderNetwork(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mask: number,
  ): void {
    const cx = width / 2;
    const cy = height / 2;
    const effectiveMask = mask === 0 ? EAST | WEST : mask;
    const stone = "#a5a49a";
    const light = "#c5c1ae";
    const dark = "#5f625d";
    const half = 5;

    const branch = (x: number, y: number, w: number, h: number): void => {
      rect(ctx, x + 1, y + 2, w, h, "rgba(49,52,49,.24)");
      rect(ctx, x, y, w, h, stone, dark);
      if (w > h) rect(ctx, x + 1, y + 1, Math.max(1, w - 2), 2, light);
      else rect(ctx, x + 1, y + 1, 2, Math.max(1, h - 2), light);
    };

    if ((effectiveMask & NORTH) !== 0) branch(cx - half, 0, half * 2, cy + half);
    if ((effectiveMask & SOUTH) !== 0) branch(cx - half, cy - half, half * 2, height - cy + half);
    if ((effectiveMask & WEST) !== 0) branch(0, cy - half, cx + half, half * 2);
    if ((effectiveMask & EAST) !== 0) branch(cx - half, cy - half, width - cx + half, half * 2);
    branch(cx - half, cy - half, half * 2, half * 2);

    rect(ctx, cx - 3, cy - 3, 6, 6, "#b9b6a9", dark);
  }

  private drawWallNetwork(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mask: number,
  ): void {
    const cx = width / 2;
    const cy = height / 2;
    const effectiveMask = mask === 0 ? EAST | WEST : mask;
    const half = 15;

    const drawBranch = (x: number, y: number, w: number, h: number): void => {
      rect(ctx, x + 2, y + 5, w, h, "rgba(59,57,57,.30)");
      rect(ctx, x, y, w, h, "#BCB9B5", "#7B7B7B");
      rect(ctx, x + 2, y + 2, Math.max(1, w - 4), 4, "#E5E5DF");
      rect(ctx, x + 2, y + h - 5, Math.max(1, w - 4), 3, "#7B7B7B");
    };

    if ((effectiveMask & NORTH) !== 0) drawBranch(cx - half, 0, half * 2, cy + half);
    if ((effectiveMask & SOUTH) !== 0) drawBranch(cx - half, cy - half, half * 2, height - cy + half);
    if ((effectiveMask & WEST) !== 0) drawBranch(0, cy - half, cx + half, half * 2);
    if ((effectiveMask & EAST) !== 0) drawBranch(cx - half, cy - half, width - cx + half, half * 2);
    drawBranch(cx - half, cy - half, half * 2, half * 2);

    for (let y = 9; y < height - 4; y += 10) {
      const shift = (Math.floor(y / 10) % 2) * 6;
      for (let x = -shift; x < width; x += 13) {
        const sampleX = Math.min(Math.max(x + 4, 0), width - 1);
        const sampleY = Math.min(y + 2, height - 1);
        if ((ctx.getImageData(sampleX, sampleY, 1, 1).data[3] ?? 0) === 0) continue;
        line(ctx, [[x, y], [x + 9, y]], "rgba(91,91,93,.50)", 1);
        line(ctx, [[x + 9, y], [x + 9, y + 4]], "rgba(91,91,93,.30)", 1);
      }
    }

    // Exposed top edge crenellation.
    if ((effectiveMask & NORTH) === 0 || mask === 0) {
      for (let x = 2; x < width; x += 15) {
        rect(ctx, x, Math.max(0, cy - half - 6), 9, 7, "#C4BFBB", "#7B7B7B");
        rect(ctx, x + 2, Math.max(1, cy - half - 5), 5, 2, "#E5E5DF");
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
    const cx = width / 2;
    ellipse(ctx, cx + 3, height - 6, width * 0.38, 8, "rgba(59,57,57,.28)");

    // Cylindrical body with bright center and darker curved sides.
    ellipse(ctx, cx, 31, width * 0.36, 15, "#C4BFBB", "#7B7B7B");
    rect(ctx, 13, 31, width - 26, height - 43, "#BCB9B5", "#7B7B7B");
    rect(ctx, 15, 34, 10, height - 48, "#97999B");
    rect(ctx, width - 25, 34, 10, height - 48, "#97999B");
    rect(ctx, cx - 13, 34, 26, height - 48, "#C4BFBB");

    for (let y = 42; y < height - 18; y += 11) {
      const shift = (Math.floor(y / 11) % 2) * 8;
      for (let x = 17 - shift; x < width - 12; x += 17) {
        line(ctx, [[x, y], [x + 13, y]], "#7B7B7B", 1);
      }
    }

    // Round battlement crown.
    ellipse(ctx, cx, 24, width * 0.39, 13, "#C4BFBB", "#7B7B7B");
    ellipse(ctx, cx, 27, width * 0.28, 8, "#656666", "#7B7B7B");
    for (let x = 7; x < width - 6; x += 18) {
      rect(ctx, x, 7, 13, 20, "#C4BFBB", "#7B7B7B");
      rect(ctx, x + 2, 9, 9, 4, "#E5E5DF");
    }

    rect(ctx, cx - 3, height * 0.53, 6, 18, "#3B3939");
  }

  private drawGate(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ellipse(ctx, width / 2, height - 5, width * 0.42, 7, "rgba(59,57,57,.28)");
    rect(ctx, 3, 15, width - 6, height - 18, "#BCB9B5", "#7B7B7B");

    for (let y = 24; y < height - 8; y += 11) {
      const shift = (Math.floor(y / 11) % 2) * 8;
      for (let x = 7 - shift; x < width - 6; x += 17) {
        line(ctx, [[x, y], [x + 13, y]], "#7B7B7B", 1);
      }
    }

    for (let x = 4; x < width - 8; x += 21) {
      rect(ctx, x, 2, 14, 20, "#C4BFBB", "#7B7B7B");
      rect(ctx, x + 2, 4, 10, 4, "#E5E5DF");
    }

    const cx = width / 2;
    ctx.fillStyle = referenceColor("#29180C");
    ctx.beginPath();
    ctx.arc(cx, height - 29, 28, Math.PI, 0);
    ctx.lineTo(cx + 28, height);
    ctx.lineTo(cx - 28, height);
    ctx.closePath();
    ctx.fill();

    for (let x = cx - 21; x <= cx + 21; x += 8) {
      line(ctx, [[x, height - 49], [x, height]], "#A87F45", 4);
    }
    line(ctx, [[cx - 27, height - 28], [cx + 27, height - 28]], "#614221", 4);
    line(ctx, [[cx - 25, height - 41], [cx + 25, height - 41]], "#BEA475", 2);
  }

  private drawFountain(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const cx = width / 2;
    const cy = height * 0.66;
    ellipse(ctx, cx, height - 7, width * 0.35, 7, "rgba(59,57,57,.22)");

    ctx.fillStyle = referenceColor("#7B7B7B");
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy - 9);
    ctx.lineTo(cx - 20, cy - 19);
    ctx.lineTo(cx + 20, cy - 19);
    ctx.lineTo(cx + 30, cy - 9);
    ctx.lineTo(cx + 24, cy + 12);
    ctx.lineTo(cx - 24, cy + 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = referenceColor("#C4BFBB");
    ctx.beginPath();
    ctx.moveTo(cx - 25, cy - 10);
    ctx.lineTo(cx - 17, cy - 15);
    ctx.lineTo(cx + 17, cy - 15);
    ctx.lineTo(cx + 25, cy - 10);
    ctx.lineTo(cx + 20, cy + 7);
    ctx.lineTo(cx - 20, cy + 7);
    ctx.closePath();
    ctx.fill();

    ellipse(ctx, cx, cy - 3, 21, 9, "#0168CF", "#E5E5DF");
    rect(ctx, cx - 5, 25, 10, 35, "#BCB9B5", "#7B7B7B");
    ellipse(ctx, cx, 25, 9, 5, "#238EC7", "#E5E5DF");
    ellipse(ctx, cx, 18, 5, 8, "#5793F5", "#E5E5DF");
    line(ctx, [[cx, 7], [cx, 20]], "#E5E5DF", 2);
  }

  private drawPottedFlowers(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    ellipse(ctx, width / 2, height - 5, 13, 4, "rgba(41,35,30,.24)");
    rect(ctx, 15, 28, 18, 14, "#7f5540", "#49342a");
    rect(ctx, 12, 25, 24, 7, "#a06a4b", "#49342a");
    line(ctx, [[24, 25], [24, 11]], "#2F792C", 2);
    line(ctx, [[24, 20], [16, 14]], "#2F792C", 2);
    line(ctx, [[24, 19], [32, 13]], "#2F792C", 2);
    ellipse(ctx, 16, 14, 5, 3, "#599E2B");
    ellipse(ctx, 32, 13, 5, 3, "#599E2B");
    ellipse(ctx, 24, 10, 4, 4, "#d76875");
    ellipse(ctx, 17, 12, 3, 3, "#e7c95d");
    ellipse(ctx, 31, 11, 3, 3, "#d88fc5");
  }

  private drawCandelabra(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    ellipse(ctx, width / 2, height - 5, 10, 4, "rgba(45,35,24,.24)");
    rect(ctx, 22, 19, 4, 22, "#DE9136", "#6E491E");
    line(ctx, [[24, 23], [13, 17], [13, 10]], "#DE9136", 3);
    line(ctx, [[24, 23], [35, 17], [35, 10]], "#DE9136", 3);
    line(ctx, [[24, 19], [24, 8]], "#DE9136", 3);
    [13, 24, 35].forEach((x) => {
      ellipse(ctx, x, 7, 4, 6, "#DE9136");
      ellipse(ctx, x, 6, 2, 4, "#fff0a5");
    });
    ellipse(ctx, 24, 41, 10, 4, "#8b6c32", "#5d4823");
  }

  private drawPainting(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    rect(ctx, 5, 5, width - 10, height - 10, "#6e4b2e", "#3c2a20");
    rect(ctx, 10, 10, width - 20, height - 20, "#9f8254", "#d1b06e");
    rect(ctx, 13, 13, width - 26, height - 26, "#6f9a99");
    rect(ctx, 13, height * 0.55, width - 26, height * 0.20, "#65855a");
    ctx.fillStyle = referenceColor("#66785c");
    ctx.beginPath();
    ctx.moveTo(16, height * 0.58);
    ctx.lineTo(width * 0.42, 18);
    ctx.lineTo(width * 0.55, height * 0.58);
    ctx.lineTo(width * 0.72, 22);
    ctx.lineTo(width - 16, height * 0.58);
    ctx.closePath();
    ctx.fill();
    ellipse(ctx, width * 0.74, 18, 5, 5, "#d9c06a");
  }

  private drawBookshelf(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    rect(ctx, 3, 4, width - 6, height - 8, "#6E491E", "#392610");
    rect(ctx, 7, 7, width - 14, height - 14, "#9B6C32", "#392610");

    for (let y = 10; y < height - 8; y += 15) {
      rect(ctx, 8, y + 10, width - 16, 4, "#392610");
      for (let x = 10; x < width - 10; x += 7) {
        const colors = ["#8d4044", "#43647a", "#aa8a47", "#506a45", "#74557b"];
        const color = colors[(x + y) % colors.length] ?? "#888";
        const bookHeight = 7 + ((x + y) % 5);
        rect(ctx, x, y + 10 - bookHeight, 5, bookHeight, color, "#342823");
      }
    }

    rect(ctx, 5, 4, 4, height - 8, "#BB8848");
    rect(ctx, width - 9, 4, 4, height - 8, "#392610");
  }

  private drawTable(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ellipse(ctx, width / 2 + 2, height / 2 + 7, width * 0.42, height * 0.24, "rgba(48,37,27,.28)");
    rect(ctx, 8, 12, width - 16, height - 25, "#6E491E", "#3e2d23");
    rect(ctx, 12, 9, width - 24, height - 24, "#9B6C32", "#392610");
    line(ctx, [[15, 14], [width - 15, 14]], "rgba(238,201,133,.24)", 2);

    for (let x = 25; x < width - 18; x += 38) {
      ellipse(ctx, x, height / 2, 7, 4, "#d4c9a8", "#726953");
      ellipse(ctx, x + 2, height / 2, 2, 2, "#98523e");
      rect(ctx, x + 11, height / 2 - 5, 3, 8, "#b79048");
    }
  }

  private drawBed(ctx: CanvasRenderingContext2D, width: number, height: number, blanket: string): void {
    ellipse(ctx, width / 2 + 2, height - 6, width * 0.34, 5, "rgba(49,39,31,.26)");
    rect(ctx, 6, 4, width - 12, height - 10, "#6E491E", "#392a21");
    rect(ctx, 9, 8, width - 18, 24, "#ddd4ba", "#91856d");
    rect(ctx, 10, 29, width - 20, height - 40, blanket, "#56373b");
    rect(ctx, 13, 10, width - 26, 13, "#eee8d4");
    line(ctx, [[12, 34], [width - 12, 34]], "rgba(255,230,195,.30)", 2);

    // Four simple bed posts.
    rect(ctx, 4, 2, 5, 17, "#9B6C32", "#3d2b21");
    rect(ctx, width - 9, 2, 5, 17, "#9B6C32", "#3d2b21");
    rect(ctx, 4, height - 18, 5, 16, "#6E491E", "#3d2b21");
    rect(ctx, width - 9, height - 18, 5, 16, "#6E491E", "#3d2b21");
  }

  private drawThrone(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ellipse(ctx, width / 2, height - 7, 18, 6, "rgba(43,31,29,.32)");
    rect(ctx, 7, 10, width - 14, height - 19, "#B22022", "#602B11");
    rect(ctx, 11, 14, width - 22, height - 28, "#B22022", "#602B11");
    rect(ctx, 4, 44, 8, 38, "#DE9136", "#6E491E");
    rect(ctx, width - 12, 44, 8, 38, "#DE9136", "#6E491E");
    rect(ctx, 8, 7, width - 16, 8, "#DE9136", "#6E491E");

    ctx.fillStyle = referenceColor("#DE9136");
    ctx.beginPath();
    ctx.moveTo(10, 12);
    ctx.lineTo(14, 2);
    ctx.lineTo(width / 2, 9);
    ctx.lineTo(width - 14, 2);
    ctx.lineTo(width - 10, 12);
    ctx.closePath();
    ctx.fill();

    ellipse(ctx, width / 2, 27, 7, 7, "#F1A346", "#745b28");
    rect(ctx, 14, height - 26, width - 28, 15, "#B22022", "#602B11");
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
