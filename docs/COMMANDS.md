# Semantic World Commands

> Read [../REQUIREMENTS.md](../REQUIREMENTS.md) first. Commands are a programmatic way to request world meaning, not pixels.

`WorldCommand` is the shared boundary for procedural generators, future AI builders, tests, and non-interactive tooling.

## Principle

A command says:

- paint this region as water,
- draw this path as road,
- place this semantic prop,
- draw this connected wall/fence/bridge network,
- place this actor,
- stamp this semantic prefab.

A command never says:

- use sprite frame 42,
- choose north-west water corner art,
- draw these pixels.

Topology and the asset provider still decide visual representation.

## Supported commands

- `paint-terrain-rect`
- `paint-terrain-path`
- `place-prop`
- `place-network-path`
- `place-actor`
- `place-prefab`

## Atomic batches

`WorldCommandExecutor.executeAtomic()` applies a command list to a clone first. If a command fails, the original map remains untouched.

That makes generator and AI workflows safe to compose: a plan either commits as a semantic unit or rolls back.

## Same services as the editor

Commands delegate to:

- `LogicalWorldPainter`
- `EntityPlacementService`
- `PrefabPlacer`

There is intentionally no second implementation of placement or painting rules.

## Generator example

`VillageBlockGenerator` emits a deterministic list of semantic commands from a region and seed. It is deliberately small; its purpose is to prove the architecture.

Future generators should return commands/plans rather than mutating Phaser objects directly.
