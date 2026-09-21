import Phaser from "phaser";
import "./styles.css";
import { worldCatalog } from "./domain/catalog";
import { EditorController } from "./editor/EditorController";
import { createGrassStudy } from "./maps/grassStudy";
import { createGrassSeamStudy } from "./maps/grassSeamStudy";
import { createGrassTransitionStudy } from "./maps/grassTransitionStudy";
import { createPathSeamStudy } from "./maps/pathSeamStudy";
import { createReferenceMap01RoadsOnly } from "./maps/referenceMap01";
import { createTerrainStudy } from "./maps/terrainStudy";
import { createWoodFloorSeamStudy } from "./maps/woodFloorSeamStudy";
import { MapScene } from "./phaser/MapScene";
import { prefabCatalog } from "./prefabs/catalog";
import { ProceduralAssetProvider } from "./phaser/ProceduralAssetProvider";
import { SpriteAssetProvider } from "./phaser/SpriteAssetProvider";
import { spriteAssetManifest } from "./assets/spriteManifest";
import { LocalStorageMapStore } from "./storage/LocalStorageMapStore";
import { EditorShell } from "./ui/EditorShell";
import { PalettePreviewEnhancer } from "./ui/PalettePreviewEnhancer";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app root.");

const params = new URLSearchParams(window.location.search);
const mapParam = params.get("map");
const createInitialMap =
  mapParam === "grass-study"
    ? createGrassStudy
    : mapParam === "grass-seam"
      ? createGrassSeamStudy
      : mapParam === "grass-transition-study"
        ? createGrassTransitionStudy
      : mapParam === "path-seam"
      ? createPathSeamStudy
        : mapParam === "terrain-study"
          ? createTerrainStudy
        : mapParam === "wood-seam"
          ? createWoodFloorSeamStudy
        : createReferenceMap01RoadsOnly;

const editor = new EditorController(createInitialMap(), worldCatalog, prefabCatalog);
const store = new LocalStorageMapStore();

const assets = new SpriteAssetProvider(
  spriteAssetManifest,
  new ProceduralAssetProvider(),
);
const scene = new MapScene({ editor, catalog: worldCatalog, prefabs: prefabCatalog, assets });
const shell = new EditorShell(root, editor, worldCatalog, prefabCatalog, store, createInitialMap,
  (view) => scene.setReferenceView(view));
shell.mount();
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
