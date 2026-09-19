export interface ImageSource {
  /** Phaser texture key for one loose PNG/WebP sprite. */
  key: string;
  imageUrl: string;
}

export interface AtlasSource {
  /** Phaser texture/atlas key. */
  key: string;
  imageUrl: string;
  atlasUrl: string;
}

export type FrameChoice = string | readonly string[];

export interface ImageSpriteSpec {
  kind: "image";
  /** Texture key declared in manifest.images. */
  texture: string;
}

export interface StaticSpriteSpec {
  kind: "static";
  atlas: string;
  frame: FrameChoice;
}

export interface TerrainSpriteSpec {
  kind: "terrain";
  atlas: string;
  /**
   * Keyed by TerrainRenderContext.topologyKey, for example "c15-i0".
   * Multiple frames are deterministic cosmetic variants.
   */
  topologies: Readonly<Record<string, FrameChoice>>;
}

export interface NetworkSpriteSpec {
  kind: "network";
  atlas: string;
  /**
   * Keyed by NetworkRenderContext.topologyKey, for example "corner-90".
   */
  topologies: Readonly<Record<string, FrameChoice>>;
}

export type SpriteSpec =
  | ImageSpriteSpec
  | StaticSpriteSpec
  | TerrainSpriteSpec
  | NetworkSpriteSpec;

export interface SpriteAssetManifest {
  /**
   * Loose image sprites are ideal while authoring one asset at a time.
   * They can later be packed into atlases without changing map semantics.
   */
  images?: readonly ImageSource[];
  atlases: readonly AtlasSource[];
  /**
   * Catalog ID -> visual recipe. Missing entries automatically fall back to
   * the procedural provider.
   */
  entries: Readonly<Record<string, SpriteSpec>>;
}
