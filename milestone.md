# Milestones — TL;DR

> Keep this short. [REQUIREMENTS.md](REQUIREMENTS.md) is the project contract.

**Current phase:** bottom-right grass tile mapping study

- ✅ Semantic grid + multi-tile props + smart terrain/network topology.
- ✅ Reference Map 01 structural pass exists and remains the long-term visual acceptance map.
- ✅ Water visuals remain intentionally deferred.
- ✅ Terrain topology now exposes explicit open-edge mapping (N/E/S/W) plus concave inner-corner bits.
- ✅ Meadow grass now has a dedicated procedural center/edge/outer-corner/inner-corner renderer.
- ✅ Added a focused bottom-right study map with cobble road, dirt paths, terrace cut-outs and a deliberate inner-corner test.
- ✅ Automated topology tests cover straight edge, outer corner and inner corner mapping.
- 🚧 **Now:** inspect the rendered grass study and refine this one simple green tile family until the mapping and material both look right.
- ⏭ Only after grass is convincing: reuse the proven mapping approach for path/cliff/stairs in the same bottom-right section.

**Rule:** do not spread effort across the whole map while the base terrain tile language is still weak.
