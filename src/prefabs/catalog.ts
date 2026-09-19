import type { PrefabDefinition, IPrefabCatalog } from "../domain/prefab";

const villageCottageYard: PrefabDefinition = {
  id: "village-cottage-yard",
  label: "Cottage & Yard",
  category: "Village",
  width: 7,
  height: 6,
  tags: ["village", "home", "yard"],
  overlapPolicy: "reject",
  terrain: [
    { terrainId: "grass", x: 0, y: 0, width: 7, height: 6 },
    { terrainId: "path", x: 0, y: 4, width: 7, height: 2 },
  ],
  props: [
    { catalogId: "house-blue", x: 2, y: 1 },
    { catalogId: "tree-round", x: 0, y: 0 },
    { catalogId: "flowers", x: 1, y: 3 },
    { catalogId: "flowers", x: 5, y: 3 },
    { catalogId: "barrels", x: 5, y: 1 },
  ],
  networks: [
    {
      catalogId: "fence",
      points: [
        { x: 0, y: 3 },
        { x: 0, y: 5 },
      ],
    },
    {
      catalogId: "fence",
      points: [
        { x: 6, y: 3 },
        { x: 6, y: 5 },
      ],
    },
  ],
  actors: [{ catalogId: "villager-f", x: 4, y: 4, facing: "west" }],
};

const castleGuardRoom: PrefabDefinition = {
  id: "castle-guard-room",
  label: "Castle Guard Room",
  category: "Castle",
  width: 8,
  height: 6,
  tags: ["castle", "room", "guards"],
  overlapPolicy: "reject",
  terrain: [{ terrainId: "stone-floor", x: 0, y: 0, width: 8, height: 6 }],
  props: [
    { catalogId: "weapon-rack", x: 1, y: 1 },
    { catalogId: "barrels", x: 6, y: 1 },
    { catalogId: "table", x: 2, y: 3 },
    { catalogId: "torch", x: 1, y: 4 },
    { catalogId: "torch", x: 6, y: 4 },
  ],
  networks: [
    {
      catalogId: "castle-wall",
      points: [
        { x: 0, y: 0 },
        { x: 7, y: 0 },
        { x: 7, y: 5 },
        { x: 0, y: 5 },
        { x: 0, y: 0 },
      ],
    },
  ],
  actors: [
    { catalogId: "guard", x: 2, y: 2, facing: "south" },
    { catalogId: "guard", x: 5, y: 2, facing: "south" },
  ],
};

const riversideCrossing: PrefabDefinition = {
  id: "riverside-crossing",
  label: "Riverside Crossing",
  category: "World",
  width: 9,
  height: 7,
  tags: ["river", "bridge", "path"],
  overlapPolicy: "reject",
  terrain: [
    { terrainId: "grass", x: 0, y: 0, width: 9, height: 7 },
    { terrainId: "water", x: 3, y: 0, width: 3, height: 7 },
    { terrainId: "path", x: 0, y: 3, width: 9, height: 1 },
  ],
  props: [
    { catalogId: "tree-round", x: 0, y: 0 },
    { catalogId: "tree-pine", x: 8, y: 4 },
    { catalogId: "flowers", x: 1, y: 2 },
    { catalogId: "flowers", x: 7, y: 4 },
  ],
  networks: [
    {
      catalogId: "bridge",
      points: [
        { x: 3, y: 3 },
        { x: 5, y: 3 },
      ],
    },
  ],
  actors: [],
};

export const prefabs = [
  villageCottageYard,
  castleGuardRoom,
  riversideCrossing,
] as const satisfies readonly PrefabDefinition[];

const byId = new Map(prefabs.map((prefab) => [prefab.id, prefab]));

export const prefabCatalog: IPrefabCatalog = {
  all: prefabs,
  get: (id) => byId.get(id),
  byCategory: (category) => prefabs.filter((prefab) => prefab.category === category),
};
