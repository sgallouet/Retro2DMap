import type Phaser from "phaser";
import type { CatalogEntry, IWorldCatalog } from "../domain/catalog";
import type { NetworkRenderContext, TerrainRenderContext } from "../domain/autotile";

export interface AssetRenderContext {
  terrain?: TerrainRenderContext;
  network?: NetworkRenderContext;
}

export interface IAssetProvider {
  prepare(scene: Phaser.Scene, catalog: IWorldCatalog): void;
  textureKey(
    entry: CatalogEntry,
    x: number,
    y: number,
    context?: AssetRenderContext,
  ): string;
}
