import { describe, expect, it } from "vitest";
import { worldCatalog } from "../domain/catalog";
import { MapValidator } from "../domain/validation";
import { createSampleKingdom } from "./sampleKingdom";

describe("Reference Map 01", () => {
  it("contains the landmark composition from the supplied target", () => {
    const map = createSampleKingdom();

    expect(map.width).toBe(40);
    expect(map.height).toBe(30);

    expect(map.props.some((prop) => prop.catalogId === "waterfall")).toBe(true);
    expect(map.props.some((prop) => prop.catalogId === "castle-gate")).toBe(true);
    expect(
      map.props.filter((prop) => prop.catalogId === "castle-tower").length,
    ).toBeGreaterThanOrEqual(6);
    expect(map.props.some((prop) => prop.catalogId === "fountain")).toBe(true);
    expect(map.props.some((prop) => prop.catalogId === "dock")).toBe(true);
    expect(map.props.some((prop) => prop.catalogId === "boat")).toBe(true);
    expect(map.props.filter((prop) => prop.catalogId === "sheep").length).toBeGreaterThanOrEqual(2);
    expect(map.actors.some((actor) => actor.catalogId === "king")).toBe(true);
  });

  it("does not contain semantic validation errors", () => {
    const errors = new MapValidator(worldCatalog)
      .validate(createSampleKingdom())
      .filter((issue) => issue.severity === "error");

    expect(errors).toEqual([]);
  });
});
