import type { GridCoord } from "./map";
import type { NavigationGrid } from "./navigation";

export interface PathResult {
  found: boolean;
  path: readonly GridCoord[];
  cost: number;
  visited: number;
}

export interface IGridPathfinder {
  findPath(grid: NavigationGrid, start: GridCoord, goal: GridCoord): PathResult;
}

/**
 * Deterministic four-direction A* over the derived semantic navigation grid.
 * Navigation is not persisted; this consumes the projection produced by
 * NavigationGridBuilder.
 */
export class GridPathfinder implements IGridPathfinder {
  findPath(grid: NavigationGrid, start: GridCoord, goal: GridCoord): PathResult {
    const startIndex = this.indexOf(grid, start);
    const goalIndex = this.indexOf(grid, goal);
    if (startIndex === null || goalIndex === null) return this.notFound();

    const startCell = grid.at(start);
    const goalCell = grid.at(goal);
    if (!startCell?.walkable || !goalCell?.walkable) return this.notFound();

    if (startIndex === goalIndex) {
      return { found: true, path: [{ ...start }], cost: 0, visited: 1 };
    }

    const count = grid.width * grid.height;
    const gScore = Array.from({ length: count }, () => Number.POSITIVE_INFINITY);
    const cameFrom = Array.from({ length: count }, () => -1);
    const closed = Array.from({ length: count }, () => false);
    const open: Array<{ index: number; f: number; order: number }> = [];
    let order = 0;
    let visited = 0;

    gScore[startIndex] = 0;
    open.push({
      index: startIndex,
      f: this.heuristic(start, goal),
      order: order++,
    });

    while (open.length > 0) {
      let best = 0;
      for (let i = 1; i < open.length; i += 1) {
        const candidate = open[i];
        const current = open[best];
        if (!candidate || !current) continue;
        if (
          candidate.f < current.f ||
          (candidate.f === current.f && candidate.order < current.order)
        ) {
          best = i;
        }
      }

      const [node] = open.splice(best, 1);
      if (!node || closed[node.index]) continue;
      closed[node.index] = true;
      visited += 1;

      if (node.index === goalIndex) {
        const path = this.reconstruct(grid, cameFrom, goalIndex);
        return {
          found: true,
          path,
          cost: gScore[goalIndex] ?? Number.POSITIVE_INFINITY,
          visited,
        };
      }

      const coord = this.coordOf(grid, node.index);
      for (const neighbor of this.neighbors(grid, coord)) {
        const neighborIndex = this.indexOf(grid, neighbor);
        if (neighborIndex === null || closed[neighborIndex]) continue;

        const cell = grid.at(neighbor);
        if (!cell?.walkable) continue;

        const tentative = (gScore[node.index] ?? Number.POSITIVE_INFINITY) + cell.movementCost;
        if (tentative >= (gScore[neighborIndex] ?? Number.POSITIVE_INFINITY)) continue;

        cameFrom[neighborIndex] = node.index;
        gScore[neighborIndex] = tentative;
        open.push({
          index: neighborIndex,
          f: tentative + this.heuristic(neighbor, goal),
          order: order++,
        });
      }
    }

    return { ...this.notFound(), visited };
  }

  private neighbors(grid: NavigationGrid, coord: GridCoord): GridCoord[] {
    const candidates = [
      { x: coord.x, y: coord.y - 1 },
      { x: coord.x + 1, y: coord.y },
      { x: coord.x, y: coord.y + 1 },
      { x: coord.x - 1, y: coord.y },
    ];

    return candidates.filter(
      (candidate) =>
        candidate.x >= 0 &&
        candidate.y >= 0 &&
        candidate.x < grid.width &&
        candidate.y < grid.height,
    );
  }

  private reconstruct(
    grid: NavigationGrid,
    cameFrom: readonly number[],
    goalIndex: number,
  ): GridCoord[] {
    const indices = [goalIndex];
    let current = goalIndex;

    while ((cameFrom[current] ?? -1) >= 0) {
      current = cameFrom[current] ?? -1;
      indices.push(current);
    }

    indices.reverse();
    return indices.map((index) => this.coordOf(grid, index));
  }

  private indexOf(grid: NavigationGrid, coord: GridCoord): number | null {
    if (
      coord.x < 0 ||
      coord.y < 0 ||
      coord.x >= grid.width ||
      coord.y >= grid.height
    ) {
      return null;
    }
    return coord.y * grid.width + coord.x;
  }

  private coordOf(grid: NavigationGrid, index: number): GridCoord {
    return {
      x: index % grid.width,
      y: Math.floor(index / grid.width),
    };
  }

  private heuristic(a: GridCoord, b: GridCoord): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private notFound(): PathResult {
    return {
      found: false,
      path: [],
      cost: Number.POSITIVE_INFINITY,
      visited: 0,
    };
  }
}
