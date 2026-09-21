> HISTORICAL: superseded for current execution by docs/M1_REFERENCE_MAP_EXECUTION_PLAN.md. Terrain placement is not accepted; prop/art work is frozen.

# M1 reference-map QA record

Status: semantic candidate is healthy; strict M1 visual acceptance is not yet
claimed.

## Evidence

- Target image: [target-map.png](../../reference/target-map.png)
- Historical baseline: [current-map-2026-09-19.png](../../reference/current-map-2026-09-19.png)
- Semantic blueprint: [reference-map-layout.md](../../reference-map-layout.md)
- Art contract: [reference-map-art.md](../../reference-map-art.md)
- Live evidence: [http://127.0.0.1:5666/](http://127.0.0.1:5666/)
- View: 40×30 map, default fit camera, clean overlays, browser shell excluded
  from the visual comparison.

## Acceptance matrix

| Area | Result | Evidence |
| --- | --- | --- |
| Grid and document dimensions | Pass | 40×30 integer grid; layout blueprint |
| Terrain and support semantics | Pass | explicit terrain commands; bridge retains water underneath |
| Route reachability | Pass | named four-neighbor routes in `sampleKingdom.test.ts` |
| Royal axis and connected rug | Pass | x=27 axis; 14-cell 2-wide surface network |
| Placement failure visibility | Pass | atomic command sections throw section/index/id/anchor/reason |
| Representative authored art | Improved / Partial | authored tower, open gate, blue house, throne, bookshelves, table, stairs, and pillars are normalized and manifest-mapped; castle wall network and actors remain procedural |
| Whole-map art coherence | Provisional | water, walls, actors, furniture, red house, and fixtures remain procedural |
| Live validator | Pass | UI reported “Map validation passed.” |
| Grid overlay smoke check | Pass | enabled and restored cleanly in the live editor |
| Edit/undo/export-import smoke check | Unverified | not yet recorded as a live disposable-document flow |
| Required detail-crop evidence | Missing | only the full-map live view is currently recorded |
| Manual visual acceptance | Pending | requires user review of the live map |

## Self-review verdict

The semantic map is ready for inspection: composition, integer anchors,
support rules, route reachability, crossings, gate semantics, and connected rug
topology all pass automated checks. The castle hall/library/stairs junction now
has an authored furniture proof set, but the surrounding wall/gate and actor
families remain procedural. The compact detail-crop evidence plus live
export/import smoke record are still outstanding.

## Checks run

```text
npm test
16 test files passed; 80 tests passed.

npm run build
passed.
```

The build reports only the existing large-bundle warning; it does not fail the
build. The art scope intentionally excludes water bitmap authoring in M1.

