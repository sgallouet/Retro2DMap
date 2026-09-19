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
      grass: ["#6f9f59", "#86b56a", "#4c7543"],
      "grass-dark": ["#496e48", "#5d8353", "#35563a"],
      path: ["#b99b6b", "#d1b681", "#866c4c"],
      cobble: ["#96958b", "#aaa89b", "#666861"],
      "stone-floor": ["#858a87", "#9ca19b", "#5b615f"],
      "wood-floor": ["#93663f", "#aa794b", "#60442f"],
      water: ["#187cc4", "#2f9ee0", "#0b599e"],
      "deep-water": ["#1265ad", "#2089cc", "#08477f"],
      soil: ["#76543a", "#906748", "#4f3a2e"],
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
      const tuftCount = entry.id === "grass" ? 11 : 15;
      for (let i = 0; i < tuftCount; i += 1) {
        const x = 3 + Math.floor(random() * Math.max(1, width - 7));
        const y = 6 + Math.floor(random() * Math.max(1, height - 12));
        const shade = random() > 0.42 ? colors[1] : colors[2];
        line(ctx, [[x, y + 4], [x + 1, y]], shade, 1);
        line(ctx, [[x + 2, y + 4], [x + 4, y + 1]], shade, 1);
        if (random() > 0.6) rect(ctx, x + 5, y + 3, 2, 2, shade);
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
      for (let i = 0; i < 13; i += 1) {
        const x = Math.floor(random() * width);
        const y = Math.floor(random() * height);
        const pebble = random() > 0.52 ? colors[1] : colors[2];
        ellipse(ctx, x, y, 1 + random() * 2, 1 + random() * 1.2, pebble);
      }

      // Two soft travel tracks make roads feel used rather than painted.
      line(ctx, [[4, 14], [width - 5, 12]], "rgba(94,72,48,.13)", 2);
      line(ctx, [[4, height - 13], [width - 5, height - 15]], "rgba(94,72,48,.13)", 2);
      return;
    }

    if (entry.id === "cobble") {
      rect(ctx, 0, 0, width, height, colors[0]);
      for (let y = 0; y < height; y += 11) {
        const shift = (Math.floor(y / 11) % 2) * 6;
        for (let x = -shift; x < width; x += 13) {
          const tone = (x + y + variant) % 3 === 0 ? colors[1] : colors[0];
          rect(ctx, x, y, 12, 10, tone, colors[2]);
          if ((x + y) % 4 === 0) {
            rect(ctx, x + 3, y + 2, 4, 2, "rgba(228,218,190,.12)");
          }
        }
      }
      return;
    }

    if (entry.id === "stone-floor") {
      rect(ctx, 0, 0, width, height, colors[0]);
      const cell = 16;
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
            colors[2],
          );
          line(
            ctx,
            [[x + 2, y + 2], [x + cell - 4, y + 2]],
            "rgba(230,230,214,.15)",
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
        for (let x = 4; x < width; x += 6) {
          const sway = ((x / 6) % 3) - 1;
          const top = 10 + ((x * 7) % 6);
          line(ctx, [[x, height - 3], [x + sway, top + 5]], "#765b2c", 2);
          ellipse(ctx, x + sway, top, 3, 6, "#d4ad39", "#8d7028");
          ellipse(ctx, x + sway - 2, top + 1, 2, 4, "#e5c65a");
          if (x % 12 === 4) {
            line(ctx, [[x, 28], [x - 5, 23]], "#9e8435", 1);
            line(ctx, [[x, 32], [x + 5, 27]], "#9e8435", 1);
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
        rect(ctx, 12, 2, 24, 31, "#8e2633", "#5e1d27");
        rect(ctx, 15, 5, 18, 24, "#a92e3c");
        ctx.fillStyle = "#b8923e";
        ctx.beginPath();
        ctx.moveTo(12, 33);
        ctx.lineTo(24, 44);
        ctx.lineTo(36, 33);
        ctx.closePath();
        ctx.fill();
        line(ctx, [[13, 3], [35, 3]], "#d4ae51", 3);

        // Tiny heraldic beast mark; deliberately abstract at one-tile scale.
        ellipse(ctx, 24, 15, 5, 5, "#d7b44f");
        rect(ctx, 22, 18, 5, 8, "#d7b44f");
        line(ctx, [[22, 20], [17, 24]], "#d7b44f", 2);
        line(ctx, [[27, 20], [31, 16]], "#d7b44f", 2);
        line(ctx, [[23, 26], [20, 29]], "#d7b44f", 2);
        line(ctx, [[26, 26], [29, 29]], "#d7b44f", 2);
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
        rect(ctx, 8, 34, 32, 10, "#777d7b", "#505555");
        ellipse(ctx, 24, 23, 12, 14, "#a9afac", "#676d6a");
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
    facing: "north" | "east" | "south" | "west",
  ): void {
    const cx = width / 2;
    ellipse(ctx, cx, height - 5, 12, 4, "rgba(27,31,29,.32)");

    const palette: Record<string, readonly [string, string, string]> = {
      hero: ["#315f87", "#4c83ad", "#203f59"],
      guard: ["#4e6478", "#7d93a2", "#293943"],
      king: ["#8d2632", "#bc3948", "#5d1b25"],
      scholar: ["#66517f", "#846c9f", "#3e334f"],
      farmer: ["#5d7748", "#78945c", "#3d5031"],
      "villager-f": ["#8a4a55", "#ac6670", "#59313a"],
      "villager-m": ["#5b6f4b", "#748861", "#3b4932"],
    };
    const [body, light, dark] = palette[entry.id] ?? ["#596d58", "#72866f", "#39463a"];

    // Feet and lower body.
    rect(ctx, cx - 10, 33, 7, 10, "#2f3333");
    rect(ctx, cx + 3, 33, 7, 10, "#2f3333");
    rect(ctx, cx - 11, 24, 22, 14, body, dark);
    rect(ctx, cx - 8, 25, 5, 11, light);
    rect(ctx, cx + 5, 25, 3, 11, dark);

    // Arms read clearly at map scale.
    rect(ctx, cx - 15, 25, 5, 10, body, dark);
    rect(ctx, cx + 10, 25, 5, 10, body, dark);

    // Head and facing cues. North shows the back of the head; east/west use
    // one visible eye and a slightly offset nose. West is mirrored by renderer.
    ellipse(ctx, cx, 18, 9, 9, "#e0b68e", "#5a4033");
    rect(ctx, cx - 7, 11, 14, facing === "north" ? 9 : 5, "#6a4631");
    rect(ctx, cx - 8, 14, 3, 8, "#6a4631");
    rect(ctx, cx + 5, 14, 3, 8, "#6a4631");

    if (facing === "north") {
      rect(ctx, cx - 5, 17, 10, 7, "#6a4631");
      rect(ctx, cx - 2, 13, 4, 2, "#8a5d3d");
    } else if (facing === "east" || facing === "west") {
      rect(ctx, cx + 2, 18, 2, 2, "#43352e");
      rect(ctx, cx + 7, 20, 3, 2, "#c69072");
    } else {
      rect(ctx, cx - 3, 18, 2, 2, "#43352e");
      rect(ctx, cx + 3, 18, 2, 2, "#43352e");
      rect(ctx, cx - 1, 21, 3, 1, "#9f6758");
    }

    if (entry.id === "hero" && facing === "north") {
      ctx.fillStyle = "#8c3f43";
      ctx.beginPath();
      ctx.moveTo(cx - 11, 24);
      ctx.lineTo(cx + 11, 24);
      ctx.lineTo(cx + 8, 39);
      ctx.lineTo(cx - 8, 39);
      ctx.closePath();
      ctx.fill();
    }

    if (entry.id === "guard") {
      rect(ctx, cx - 10, 8, 20, 9, "#aeb8ba", "#475156");
      rect(ctx, cx - 6, 5, 12, 6, "#c9d0d0", "#475156");
      rect(ctx, cx - 2, 6, 4, 13, "#657f90");
      rect(ctx, cx + 12, 21, 4, 19, "#b9c2c2", "#4c5659");
      line(ctx, [[cx + 14, 20], [cx + 14, 5]], "#6a4c2e", 2);
    } else if (entry.id === "king") {
      rect(ctx, cx - 9, 24, 18, 4, "#d2a744", "#76591e");
      ctx.fillStyle = "#d9b348";
      ctx.beginPath();
      ctx.moveTo(cx - 9, 12);
      ctx.lineTo(cx - 7, 5);
      ctx.lineTo(cx - 2, 10);
      ctx.lineTo(cx + 1, 4);
      ctx.lineTo(cx + 5, 10);
      ctx.lineTo(cx + 9, 5);
      ctx.lineTo(cx + 8, 13);
      ctx.closePath();
      ctx.fill();
      rect(ctx, cx - 9, 11, 17, 4, "#d9b348", "#76591e");
    } else if (entry.id === "farmer") {
      ellipse(ctx, cx, 11, 15, 4, "#b8944e", "#70562d");
      rect(ctx, cx - 8, 6, 16, 7, "#c8a45b", "#70562d");
    } else if (entry.id === "scholar") {
      rect(ctx, cx - 10, 8, 20, 5, "#4a395d");
      ctx.fillStyle = "#6d5688";
      ctx.beginPath();
      ctx.moveTo(cx - 6, 10);
      ctx.lineTo(cx + 1, 2);
      ctx.lineTo(cx + 7, 11);
      ctx.closePath();
      ctx.fill();
      rect(ctx, cx - 12, 31, 24, 5, dark);
    } else if (entry.id === "hero") {
      // Small shoulder cape and sword silhouette.
      rect(ctx, cx - 12, 22, 24, 5, "#8c3f43", "#552a2e");
      line(ctx, [[cx + 12, 29], [cx + 17, 12]], "#c4c8c4", 3);
      line(ctx, [[cx + 9, 25], [cx + 15, 27]], "#6b4a2e", 3);
    } else if (entry.id === "villager-f") {
      rect(ctx, cx - 12, 32, 24, 8, light, dark);
      rect(ctx, cx - 9, 9, 18, 5, "#7a503c");
    }
  }

  private drawTree(ctx: CanvasRenderingContext2D, width: number, height: number, pine: boolean): void {
    const cx = width / 2;
    ellipse(ctx, cx + 2, height - 7, 20, 6, "rgba(34,47,30,.28)");
    rect(ctx, cx - 5, height - 43, 10, 36, "#6b492f", "#403023");
    rect(ctx, cx - 2, height - 40, 3, 31, "#966744");

    if (pine) {
      const layers = [
        [17, 17, "#355c3d"],
        [29, 23, "#3f7047"],
        [43, 28, "#487e4e"],
        [57, 32, "#416f47"],
      ] as const;

      for (const [y, half, fill] of layers) {
        ctx.fillStyle = "#2d4d35";
        ctx.beginPath();
        ctx.moveTo(cx + 2, y - 13);
        ctx.lineTo(cx - half - 2, y + 18);
        ctx.lineTo(cx + half + 3, y + 18);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(cx, y - 12);
        ctx.lineTo(cx - half, y + 15);
        ctx.lineTo(cx + half, y + 15);
        ctx.closePath();
        ctx.fill();

        line(ctx, [[cx - half + 6, y + 9], [cx + 3, y - 4]], "rgba(184,210,142,.22)", 2);
      }
      return;
    }

    const clusters: ReadonlyArray<readonly [number, number, number, number, string]> = [
      [cx, 29, 25, 20, "#365f3f"],
      [cx - 13, 40, 22, 18, "#47784a"],
      [cx + 13, 40, 22, 18, "#3d6c43"],
      [cx - 3, 52, 26, 19, "#467b48"],
      [cx + 10, 28, 17, 14, "#507f4d"],
    ];
    clusters.forEach(([x, y, rx, ry, fill]) =>
      ellipse(ctx, x, y, rx, ry, fill, "#2d5036"),
    );

    ellipse(ctx, cx - 10, 25, 10, 6, "#73965b");
    ellipse(ctx, cx + 8, 36, 7, 5, "#648d55");
    rect(ctx, cx - 18, 42, 4, 3, "#2f5837");
    rect(ctx, cx + 14, 48, 5, 3, "#2f5837");
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
    const cx = width / 2;
    ellipse(ctx, cx + 3, height - 7, width * 0.39, 8, "rgba(38,40,31,.26)");

    // Lower plaster/timber facade.
    rect(ctx, 15, 61, width - 30, height - 68, "#c7af7d", "#5a4430");
    rect(ctx, 19, 65, width - 38, height - 75, "#dbc99a");
    rect(ctx, 18, 63, 6, height - 71, "#76513a");
    rect(ctx, width - 24, 63, 6, height - 71, "#76513a");
    line(ctx, [[24, 68], [width - 24, height - 20]], "#7e593c", 3);
    line(ctx, [[width - 24, 68], [24, height - 20]], "#7e593c", 3);

    // Door and windows.
    rect(ctx, cx - 12, height - 43, 24, 36, "#6f4a31", "#3f3025");
    ellipse(ctx, cx + 6, height - 26, 2, 2, "#d6b65b");
    rect(ctx, 27, 79, 19, 17, "#6f9da8", "#4d4332");
    rect(ctx, width - 46, 79, 19, 17, "#6f9da8", "#4d4332");
    line(ctx, [[36, 80], [36, 95]], "rgba(232,235,198,.5)", 2);
    line(ctx, [[width - 37, 80], [width - 37, 95]], "rgba(232,235,198,.5)", 2);

    // Deep roof eaves first, then roof plane.
    ctx.fillStyle = "#49352e";
    ctx.beginPath();
    ctx.moveTo(3, 67);
    ctx.lineTo(cx, 15);
    ctx.lineTo(width - 3, 67);
    ctx.lineTo(width - 10, 73);
    ctx.lineTo(cx, 28);
    ctx.lineTo(10, 73);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(8, 62);
    ctx.lineTo(cx, 18);
    ctx.lineTo(width - 8, 62);
    ctx.lineTo(width - 16, 67);
    ctx.lineTo(cx, 29);
    ctx.lineTo(16, 67);
    ctx.closePath();
    ctx.fill();

    // Roof tile/shingle rhythm.
    for (let y = 34; y <= 58; y += 7) {
      const inset = Math.round((y - 29) * 0.8);
      line(
        ctx,
        [[inset, y], [width - inset, y]],
        "rgba(255,244,214,.20)",
        2,
      );
    }
    for (let x = 28; x < width - 22; x += 18) {
      line(ctx, [[cx, 22], [x, 63]], "rgba(70,43,39,.28)", 1);
    }

    // Small chimney gives the silhouette a JRPG landmark read.
    rect(ctx, width - 40, 28, 13, 30, "#7f6b59", "#514437");
    rect(ctx, width - 43, 24, 19, 7, "#a08a75", "#514437");
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
    ctx.fillStyle = "#f1dfb0";
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
    rect(ctx, 13, 14, width - 26, height - 26, "#a4aaa8", "#5b6261");
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
    const rail = "#765039";
    const railLight = "#9b6b46";
    const railDark = "#463126";
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
    rect(ctx, cx - 6, cy - 11, 12, 23, "#855a3c", railDark);
    rect(ctx, cx - 4, cy - 9, 8, 18, "#a16f47");
    ctx.fillStyle = "#b07c4f";
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
    const half = 16;

    const drawBranch = (
      x: number,
      y: number,
      w: number,
      h: number,
    ): void => {
      // Strong lower/right shadow makes the cutaway castle read above floors.
      rect(ctx, x + 3, y + 4, w, h, "rgba(44,47,46,.42)");
      rect(ctx, x, y, w, h, "#8e918b", "#4f5451");
      rect(ctx, x + 2, y + 2, Math.max(1, w - 4), 4, "#b0b1aa");
    };

    if ((effectiveMask & NORTH) !== 0) drawBranch(cx - half, 0, half * 2, cy + half);
    if ((effectiveMask & SOUTH) !== 0) drawBranch(cx - half, cy - half, half * 2, height - cy + half);
    if ((effectiveMask & WEST) !== 0) drawBranch(0, cy - half, cx + half, half * 2);
    if ((effectiveMask & EAST) !== 0) drawBranch(cx - half, cy - half, width - cx + half, half * 2);
    drawBranch(cx - half, cy - half, half * 2, half * 2);

    // Warm, chunky masonry rather than a perfect checkerboard.
    for (let y = 7; y < height; y += 11) {
      const shift = (Math.floor(y / 11) % 2) * 7;
      for (let x = -shift; x < width; x += 15) {
        const sampleX = Math.min(Math.max(x + 5, 0), width - 1);
        const sampleY = Math.min(y + 3, height - 1);
        if ((ctx.getImageData(sampleX, sampleY, 1, 1).data[3] ?? 0) === 0) continue;
        line(ctx, [[x, y], [x + 11, y]], "rgba(67,72,69,.55)", 1);
        if ((x + y) % 3 === 0) rect(ctx, x + 2, y - 5, 7, 3, "rgba(202,202,190,.18)");
      }
    }

    // Sparse crenellation cues on exposed endpoints/junctions.
    if (mask === 0 || ((effectiveMask & NORTH) === 0 && (effectiveMask & SOUTH) === 0)) {
      for (let x = 3; x < width; x += 16) {
        rect(ctx, x, cy - half - 5, 10, 7, "#a9aaa3", "#4f5451");
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
    ellipse(ctx, cx + 3, height - 7, width * 0.39, 9, "rgba(38,42,41,.34)");

    // Cylindrical tower body with a cutaway-friendly stone face.
    ellipse(ctx, cx, 34, width * 0.36, 18, "#7e8581", "#4d5552");
    rect(ctx, 13, 34, width - 26, height - 45, "#8d9490", "#4d5552");
    ellipse(ctx, cx, height - 12, width * 0.36, 13, "#727a76", "#4d5552");

    for (let y = 43; y < height - 18; y += 14) {
      const shift = (Math.floor(y / 14) % 2) * 9;
      for (let x = 17 - shift; x < width - 13; x += 19) {
        rect(ctx, x, y, 16, 10, "#9aa09b", "#646a67");
      }
    }

    // Raised battlement rim.
    ellipse(ctx, cx, 25, width * 0.39, 14, "#a6aaa4", "#4d5552");
    ellipse(ctx, cx, 28, width * 0.29, 9, "#6f7672", "#4d5552");
    for (let x = 7; x < width - 5; x += 19) {
      rect(ctx, x, 8, 14, 21, "#aeb1aa", "#505754");
      rect(ctx, x + 2, 10, 10, 4, "#c0c2bb");
    }

    // Arrow slit.
    rect(ctx, cx - 3, height * 0.53, 6, 20, "#353c3b", "#646a67");
  }

  private drawGate(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ellipse(ctx, width / 2, height - 5, width * 0.42, 7, "rgba(34,38,37,.35)");
    rect(ctx, 3, 16, width - 6, height - 19, "#8b918e", "#4b5350");

    // Masonry bands.
    for (let y = 22; y < height - 9; y += 13) {
      const shift = (Math.floor(y / 13) % 2) * 10;
      for (let x = 7 - shift; x < width - 6; x += 20) {
        rect(ctx, x, y, 18, 11, "#9ea39f", "#626966");
      }
    }

    // Battlements.
    for (let x = 4; x < width - 8; x += 22) {
      rect(ctx, x, 3, 15, 20, "#b2b5af", "#4b5350");
      rect(ctx, x + 2, 5, 11, 4, "#c5c7c1");
    }

    // Dark arch with warm wooden portcullis.
    const cx = width / 2;
    ctx.fillStyle = "#302d2a";
    ctx.beginPath();
    ctx.arc(cx, height - 30, 29, Math.PI, 0);
    ctx.lineTo(cx + 29, height);
    ctx.lineTo(cx - 29, height);
    ctx.closePath();
    ctx.fill();

    for (let x = cx - 22; x <= cx + 22; x += 9) {
      line(ctx, [[x, height - 51], [x, height]], "#8d683c", 5);
      ctx.fillStyle = "#8d683c";
      ctx.beginPath();
      ctx.moveTo(x - 3, height - 2);
      ctx.lineTo(x + 3, height - 2);
      ctx.lineTo(x, height + 5);
      ctx.closePath();
      ctx.fill();
    }
    line(ctx, [[cx - 28, height - 27], [cx + 28, height - 27]], "#5b432c", 5);
    line(ctx, [[cx - 27, height - 42], [cx + 27, height - 42]], "#b08852", 2);
  }

  private drawFountain(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ellipse(ctx, width / 2, height * 0.68, width * 0.38, height * 0.2, "#777f80", "#4c5556");
    ellipse(ctx, width / 2, height * 0.64, width * 0.30, height * 0.13, "#35a7dc", "#d1dfdc");
    rect(ctx, width / 2 - 6, height * 0.28, 12, height * 0.36, "#a8b0af", "#616a6a");
    ellipse(ctx, width / 2, height * 0.28, 11, 7, "#3cc0ee", "#d1f4ff");
    line(ctx, [[width / 2, 10], [width / 2, height * 0.30]], "#a7ecff", 3);
  }

  private drawPottedFlowers(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    ellipse(ctx, width / 2, height - 5, 13, 4, "rgba(41,35,30,.24)");
    rect(ctx, 15, 28, 18, 14, "#7f5540", "#49342a");
    rect(ctx, 12, 25, 24, 7, "#a06a4b", "#49342a");
    line(ctx, [[24, 25], [24, 11]], "#3e6b3f", 2);
    line(ctx, [[24, 20], [16, 14]], "#3e6b3f", 2);
    line(ctx, [[24, 19], [32, 13]], "#3e6b3f", 2);
    ellipse(ctx, 16, 14, 5, 3, "#5c8750");
    ellipse(ctx, 32, 13, 5, 3, "#638d55");
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
    rect(ctx, 22, 19, 4, 22, "#b68d3c", "#674f24");
    line(ctx, [[24, 23], [13, 17], [13, 10]], "#b68d3c", 3);
    line(ctx, [[24, 23], [35, 17], [35, 10]], "#b68d3c", 3);
    line(ctx, [[24, 19], [24, 8]], "#b68d3c", 3);
    [13, 24, 35].forEach((x) => {
      ellipse(ctx, x, 7, 4, 6, "#e4952f");
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
    ctx.fillStyle = "#66785c";
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
    rect(ctx, 3, 4, width - 6, height - 8, "#5c3d2b", "#35271f");
    rect(ctx, 7, 7, width - 14, height - 14, "#785039", "#3b2a21");

    for (let y = 10; y < height - 8; y += 15) {
      rect(ctx, 8, y + 10, width - 16, 4, "#412d23");
      for (let x = 10; x < width - 10; x += 7) {
        const colors = ["#8d4044", "#43647a", "#aa8a47", "#506a45", "#74557b"];
        const color = colors[(x + y) % colors.length] ?? "#888";
        const bookHeight = 7 + ((x + y) % 5);
        rect(ctx, x, y + 10 - bookHeight, 5, bookHeight, color, "#342823");
      }
    }

    rect(ctx, 5, 4, 4, height - 8, "#8e6747");
    rect(ctx, width - 9, 4, 4, height - 8, "#4a3226");
  }

  private drawTable(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ellipse(ctx, width / 2 + 2, height / 2 + 7, width * 0.42, height * 0.24, "rgba(48,37,27,.28)");
    rect(ctx, 8, 12, width - 16, height - 25, "#704b31", "#3e2d23");
    rect(ctx, 12, 9, width - 24, height - 24, "#8d603a", "#503624");
    line(ctx, [[15, 14], [width - 15, 14]], "rgba(238,201,133,.24)", 2);

    for (let x = 25; x < width - 18; x += 38) {
      ellipse(ctx, x, height / 2, 7, 4, "#d4c9a8", "#726953");
      ellipse(ctx, x + 2, height / 2, 2, 2, "#98523e");
      rect(ctx, x + 11, height / 2 - 5, 3, 8, "#b79048");
    }
  }

  private drawBed(ctx: CanvasRenderingContext2D, width: number, height: number, blanket: string): void {
    ellipse(ctx, width / 2 + 2, height - 6, width * 0.34, 5, "rgba(49,39,31,.26)");
    rect(ctx, 6, 4, width - 12, height - 10, "#64452f", "#392a21");
    rect(ctx, 9, 8, width - 18, 24, "#ddd4ba", "#91856d");
    rect(ctx, 10, 29, width - 20, height - 40, blanket, "#56373b");
    rect(ctx, 13, 10, width - 26, 13, "#eee8d4");
    line(ctx, [[12, 34], [width - 12, 34]], "rgba(255,230,195,.30)", 2);

    // Four simple bed posts.
    rect(ctx, 4, 2, 5, 17, "#7b583a", "#3d2b21");
    rect(ctx, width - 9, 2, 5, 17, "#7b583a", "#3d2b21");
    rect(ctx, 4, height - 18, 5, 16, "#5c402d", "#3d2b21");
    rect(ctx, width - 9, height - 18, 5, 16, "#5c402d", "#3d2b21");
  }

  private drawThrone(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ellipse(ctx, width / 2, height - 7, 18, 6, "rgba(43,31,29,.32)");
    rect(ctx, 7, 10, width - 14, height - 19, "#742c35", "#4d2b2d");
    rect(ctx, 11, 14, width - 22, height - 28, "#9a3440", "#5d2b31");
    rect(ctx, 4, 44, 8, 38, "#b9903c", "#675022");
    rect(ctx, width - 12, 44, 8, 38, "#b9903c", "#675022");
    rect(ctx, 8, 7, width - 16, 8, "#c5a04a", "#675022");

    ctx.fillStyle = "#d0a949";
    ctx.beginPath();
    ctx.moveTo(10, 12);
    ctx.lineTo(14, 2);
    ctx.lineTo(width / 2, 9);
    ctx.lineTo(width - 14, 2);
    ctx.lineTo(width - 10, 12);
    ctx.closePath();
    ctx.fill();

    ellipse(ctx, width / 2, 27, 7, 7, "#d3af54", "#745b28");
    rect(ctx, 14, height - 26, width - 28, 15, "#b33b45", "#6d2a31");
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
