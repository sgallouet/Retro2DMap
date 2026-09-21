import { describe, expect, it } from "vitest";
import { worldCatalog } from "../domain/catalog";
import { spriteAssetManifest } from "./spriteManifest";

describe("spriteAssetManifest", () => {
  it("maps the authored castle proof/tower/house/tree/terrain trials and leaves provisional families unmapped", () => {
    expect(spriteAssetManifest.images).toEqual([
      { key: "castle-tower-authored", imageUrl: "/assets/props/castle-tower-authored.png" },
      { key: "castle-gate-authored", imageUrl: "/assets/props/castle-gate-authored.png" },
      { key: "house-blue-authored", imageUrl: "/assets/props/house-blue-authored.png" },
      { key: "throne-authored", imageUrl: "/assets/props/throne-authored.png" },
      { key: "bookshelf-authored", imageUrl: "/assets/props/bookshelf-authored.png" },
      { key: "table-authored", imageUrl: "/assets/props/table-authored.png" },
      { key: "stairs-authored", imageUrl: "/assets/props/stairs-authored.png" },
      { key: "pillar-authored", imageUrl: "/assets/props/pillar-authored.png" },
      { key: "tree-round-authored-01", imageUrl: "/assets/props/tree-round.png" },
      { key: "tree-round-authored-02", imageUrl: "/assets/props/tree-round-02.png" },
      { key: "tree-round-authored-03", imageUrl: "/assets/props/tree-round-03.png" },
      { key: "tree-round-authored-04", imageUrl: "/assets/props/tree-round-04.png" },
      { key: "grass-center-transition", imageUrl: "/assets/terrain/pipoya-repaint-trial/grass.png" },
      { key: "path-center-authored", imageUrl: "/assets/terrain/pipoya-repaint-trial/path.png" },
      { key: "cobble-center-authored", imageUrl: "/assets/terrain/cobble-center.png" },
      { key: "wood-floor-center-authored", imageUrl: "/assets/terrain/wood-floor-center.png" },
      { key: "water-center-authored", imageUrl: "/assets/terrain/water-center.png" },
      { key: "soil-center-authored", imageUrl: "/assets/terrain/soil-center.png" },
      { key: "stone-floor-center-authored", imageUrl: "/assets/terrain/stone-floor-center.png" },
    ]);
    expect(spriteAssetManifest.entries).toEqual({
      "castle-tower": {
        kind: "image",
        texture: "castle-tower-authored",
      },
      "castle-gate": {
        kind: "image",
        texture: "castle-gate-authored",
      },
      "house-blue": {
        kind: "image",
        texture: "house-blue-authored",
      },
      throne: {
        kind: "image",
        texture: "throne-authored",
      },
      bookshelf: {
        kind: "image",
        texture: "bookshelf-authored",
      },
      table: {
        kind: "image",
        texture: "table-authored",
      },
      stairs: {
        kind: "image",
        texture: "stairs-authored",
      },
      pillar: {
        kind: "image",
        texture: "pillar-authored",
      },
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
        texture: "grass-center-transition",
      },
      path: {
        kind: "terrain-base",
        texture: "path-center-authored",
      },
      cobble: {
        kind: "terrain-base",
        texture: "cobble-center-authored",
      },
      "wood-floor": {
        kind: "terrain-base",
        texture: "wood-floor-center-authored",
      },
      water: {
        kind: "terrain-base",
        texture: "water-center-authored",
      },
      soil: {
        kind: "terrain-base",
        texture: "soil-center-authored",
      },
      "stone-floor": {
        kind: "terrain-base",
        texture: "stone-floor-center-authored",
      },
    });

    for (const entry of [...worldCatalog.terrains, ...worldCatalog.props, ...worldCatalog.actors]) {
      if (
        entry.id === "castle-tower" ||
        entry.id === "castle-gate" ||
        entry.id === "house-blue" ||
        entry.id === "throne" ||
        entry.id === "bookshelf" ||
        entry.id === "table" ||
        entry.id === "stairs" ||
        entry.id === "pillar" ||
        entry.id === "tree-round" ||
        entry.id === "grass" ||
        entry.id === "path" ||
        entry.id === "cobble" ||
        entry.id === "wood-floor" ||
        entry.id === "water" ||
        entry.id === "soil" ||
        entry.id === "stone-floor"
      ) continue;
      expect(spriteAssetManifest.entries[entry.id]).toBeUndefined();
    }
  });
});
