import type { SpriteAssetManifest } from "./SpriteAssetManifest";

/**
 * Incremental authored-art manifest.
 *
 * Add one entry at a time; missing assets keep using ProceduralAssetProvider
 * automatically. `tree-round` is the first authored trial.
 */
export const spriteAssetManifest: SpriteAssetManifest = {
  images: [
    { key: "tree-round-authored-01", imageUrl: "/assets/props/tree-round.png" },
    { key: "tree-round-authored-02", imageUrl: "/assets/props/tree-round-02.png" },
    { key: "tree-round-authored-03", imageUrl: "/assets/props/tree-round-03.png" },
    { key: "tree-round-authored-04", imageUrl: "/assets/props/tree-round-04.png" },
    { key: "grass-center-authored", imageUrl: "/assets/terrain/grass-center.png" },
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
    grass: {
      kind: "terrain-base",
      texture: "grass-center-authored",
    },
  },
};
