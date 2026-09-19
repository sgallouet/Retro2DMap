# Milestones — TL;DR

> Keep this short. [REQUIREMENTS.md](REQUIREMENTS.md) is the project contract.

**Current phase:** reusable world-building commands

- ✅ Semantic grid + multi-tile props + smart terrain/network topology.
- ✅ Free/line/rectangle painting + procedural→sprite asset contract.
- ✅ Semantic prefabs: atomic recipes, palette, footprint preview, undo.
- ✅ Select + drag-move props/actors; actor facing rotation.
- ✅ Derived walkability, A* route inspector, map validation overlays.
- ✅ Automated tests + CI typecheck/test/build.
- 🚧 **Now:** rule-based generator/command API shared by editor + future AI.
- ⏭ Next: prop/prefab orientation → marquee/room tools → chunking → authored art.

**Rule:** map JSON stores world meaning, never sprite-frame or prefab decisions.
