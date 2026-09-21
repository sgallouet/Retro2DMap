# Reference terrain layout — reviewed Gate A mask

This is the independently reviewed terrain target for Reference Map 01. It
uses the target image at `1536×1152` registered to the complete `40×30` map
at the top-left origin. One target cell is `38.4×38.4` pixels; semantic
ownership is always an integer cell even when a bank, road, or room edge is
curved inside that cell.

Legend:

- `.` meadow grass
- `F` forest grass substrate
- `P` warm dirt path
- `C` castle cobble / exterior paving
- `S` stone floor
- `O` wood floor
- `W` river or moat water
- `D` deep-water channel center
- `T` farm soil

Rows are `y=0..29`, columns are `x=0..39`, and the terrain index is
`y*40+x`.

```text
    0000000000111111111122222222223333333333
    0123456789012345678901234567890123456789
00  FFFFFDDFFFFFCCCCCCCCCCCCCCCCCCCCCCCCCCCC
01  FFFFFDDFFFFFCCCSSSSSSSSSSSSSSSSSSSSSSSCC
02  FFFFFDDFFFFFCCCOOOOOOSSSSSSSSSSSOOOOOOCC
03  FFFFFWWDDDDDWWCOOOOOOSSSSSSSSSSSOOOOOOCC
04  .....WWDDDDDWWCOOOOOOSSSSSSSSSSSOOOOOOCC
05  ........WDDDWCCOOOOOOSSSSSSSSSSSOOOOOOCC
06  ........WDDDWCCOOOOOOSSSSSSSSSSSOOOOOOCC
07  ..P.....WDDDWCCOOOOOOSSSSSSSSSSSOOOOOOCC
08  ..P.....WDDDWCCOOOOOOSSSSSSSSSSSOOOOOOCC
09  PPPPPPPPWDDDWCCOOOOOOSSSSSSSSSSSOOOOOOCC
10  ..P.....WDDDWCCOOOOOOSSSSSSSSSSSOOOOOOCC
11  ..P.....WDDDWCCCCCCCCCCCCCCCCCCCCCCCCCCC
12  ..P.....WDDDWCCCCCCCCCCCCCCCCCCCCCCCCCCC
13  ..P.....WDDWCCCCCCC.....CCCCCC.....CCCCC
14  PPPPPPPPWDDWCCCCCCC.....CCCCCC.....CCCCC
15  ..P.....WDW.CCCWWCC.....CCCCCC.....CCCCC
16  ..P.....WDW.CCCWWCC.....CCCCCC.....CCCCC
17  ..P.....WDW.CCCWWCCCCCCCCCCCCCCCCCCCCCCC
18  ..P.....WDW.CCCWWCCCCCCCCCCCCCCCCCCCCCCC
19  PPPPPPPPWDW...CWWCCCCCCCCCCCCCCCCCCCCCCC
20  ..P.....WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
21  ..P.....WWDDDDDDDDDDDDDDDDDDDDDDDDDDDDDW
22  FFPFFFFFWWDDDDDDDDDDDDDDDDDDDDDDDDDDDDDW
23  PPPPPPPPPPPPPPPF.........PPP...FFFFFFFFF
24  PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
25  FTTTTPTTFFFFFFFF.........PPP...FFFFFFFFF
26  FTTTTPTTFFFFFFFF.........PPP...FFFFFFFFF
27  FTTTTPTTFFFFFFFF.........PPP...FFFFFFFFF
28  FTTTTPTTFFFFFFFF.........PPP...FFFFFFFFF
29  FTTTTPTTFFFFFFFF.........PPP...FFFFFFFFF
```

## Region decisions

| Region | Target-space reading | Selected cells and rounding decision |
| --- | --- | --- |
| River source and bend | Waterfall begins around target columns 5–6, widens east across rows 3–4, then turns south around columns 8–12. | `D` source `x=5..6,y=0..2`; `W/D` bend `x=5..13,y=3..4`; channel `x=8..12,y=5..12`. The bank-facing cells stay `W`; the darker center is `D`. |
| Lower river and moat | The visible channel narrows west of the castle, with a second water pocket beside the west tower, and joins the southern moat. | Channel `x=8..10,y=13..19`, pocket `x=15..16,y=15..19`, moat `x=8..39,y=20`, `x=10..39,y=21`, `x=12..39,y=22`. These shared boundaries are chosen once so the bend does not become a rectangle. |
| Castle slab and rooms | The castle starts at the west edge around column 12; room floors are visible inside the walls, with wood in both side room bands. | Cobble perimeter/landings use `x=12..39` at the top and west/east edges; stone interior is `x=15..37`; wood rooms are `x=15..20` and `x=32..37` in rows 2–5 and 7–10. Under-wall cells are intentionally assigned to the adjacent hard surface. |
| Courtyard and gardens | Courtyard paving fills the center below the room band; two grass beds interrupt it. | Cobble is retained around the two whole-cell garden rectangles `x=19..23` and `x=30..34`, `y=13..16`. The gardens use meadow grass because trees and flowers are frozen props, not terrain labels. |
| Village paths | The target has a west village spine with three eastward junction levels, then a lower approach across the map. | One-cell integer paths use the reviewed rows `y=9,14,19`, a west spine at `x=2`, the lower approach at `y=23..24`, and the south road at `x=25..27`. No path cell is used to make a water crossing pass; bridges remain frozen props over water. |
| Farm and forest ground | Crops and trees occlude substrate at the south edge. | Forest substrate is used only for the broad wooded bands at the west/south/east edges; soil is `x=1..4` and `x=6..7`, `y=25..29`, with the `x=5` aisle left as path. |

## Uncertain or occluded cells

| Area | Inferred substrate | Confidence / follow-up |
| --- | --- | --- |
| Castle top row and perimeter under towers/walls | Cobble | Medium-high. The target shows hard stone continuously; exact wall-vs-floor art is deferred to frozen props. |
| Cells under the west/east towers and gate assembly | Cobble or moat edge | Medium. The mask preserves the visible land/water silhouette and does not move the towers; any unsupported frozen prop is a later object-phase consequence. |
| Tree/crop centers in the south forest and farms | Forest grass or soil from surrounding continuity | Medium-high. No tree or crop silhouette is copied into terrain. |
| Bridge footprints | Underlying water | High. Bridge props are traversal surfaces and do not change terrain ownership. |

The target is not perfectly tiled. These decisions preserve the visible
river width changes, castle proportions, room materials, path junctions, and
farm/forest boundaries without fractional anchors or regional image warping.
