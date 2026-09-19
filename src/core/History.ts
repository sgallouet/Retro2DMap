export interface IHistory<T> {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  checkpoint(value: T): void;
  undo(current: T): T | undefined;
  redo(current: T): T | undefined;
  clear(): void;
}

export class History<T> implements IHistory<T> {
  readonly #undo: T[] = [];
  readonly #redo: T[] = [];

  constructor(
    private readonly clone: (value: T) => T,
    private readonly limit = 100,
  ) {}

  get canUndo(): boolean {
    return this.#undo.length > 0;
  }

  get canRedo(): boolean {
    return this.#redo.length > 0;
  }

  checkpoint(value: T): void {
    this.#undo.push(this.clone(value));
    if (this.#undo.length > this.limit) this.#undo.shift();
    this.#redo.length = 0;
  }

  undo(current: T): T | undefined {
    const previous = this.#undo.pop();
    if (!previous) return undefined;
    this.#redo.push(this.clone(current));
    return this.clone(previous);
  }

  redo(current: T): T | undefined {
    const next = this.#redo.pop();
    if (!next) return undefined;
    this.#undo.push(this.clone(current));
    return this.clone(next);
  }

  clear(): void {
    this.#undo.length = 0;
    this.#redo.length = 0;
  }
}
