export interface AtlasSource {
  /** Phaser texture/atlas key. */
  key: string;
  imageUrl: string;
  atlasUrl: string;
}

export type FrameChoice = string | readonly string[];

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

export type SpriteSpec = StaticSpriteSpec | TerrainSpriteSpec | NetworkSpriteSpec;

export interface SpriteAssetManifest {
  atlases: readonly AtlasSource[];
  /**
   * Catalog ID -> visual recipe. Missing entries automatically fall back to
   * the procedural provider.
   */
  entries: Readonly<Record<string, SpriteSpec>>;
}
