# Authored Terrain Materials

Center fills (48×48, seamless):

- `grass-center-transition.png` → semantic terrain `grass` (temporary rejected proof asset; not approved production art)
- `path-center.png` → semantic terrain `path`
- `cobble-center.png` → semantic terrain `cobble`
- `wood-floor-center.png` → semantic terrain `wood-floor`
- `water-center.png` → semantic terrain `water`
- `soil-center.png` → semantic terrain `soil`
- `stone-floor-center.png` → semantic terrain `stone-floor`

They are interior material only. N/E/S/W edges, outer corners, and inner
corners still come from the topology-aware renderer. Grass/road contact is
composed into the road-owned tile using the same grass source; it does not
borrow pixels from the reference image.

Inspect tiling with `?map=grass-seam` and `?map=path-seam` (10×10 interior,
no topology edges) and mapping/topology with `?map=terrain-study`.
