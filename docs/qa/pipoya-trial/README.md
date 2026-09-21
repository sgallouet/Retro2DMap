# Pipoya terrain trial — 2026-09-20

- Source: https://pipoya.itch.io/pipoya-rpg-tileset-32x32 (Pipoya, main 32x32 ZIP).
- License: personal/commercial use and editing allowed; standalone asset redistribution/resale prohibited. Raw download and extracted files are ignored by Git.
- Local source: `source/Pipoya RPG Tileset 32x32/SampleMap/`.
- Selected grass: `[Base]BaseChip_pipo.png`, tile (0,0); road/fringes: first 256x192 block of `[A]Grass_pipo.png`.
- Rebuild: `python docs/qa/pipoya-trial/build_trial.py` (Pillow).
- Original pixel colors; original 16x16 quadrants assembled on a 32x32 grid. No generated art, recoloring, filtering, target underlay, or props.
- `pipoya-patch-native.png`: 32px cells. `pipoya-patch-48.png`: 48px cells via nearest-neighbor, which gives uneven 1.5x pixel scaling. `pipoya-patch-2x.png`: exact integer 2x enlargement.
- Layout demonstrates a straight road, concave junctions, convex corners, endcaps and repeated grass.
- Checked: full opacity and visual inspection of the assembled patch. No runtime changes or broad tests.
- Assessment: cohesive fringes and quieter grass; still flatter grass and paler road than the target. Not yet accepted as the final art.
- User-painted maps and current editor assets remain unchanged.
