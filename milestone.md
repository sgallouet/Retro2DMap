# Milestones — TL;DR

> Keep this short. [REQUIREMENTS.md](REQUIREMENTS.md) is the project contract.

**Current phase:** editor composition tools

- ✅ Semantic grid model; 1 character = 1 tile; multi-tile props first-class.
- ✅ Smart terrain painting: freehand, 1×1/3×3/5×5, line, rectangle.
- ✅ 8-neighbour terrain + connected wall/fence/bridge/cliff topology.
- ✅ Procedural art now; gradual atlas/sprite replacement contract ready.
- ✅ Navigation/walkability derivation + debug overlay.
- ✅ **Semantic prefabs:** atomic compound recipes, palette, footprint preview, undo.
- ✅ Automated tests + CI typecheck/test/build.
- 🚧 **Now:** selection / move / rotate foundations.
- ⏭ Next: validation + route preview → generator API → large-map chunking → authored art.

**Rule:** map JSON stores world meaning, never sprite-frame or prefab decisions.
