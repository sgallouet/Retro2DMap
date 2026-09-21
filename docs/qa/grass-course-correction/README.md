# Grass course-correction proof

The clean reference crop is `target-grass-dirt-crop.png`, taken from the
original target without flowers, trees, or shadows in the material area.

`comparison-final.png` shows the target, current selected 48px asset, the
initial reference-guided study, and the one targeted correction at the same
display scale. Each candidate was reduced to 48×48 with nearest-neighbor and
high-quality bicubic sampling; the displayed candidate comparisons use the
bicubic result and include a 2×2 repeat patch.

The initial study improved density but was too neon, broad-bladed, and had a
wide straight dirt band. The targeted correction improved palette and blade
scale but repeated horizontal dirt bands across the sample. Both are rejected.

No runtime code, map, manifest, topology, or production asset was changed.
Stop here until a source matches the target's softer interwoven grass and
short irregular verge in a single clean material/contact sample.
