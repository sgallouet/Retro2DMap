import type { MapDocument } from "../domain/map";
import { validateMapDocument } from "../domain/map";

export interface IMapStore {
  save(document: MapDocument): Promise<void>;
  load(id: string): Promise<MapDocument | null>;
}

export class LocalStorageMapStore implements IMapStore {
  constructor(private readonly namespace = "retro2dmap") {}

  async save(document: MapDocument): Promise<void> {
    localStorage.setItem(this.key(document.id), JSON.stringify(document));
  }

  async load(id: string): Promise<MapDocument | null> {
    const raw = localStorage.getItem(this.key(id));
    return raw ? validateMapDocument(JSON.parse(raw) as unknown) : null;
  }

  private key(id: string): string {
    return `${this.namespace}:${id}`;
  }
}
