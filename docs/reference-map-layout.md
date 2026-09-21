> HISTORICAL: superseded for current execution by docs/M1_REFERENCE_MAP_EXECUTION_PLAN.md. Terrain placement is not accepted; prop/art work is frozen.

# Reference Map 01 — authoritative M1 grid layout

This is the semantic blueprint for the editable 40×30 map. Coordinates are
zero-based, x increases east, y increases south, and every rectangle is
half-open: `[x, x+w) × [y, y+h)`. A command rectangle uses inclusive `to`
coordinates, so the final cell is emitted as `x+w-1, y+h-1`.

The map remains 40×30 cells at 48 logical pixels per cell (1920×1440 world,
4:3). Actors occupy exactly one integer cell. Props are top-left anchored and
their catalog footprint owns every cell in the footprint.

## Terrain schematic

Legend: `G` meadow grass, `F` forest grass, `P` warm path, `C` castle cobble,
`S` stone floor, `O` wood floor, `W` water, `D` deep water, `T` soil, `g`
garden grass. `.` means meadow grass with no special override. The castle and
rooms are cut away: walls and furniture are props over these floor cells.

```text
    0000000000111111111122222222223333333333
    0123456789012345678901234567890123456789
00  FFFFFFFFFF.WDW.........................
01  FFFFFFFFFF.WWW.SSSSSSSSSSSSSSSSSSSSSS..
02  FFFFFFFFFF.WWW.SOOOOSSSSOOSSSSSOOOOO..
03  FFFFFFFFFF.WWW.SOOOOSSSSOOSSSSSOOOOO..
04  FFFFFFFFFF.WWW.SOOOOSSSSOOSSSSSOOOOO..
05  ..........WWWW.SOOOOSSSSOOSSSSSOOOOO..
06  ..........WWWW.SSSSSSSSSSSSSSSSSSSSS..
07  ..........WWWW.SOOOOSSSSOOSSSSSOOOOO..
08  ..........WWWW.SOOOOSSSSOOSSSSSOOOOO..
09  ..........WWWW.SOOOOSSSSOOSSSSSOOOOO..
10  ..........WWWW.SOOOOSSSSOOSSSSSSSSSS..
11  ..........WWWW.SSSSSSSSSSSSSSSSSSSSS..
12  ......PPPPWWWWCSSSSSSSSSSSSSSSSSSSS..
13  ..........WWWW.CCCCCgggggCCgggggC....
14  ..........WWWW.CCCCCgggggCCgggggC....
15  ..........WWWW.CCCCCgggggCCgggggC....
16  ..........WWWW.CCCCCgggggCCgggggC....
17  ..........WWWW.CCCCCCCCCCCCCCCCCCCC...
18  ..........WWWW.SSSSSSSSSSSSSSSSSSSS...
19  ..........WWWW.GGGGGCCCCGGGGGGGGGG....
20  ..........WWWWWWWWWWWWWWWWWWWWWWWWWWWW
21  ..........GGGGWWWWWWWWWWWWWWWWWWWWWWWW
22  FFFFFFFFFFFFFFFWWWWWWWWWWWWWWWWWWWWWWWW
23  FFFFFFFFFFFFFFFPPPPPPPPPPPPPPPPPPPPPPP
24  FFFF.FFFFFFFFFF..TTTT.PPTTTT........F.
25  FFFF.FFFFFFFFFF..TTTT.PPTTTT........F.
26  FFFF.FFFFFFFFFF..TTTT.PPTTTT........F.
27  FFFF.PFFFFFFFFF..TTTT.PPTTTT........F.
28  FFFF.FFFFFFFFFF..TTTT.PPTTTT........F.
29  FFFF.FFFFFFFFFF..TTTT.PPTTTT........F.
```

Rows in the schematic are intentionally compact; the authoritative terrain
overrides are the command sections in `src/maps/sampleKingdom.ts`. In
particular, bridge cells retain `W`/`D` water underneath; bridge props provide
the traversal surface. The river is x=10..13 for y=5..19. The moat is x=14..39
for y=20..22. The only water crossing is the horizontal bridge at y=12 and
the only gate crossing is the two-cell bridge at x=26..27.

## Centerline, structural regions and openings

The royal axis is the integer center x=27. Two-cell assemblies use anchors
x=26 (gate, bridge, stairs, fountain); one-cell actors on the axis use x=27.
The hall is x=24..30, the central courtyard bypass is x=25..29, and the
south road is x=26..28. No fractional semantic coordinates are used.

| Region | Half-open extent / anchors | Required openings and free route cells |
| --- | --- | --- |
| North-west village | houses `(1,5)`, `(1,11)`, `(1,16)`, optional fourth `(5,2)`; 3×3 each | approaches `(2,8)`, `(2,14)`, `(2,19)`, `(6,5)` |
| River | vertical x=10..13, y=5..19; source x=11..13, y=0..4 | west bridge ends `(9,12)`, `(14,12)` |
| Castle slab | floor x=16..37, y=1..19 | west side doorway `(16,12)`; gate landing x=25..28,y=19 |
| Library | wood floor x=17..22,y=2..6 | hall doorway `(22,5)` / wall opening x=23,y=5 |
| Bedroom | wood floor x=17..22,y=7..10 | hall doorway `(22,9)` / wall opening x=23,y=9 |
| Throne hall | stone floor x=24..30,y=2..11 | audience cells `(27,10)`, `(27,4)`; stairs `(26,11)` |
| Courtyard | cobble x=21..34,y=12..17; garden beds x=20..24 and x=31..35 | fountain footprint `(26,14)`; bypasses `(25,14)` and `(28,14)` |
| Gate | open `castle-gate` footprint `(26,17)` 2×2; stairs `(26,19)` 2×1 | inside `(27,16)`, landing `(25,19)`, outside `(28,19)` |
| Moat | water x=14..39,y=20..22 | bridge footprint x=26..27,y=20..22 |
| Farm | soil plots x=1..4,y=25..29 and x=6..7,y=25..29 | farmer aisle x=5,y=24..29 |
| Sheep pen | fence boundary x=9..14,y=24..28 | left entrance `(9,27)`, interior `(10,27)` |
| South approach | road x=26..28,y=23..29 | south entry `(27,29)` |

## Major footprints and support rules

| Entity | Catalog ID | Anchor | Footprint / support |
| --- | --- | --- | --- |
| Outer towers | `castle-tower` | `(14,0)`, `(38,0)`, `(14,17)`, `(38,17)` | 2×3, land or castle edge; attach to perimeter |
| Gate towers | `castle-tower` | `(23,17)`, `(30,17)` | 2×3, land; flank the open route |
| Gate | `castle-gate` | `(26,17)` | 2×2, open/nonblocking art; never a collision exception |
| Fountain | `fountain` | `(26,14)` | 2×2, blocking courtyard landmark; bypasses remain open |
| Rug | `rug-red` cells | x=26..27,y=4..10 | connected 2-wide surface; internal cells have no gold border |
| King | `king` | `(27,4)` | one cell on the carpet head, standing before throne |
| Hall guards | `guard` | `(24,4)`, `(30,4)`, `(24,10)`, `(30,10)` | one cell on stone floor, not on pillars |
| Gate guards | `guard` | `(25,19)`, `(28,19)` | one cell on cobble landing, not water or tower cells |
| Farmer | `farmer` | `(5,27)` | one cell on path aisle |
| Sheep | `sheep` | `(11,25)`, `(12,26)` | one cell on pen grass; explicit water exception not needed |
| Dock / boat | `dock`, `boat` | `(35,20)`, `(38,20)` | water-supported decorative exception; neither is walkable |

Decoration is added only after these corridors and footprints are reserved.
No placement helper may silently skip a required cell. A failed command names
its section, command index, catalog ID, anchor and reason.

## Named route checks

The acceptance test builds four-neighbor paths with actors ignored as blockers:

1. `(27,29)` → `(27,16)` → `(27,10)` (south entry, open gate, audience).
2. `(27,16)` → `(25,14)` and `(27,16)` → `(28,14)` (both fountain bypasses).
3. `(22,5)` → `(27,5)`, `(22,9)` → `(27,9)`, `(31,5)` → `(27,5)`, and `(31,9)` → `(27,9)` (all four room doors).
4. `(9,12)` → `(14,12)` over the five bridge cells; the route must not rely on diagonal movement.
5. `(2,8)`, `(2,14)`, `(2,19)` and `(6,5)` → the village path spine, plus `(5,27)` → `(9,27)` → `(10,27)` for the farm/pen approach.


