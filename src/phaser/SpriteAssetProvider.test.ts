import { describe, expect, it } from "vitest";
import { worldCatalog } from "../domain/catalog";
import type { SpriteAssetManifest } from "../assets/SpriteAssetManifest";
import type { IAssetProvider, TextureRef } from "./IAssetProvider";
import { SpriteAssetProvider } from "./SpriteAssetProvider";

const treeRound = worldCatalog.get("tree-round");
if (!treeRound) throw new Error("missing tree-round catalog entry");

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
