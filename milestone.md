# Milestones — TL;DR

> Keep this short. [REQUIREMENTS.md](REQUIREMENTS.md) is the project contract.

**Current phase:** first authored sprite trial

- ✅ Semantic grid + topology + procedural fallback remain intact.
- ✅ Grass mapping study established a clean terrain-topology contract.
- ✅ Runtime now uses `SpriteAssetProvider` with procedural fallback.
- ✅ Added support for one-off PNG/WebP sprites before atlas packing.
- ✅ Chosen first authored asset: **round deciduous tree** (static 1×2 prop, high visual impact, zero topology complexity).
- ✅ Exact generation prompt + sizing contract saved in `docs/SPRITE_PROMPT_TREE_ROUND.md`.
- ✅ First authored sprite trial: `tree-round.png` (72×96) enabled in the manifest; other assets stay procedural.
- ✅ Authored `grass` center material (`grass-center.png`) under the existing topology overlay.
- ⏭ Next: second tree variant → pine → flowers/rocks → then authored terrain edge families.

**Rule:** introduce sprites incrementally; never change semantic map data just to accommodate art.
