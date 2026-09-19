import type Phaser from "phaser";
import type { CatalogEntry, IWorldCatalog } from "../domain/catalog";

export interface IAssetProvider {
  prepare(scene: Phaser.Scene, catalog: IWorldCatalog): void;
  textureKey(entry: CatalogEntry, x: number, y: number): string;
}
