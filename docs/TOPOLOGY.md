# Topology Contract

> Read [../REQUIREMENTS.md](../REQUIREMENTS.md) first. This document defines the renderer/atlas-facing representation of semantic connectivity.

The map never stores visual tile variants. Topology is derived at runtime from semantic neighbors.

## Terrain

Terrain uses eight-neighbour connectivity.

### Cardinal bits

| Direction | Bit |
| --- | ---: |
| North | 1 |
| East | 2 |
| South | 4 |
| West | 8 |

### Diagonal bits

| Direction | Bit |
| --- | ---: |
| North-east | 16 |
| South-east | 32 |
| South-west | 64 |
| North-west | 128 |

A terrain render context exposes:

- `neighborMask`: all eight connections
- `cardinalMask`: N/E/S/W subset
- `innerCornerMask`: diagonal holes where both adjacent cardinals connect
- `topologyKey`: stable atlas-facing key
- `variation`: deterministic cosmetic variant

Topology keys use:

```text
c{cardinalMask}-i{innerCornerMask}
```

Example:

```text
c15-i16
```

means all four cardinal sides connect but the north-east diagonal is absent, so the tile needs a north-east concave inner corner.

Different terrain IDs can connect when they share the same `connectGroup`. This is how `water` and `deep-water` can form one continuous body while remaining semantically distinct terrain.

## Connected props

Connected props use four-direction topology. The map stores ordinary semantic prop instances such as `fence` or `castle-wall`; it never stores "corner fence" or "T wall".

Catalog entries with a `network` declaration derive one of:

- `isolated`
- `end-{rotation}`
- `straight-{rotation}`
- `corner-{rotation}`
- `tee-{rotation}`
- `cross`

Rotations are 0, 90, 180 or 270 degrees.

Currently connected networks include:

- castle walls
- fences
- bridges
- cliffs

## Painter rule

The painter changes semantic content first. Topology is recalculated afterward.

Never add an editor tool whose primary job is to choose a topology frame manually. If a rare art case cannot be represented by the semantic topology, extend the semantic/topology model instead of leaking sprite names into the map.

## Future authored sprites

A sprite atlas maps these stable topology keys to frames. Several frames may map to one topology key for deterministic visual variation.

That means final art can replace procedural art without migrating map JSON.
