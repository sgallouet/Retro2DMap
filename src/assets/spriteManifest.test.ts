import { describe, expect, it } from "vitest";
import { worldCatalog } from "../domain/catalog";
import { spriteAssetManifest } from "./spriteManifest";

describe("spriteAssetManifest", () => {
  it("maps tree-round images and grass center material, leaving every other catalog entry unmapped", () => {
    expect(spriteAssetManifest.images).toEqual([
      { key: "tree-round-authored-01", imageUrl: "/assets/props/tree-round.png" },
      { key: "tree-round-authored-02", imageUrl: "/assets/props/tree-round-02.png" },
      { key: "tree-round-authored-03", imageUrl: "/assets/props/tree-round-03.png" },
      { key: "tree-round-authored-04", imageUrl: "/assets/props/tree-round-04.png" },
      { key: "grass-center-authored", imageUrl: "/assets/terrain/grass-center.png" },
    ]);
    expect(spriteAssetManifest.entries).toEqual({
      "tree-round": {
        kind: "image",
        texture: [
          "tree-round-authored-01",
          "tree-round-authored-02",
          "tree-round-authored-03",
          "tree-round-authored-04",
        ],
      },
      grass: {
        kind: "terrain-base",
        texture: "grass-center-authored",
      },
    });

    for (const entry of [...worldCatalog.terrains, ...worldCatalog.props, ...worldCatalog.actors]) {
      if (entry.id === "tree-round" || entry.id === "grass") continue;
      expect(spriteAssetManifest.entries[entry.id]).toBeUndefined();
    }
  });
});

