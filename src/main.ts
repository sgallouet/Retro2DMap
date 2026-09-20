import Phaser from "phaser";
import "./styles.css";
import { worldCatalog } from "./domain/catalog";
import { EditorController } from "./editor/EditorController";
import { createSampleKingdom } from "./maps/sampleKingdom";
import { createGrassStudy } from "./maps/grassStudy";
import { createGrassSeamStudy } from "./maps/grassSeamStudy";
import { MapScene } from "./phaser/MapScene";
import { prefabCatalog } from "./prefabs/catalog";
import { ProceduralAssetProvider } from "./phaser/ProceduralAssetProvider";
import { SpriteAssetProvider } from "./phaser/SpriteAssetProvider";
import { spriteAssetManifest } from "./assets/spriteManifest";
import { LocalStorageMapStore } from "./storage/LocalStorageMapStore";
import { EditorShell } from "./ui/EditorShell";\nimport { PalettePreviewEnhancer } from "./ui/PalettePreviewEnhancer";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app root.");

const params = new URLSearchParams(window.location.search);
const mapParam = params.get("map");
const createInitialMap =
  mapParam === "grass-study"
    ? createGrassStudy
    : mapParam === "grass-seam"
      ? createGrassSeamStudy
      : createSampleKingdom;

const editor = new EditorController(createInitialMap(), worldCatalog, prefabCatalog);
const store = new LocalStorageMapStore();
const shell = new EditorShell(root, editor, worldCatalog, prefabCatalog, store, createInitialMap);
shell.mount();

const assets = new SpriteAssetProvider(
  spriteAssetManifest,
  new ProceduralAssetProvider(),
);
const scene = new MapScene({ editor, catalog: worldCatalog, prefabs: prefabCatalog, assets });
const palettePreview = new PalettePreviewEnhancer(
  root,
  scene,
  assets,
  worldCatalog,
  prefabCatalog,
);
palettePreview.mount();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-canvas",
  backgroundColor: "#141b17",
  scene: [scene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: "100%",
    height: "100%",
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
});
