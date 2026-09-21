# Road polish evidence

The final center materials are normalized to 48×48 pixels with nearest-neighbor sampling:

- `path-center-repeat-4x4.png` — warm dirt repeat proof.
- `cobble-center-repeat-4x4.png` — gray cobble repeat proof.
- the live Vite preview was inspected at 100% map opacity on the unchanged Reference Map 01 layout; its existing straight roads, bends, wider patches, map-edge continuation, and path/cobble join exercise the actual compositor.

The road compositor keeps connected cardinal sides opaque and clears only the 1–3px exposed contour plus stepped inner-corner pixels. Transparent contour pixels intentionally reveal the current reference background; the authored centers contain no target pixels.

Source map SHA-256 before and after art work: `207787DA255EC2C3C8CBB9348E2B7822C337170AD4AEA9492A2E5C8DE3F3A68C`.

Checks:

- `npm run typecheck` — passed.
- focused road/topology/material/map tests — 31 passed.
- `npm run build` — passed.
- full `npm test` — 89 passed, 2 pre-existing `sampleKingdom.test.ts` failures; those legacy sample-map failures are outside this road-only change.
