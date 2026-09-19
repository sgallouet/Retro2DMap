import type { SpriteAssetManifest } from "./SpriteAssetManifest";

/**
 * Incremental authored-art manifest.
 *
 * It intentionally starts empty so the app remains 100% procedural until a
 * real sprite file is committed. Add one entry at a time; missing assets keep
 * using ProceduralAssetProvider automatically.
 *
 * First planned trial:
 *
 * images: [
 *   {
 *     key: "tree-round-authored",
 *     imageUrl: "/assets/props/tree-round.png",
 *   },
 * ],
 * entries: {
 *   "tree-round": {
 *     kind: "image",
 *     texture: "tree-round-authored",
 *   },
 * },
 */
export const spriteAssetManifest: SpriteAssetManifest = {
  images: [],
  atlases: [],
  entries: {},
};
