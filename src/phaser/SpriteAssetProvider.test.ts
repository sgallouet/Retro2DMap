import { describe, expect, it } from "vitest";
import { worldCatalog } from "../domain/catalog";
import type { SpriteAssetManifest } from "../assets/SpriteAssetManifest";
import type { IAssetProvider, TextureRef } from "./IAssetProvider";
import { SpriteAssetProvider } from "./SpriteAssetProvider";

const treeRound = worldCatalog.get("tree-round");
if (!treeRound) throw new Error("missing tree-round catalog entry");
const castleTower = worldCatalog.get("castle-tower");
if (!castleTower) throw new Error("missing castle-tower catalog entry");
const castleGate = worldCatalog.get("castle-gate");
if (!castleGate) throw new Error("missing castle-gate catalog entry");
const houseBlue = worldCatalog.get("house-blue");
if (!houseBlue) throw new Error("missing house-blue catalog entry");
const throne = worldCatalog.get("throne");
if (!throne) throw new Error("missing throne catalog entry");
const bookshelf = worldCatalog.get("bookshelf");
if (!bookshelf) throw new Error("missing bookshelf catalog entry");
const table = worldCatalog.get("table");
if (!table) throw new Error("missing table catalog entry");
const stairs = worldCatalog.get("stairs");
if (!stairs) throw new Error("missing stairs catalog entry");
const pillar = worldCatalog.get("pillar");
if (!pillar) throw new Error("missing pillar catalog entry");

const stubScene = (loaded: readonly string[]) =>
  ({
    load: { image() {} },
    textures: {
      exists(key: string) {
        return loaded.includes(key);
      },
    },
  }) as never;

const fallback = (key = "procedural-tree-round"): IAssetProvider => ({
  preload() {},
  prepare() {},
  textureRef(): TextureRef {
    return { key };
  },
});

const fourVariantManifest: SpriteAssetManifest = {
  images: [
    { key: "tree-round-authored-01", imageUrl: "/assets/props/tree-round.png" },
    { key: "tree-round-authored-02", imageUrl: "/assets/props/tree-round-02.png" },
    { key: "tree-round-authored-03", imageUrl: "/assets/props/tree-round-03.png" },
    { key: "tree-round-authored-04", imageUrl: "/assets/props/tree-round-04.png" },
  ],
  atlases: [],
  entries: {
    "tree-round": {
      kind: "image",
      texture: [
        "tree-round-authored-01",
        "tree-round-authored-02",
        "tree-round-authored-03",
        "tree-round-authored-04",
      ],
    },
  },
};

describe("SpriteAssetProvider terrain-base materials", () => {
  const grass = worldCatalog.get("grass");
  if (!grass) throw new Error("missing grass catalog entry");

  const grassManifest: SpriteAssetManifest = {
    images: [{ key: "grass-center-authored", imageUrl: "/assets/terrain/grass-center.png" }],
    atlases: [],
    entries: {
      grass: { kind: "terrain-base", texture: "grass-center-authored" },
    },
  };

  it("registers an authored terrain material and still resolves tiles through the fallback provider", () => {
    const materials: Array<readonly [string, string]> = [];
    const host: IAssetProvider & { useTerrainMaterial(id: string, key: string): void } = {
      preload() {},
      prepare() {},
      useTerrainMaterial(id, key) {
        materials.push([id, key]);
      },
      textureRef() {
        return { key: "proc:grass:0:c15-i0" };
      },
    };
    const provider = new SpriteAssetProvider(grassManifest, host);
    provider.preload(stubScene(["grass-center-authored"]), {} as never);
    provider.prepare(stubScene(["grass-center-authored"]), {} as never);

    expect(materials).toEqual([["grass", "grass-center-authored"]]);
    expect(provider.textureRef(grass, 4, 3)).toEqual({ key: "proc:grass:0:c15-i0" });
  });

  it("does not register a terrain material when the authored image is missing", () => {
    const materials: Array<readonly [string, string]> = [];
    const host: IAssetProvider & { useTerrainMaterial(id: string, key: string): void } = {
      preload() {},
      prepare() {},
      useTerrainMaterial(id, key) {
        materials.push([id, key]);
      },
      textureRef() {
        return { key: "proc:grass:0:c15-i0" };
      },
    };
    const provider = new SpriteAssetProvider(grassManifest, host);
    provider.preload(stubScene([]), {} as never);
    provider.prepare(stubScene([]), {} as never);

    expect(materials).toEqual([]);
    expect(provider.textureRef(grass, 4, 3)).toEqual({ key: "proc:grass:0:c15-i0" });
  });
});

describe("SpriteAssetProvider image variants", () => {
  it("resolves the normalized authored castle tower image", () => {
    const manifest: SpriteAssetManifest = {
      images: [{ key: "castle-tower-authored", imageUrl: "/assets/props/castle-tower-authored.png" }],
      atlases: [],
      entries: { "castle-tower": { kind: "image", texture: "castle-tower-authored" } },
    };
    const provider = new SpriteAssetProvider(manifest, fallback());
    provider.preload(stubScene(["castle-tower-authored"]), {} as never);
    expect(provider.textureRef(castleTower, 14, 17)).toEqual({ key: "castle-tower-authored" });
  });

  it("resolves the normalized authored open castle gate image", () => {
    const manifest: SpriteAssetManifest = {
      images: [{ key: "castle-gate-authored", imageUrl: "/assets/props/castle-gate-authored.png" }],
      atlases: [],
      entries: { "castle-gate": { kind: "image", texture: "castle-gate-authored" } },
    };
    const provider = new SpriteAssetProvider(manifest, fallback());
    provider.preload(stubScene(["castle-gate-authored"]), {} as never);
    expect(provider.textureRef(castleGate, 26, 17)).toEqual({ key: "castle-gate-authored" });
  });

  it("resolves the normalized authored blue house image", () => {
    const manifest: SpriteAssetManifest = {
      images: [{ key: "house-blue-authored", imageUrl: "/assets/props/house-blue-authored.png" }],
      atlases: [],
      entries: { "house-blue": { kind: "image", texture: "house-blue-authored" } },
    };
    const provider = new SpriteAssetProvider(manifest, fallback());
    provider.preload(stubScene(["house-blue-authored"]), {} as never);
    expect(provider.textureRef(houseBlue, 5, 2)).toEqual({ key: "house-blue-authored" });
  });

  it("resolves the authored castle proof images", () => {
    const entries = {
      throne: { kind: "image" as const, texture: "throne-authored" },
      bookshelf: { kind: "image" as const, texture: "bookshelf-authored" },
      table: { kind: "image" as const, texture: "table-authored" },
      stairs: { kind: "image" as const, texture: "stairs-authored" },
      pillar: { kind: "image" as const, texture: "pillar-authored" },
    };
    const manifest: SpriteAssetManifest = {
      images: Object.values(entries).map((entry) => ({
        key: entry.texture,
        imageUrl: `/assets/props/${entry.texture}.png`,
      })),
      atlases: [],
      entries,
    };
    const provider = new SpriteAssetProvider(manifest, fallback());
    provider.preload(
      stubScene([
        "throne-authored",
        "bookshelf-authored",
        "table-authored",
        "stairs-authored",
        "pillar-authored",
      ]),
      {} as never,
    );

    expect(provider.textureRef(throne, 26, 2)).toEqual({ key: "throne-authored" });
    expect(provider.textureRef(bookshelf, 17, 2)).toEqual({ key: "bookshelf-authored" });
    expect(provider.textureRef(table, 18, 4)).toEqual({ key: "table-authored" });
    expect(provider.textureRef(stairs, 26, 11)).toEqual({ key: "stairs-authored" });
    expect(provider.textureRef(pillar, 25, 5)).toEqual({ key: "pillar-authored" });
  });

  it("picks a deterministic authored tree variant from tile coordinates", () => {
    const provider = new SpriteAssetProvider(fourVariantManifest, fallback());
    provider.preload(
      stubScene([
        "tree-round-authored-01",
        "tree-round-authored-02",
        "tree-round-authored-03",
        "tree-round-authored-04",
      ]),
      {} as never,
    );

    const first = provider.textureRef(treeRound, 2, 1);
    const again = provider.textureRef(treeRound, 2, 1);
    expect(first).toEqual(again);
    expect([
      "tree-round-authored-01",
      "tree-round-authored-02",
      "tree-round-authored-03",
      "tree-round-authored-04",
    ]).toContain(first.key);

    const keys = new Set(
      [
        [0, 1],
        [2, 1],
        [7, 1],
        [8, 3],
        [3, 7],
        [8, 7],
        [3, 12],
        [1, 20],
      ].map(([x, y]) => provider.textureRef(treeRound, x ?? 0, y ?? 0).key),
    );
    expect(keys.size).toBeGreaterThan(1);
  });

  it("falls back when the authored tree textures are missing", () => {
    const provider = new SpriteAssetProvider(fourVariantManifest, fallback("procedural"));
    provider.preload(stubScene([]), {} as never);
    expect(provider.textureRef(treeRound, 2, 1)).toEqual({ key: "procedural" });
  });
});
