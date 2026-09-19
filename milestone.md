# Milestones — TL;DR

> Keep this short. [REQUIREMENTS.md](REQUIREMENTS.md) is the project contract.

**Current phase:** first authored sprite trial

- ✅ Semantic grid + topology + procedural fallback remain intact.
- ✅ Grass mapping study established a clean terrain-topology contract.
- ✅ Runtime now uses `SpriteAssetProvider` with procedural fallback.
- ✅ Added support for one-off PNG/WebP sprites before atlas packing.
- ✅ Chosen first authored asset: **round deciduous tree** (static 1×2 prop, high visual impact, zero topology complexity).
- ✅ Exact generation prompt + sizing contract saved in `docs/SPRITE_PROMPT_TREE_ROUND.md`.
- 🚧 **Now:** generate/review `tree-round.png`, downsample to 72×96, then enable only that manifest entry.
- ⏭ If successful: second tree variant → pine → flowers/rocks → then authored terrain families.

**Rule:** introduce sprites incrementally; never change semantic map data just to accommodate art.
