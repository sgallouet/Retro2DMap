import type Phaser from "phaser";
import type { CatalogEntry, IWorldCatalog } from "../domain/catalog";
import type { TerrainRenderContext } from "../domain/autotile";

export interface IAssetProvider {
  prepare(scene: Phaser.Scene, catalog: IWorldCatalog): void;
  textureKey(
    entry: CatalogEntry,
    x: number,
    y: number,
    terrainContext?: TerrainRenderContext,
  ): string;
}
