# Reference Map 01 — Visual Target

This is the first acceptance map for Retro2DMap. It is based on the supplied screenshot and exists to prove that the semantic builder can create a polished, dense JRPG-style map rather than only a technically correct tile grid.

## Composition to preserve

- **West:** compact village with blue/red roof houses, inn/shop signs, flowers, fences and warm dirt roads.
- **North-west:** forested cliff/ridge framing the scene.
- **Center-left:** river corridor and bridge. Water visuals are intentionally temporary.
- **South-west:** wheat/farm plots plus a sheep enclosure.
- **East:** dominant cutaway royal castle.
- **Castle upper half:** library, bedroom, throne hall, dining room and armory.
- **Castle center:** strong red-carpet throne-room axis with king, guards and columns.
- **Castle lower half:** symmetrical garden courtyard, statues, central fountain and fortified gate.
- **South:** stone road leaving the gate, forest framing and farm density.

## Current fidelity priorities

1. Castle silhouette, wall depth, towers and gate.
2. Interior readability and room dressing.
3. Village buildings and roof silhouettes.
4. Trees / vegetation density and shape language.
5. Ground, path, cobble, stone-floor and wood-floor harmony.
6. Character readability at one-tile scale.
7. Farm/fence/garden composition.
8. Authored sprite replacement where procedural art stops being convincing.

## Water caveat

Do **not** spend significant iteration time polishing:

- river texture
- water-bank transitions
- waterfall rendering
- water animation

Water will use a substantially different visual approach later. Keep it structurally present so composition, bridges and navigation can be evaluated, but treat its current art as disposable.

## Acceptance rule

When choosing the next task, prefer the change that makes a side-by-side screenshot comparison visibly closer to the target.

Do not add editor architecture merely because it is theoretically useful. Add it only when the reference map exposes a real need.
