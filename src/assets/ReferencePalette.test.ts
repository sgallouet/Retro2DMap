import { describe, expect, it } from "vitest";
import {
  REFERENCE_TARGET_PALETTE,
  referenceColor,
} from "./ReferencePalette";

describe("ReferencePalette", () => {
  it("snaps arbitrary procedural colors to colors sampled from the target", () => {
    const mapped = referenceColor("#6f9f59");
    expect(REFERENCE_TARGET_PALETTE).toContain(mapped);
  });

  it("preserves alpha while snapping rgba colors", () => {
    expect(referenceColor("rgba(38,42,41,.34)")).toMatch(
      /^rgba\(\d+,\d+,\d+,0\.34\)$/,
    );
  });

  it("keeps unsupported CSS values unchanged", () => {
    expect(referenceColor("transparent")).toBe("transparent");
  });
});
