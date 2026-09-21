# Asset Pipeline

> Product intent lives in [../REQUIREMENTS.md](../REQUIREMENTS.md). The asset pipeline must remain replaceable without changing semantic map data.

## Lifecycle

`IAssetProvider` has two phases:

1. `preload()` — register external images/atlases with Phaser.
2. `prepare()` — create or finalize runtime textures after loading.

Rendering asks the provider for a `TextureRef`:

```ts
interface TextureRef {
  key: string;
  frame?: string | number;
}
```

This works for both generated Canvas textures and atlas frames.

## Current provider

`ProceduralAssetProvider`

- generates all visible art in code
- uses terrain topology keys
- uses connected-prop network masks
- is the default provider while the map/editor architecture is evolving

## Future-ready provider

`SpriteAssetProvider`

- reads a `SpriteAssetManifest`
- loads Phaser atlases during preload
- maps catalog IDs and semantic topology keys to atlas frames
- supports multiple deterministic visual variants per topology
- falls back **per catalog entry / missing topology** to the procedural provider

This fallback is deliberate: final art can be introduced gradually rather than requiring a big-bang migration.

## Manifest shape

A manifest declares atlas sources and catalog recipes.

Conceptually:

```ts
{
  atlases: [
    {
      key: "world",
      imageUrl: "/assets/world.webp",
      atlasUrl: "/assets/world.json"
    }
  ],
  entries: {
    "tree-round": {
      kind: "static",
      atlas: "world",
      frame: "tree-round-01"
    },
    "water": {
      kind: "terrain",
      atlas: "world",
      topologies: {
        "c15-i0": ["water-interior-01", "water-interior-02"],
        "c14-i0": "water-edge-west"
      }
    },
    "fence": {
      kind: "network",
      atlas: "world",
      topologies: {
        "straight-90": "fence-horizontal",
        "corner-0": "fence-corner-ne",
        "cross": "fence-cross"
      }
    }
  }
}
```

Frame names exist only in the manifest/art layer. They never belong in `MapDocument`.

## Rule for asset work

If an art requirement appears to need a new map field solely to name a particular sprite, stop and reconsider. Usually the correct solution is one of:

- richer semantic catalog metadata
- richer topology
- a manifest mapping
- a renderer-only variation

The map should remain an asset-independent description of the world.


## Incremental authored trials

The first authored trial was the static `tree-round` prop. M1 adds normalized
castle-tower and house-blue trials so the whole-map composition contains both
an architectural landmark and a village building in the authored style.

Reason: it has no topology variants, is visually important, and immediately tests transparent overhang while keeping a simple 1×2 logical footprint.

Prompt and sizing contract:

- [SPRITE_PROMPT_TREE_ROUND.md](SPRITE_PROMPT_TREE_ROUND.md)
- logical footprint: 48×96 px
- visual canvas: 72×96 px
- target paths: `public/assets/props/tree-round.png` plus `tree-round-02.png` / `tree-round-03.png` / `tree-round-04.png` as deterministic visual variants

The runtime is already using `SpriteAssetProvider` with `ProceduralAssetProvider` fallback, so authored art can be enabled one asset at a time.

M1 authored additions:

- `public/assets/props/castle-tower-authored.png`: 96×144 RGBA, normalized to
  the declared 2×3 tower footprint.
- `public/assets/props/castle-gate-authored.png`: 96×96 RGBA, normalized to
  the declared 2×2 open-gate footprint.
- `public/assets/props/house-blue-authored.png`: 144×144 RGBA, normalized to
  the declared 3×3 house footprint.
- `public/assets/props/throne-authored.png`: 96×96 RGBA, normalized to the
  declared 2×2 throne footprint.
- `public/assets/props/bookshelf-authored.png`: 96×48 RGBA, normalized to the
  declared 2×1 bookshelf footprint.
- `public/assets/props/table-authored.png`: 144×48 RGBA, normalized to the
  declared 3×1 table footprint.
- `public/assets/props/stairs-authored.png`: 96×48 RGBA, normalized to the
  declared 2×1 stairs footprint.
- `public/assets/props/pillar-authored.png`: 48×96 RGBA, normalized to the
  declared 1×2 pillar footprint.

All are mapped by catalog ID in `src/assets/spriteManifest.ts`. The red house,
castle wall/gate, banners, actors, and remaining prop families stay procedural
until their topology and anchor contracts are authored and reviewed.

`kind: "terrain-base"` maps a catalog terrain to a fill image. The procedural provider still paints topology edges on top of that fill. Missing images fall back to a fully procedural tile.
