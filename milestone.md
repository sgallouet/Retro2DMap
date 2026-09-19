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
- ✅ Grass mapping/material refinement: target-sampled green ramp, denser micro-blades, soft stepped lips, distinct outer/inner corners, no fake dark substrate outline.
- ✅ Grass study reduced to a true 1:1 12×8 diagnostic board so every 48px tile can be judged directly.
- 🚧 **Now:** judge this 1:1 meadow tile and make any final grass-only corrections that are obvious.
- ⏭ Then reuse the proven topology/art split for warm path → cliff/terrace → stairs in the same bottom-right section.

**Rule:** do not spread effort across the whole map while the base terrain tile language is still weak.
