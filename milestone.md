# Milestones — TL;DR

> Keep this file short. Read [REQUIREMENTS.md](REQUIREMENTS.md) for the full project contract.

**Current phase:** semantic world builder foundation

- ✅ Square-grid map model; 1 character = 1 tile; multi-tile props first-class.
- ✅ Semantic terrain painter: freehand, 1×1/3×3/5×5, line, rectangle.
- ✅ 8-neighbour terrain topology + smart connected walls/fences/bridges/cliffs.
- ✅ Procedural art now; atlas/sprite provider contract ready for gradual replacement.
- ✅ Undo/redo, zoom/pan, JSON import/export, local save, walkability overlay.
- ✅ Automated tests + CI typecheck/test/build.
- 🚧 **Now:** semantic prefabs / compound buildings and rooms.
- ⏭ Next: prefab editor placement → selection/move/rotate → validation/path preview → generator API → large-map chunking.

**Rule:** map JSON stores world meaning, never sprite-frame decisions.
