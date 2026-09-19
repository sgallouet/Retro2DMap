/**
 * Palette sampled directly from Reference Map 01 target screenshot.
 *
 * Keep procedural geometry independent from final art, but force every
 * provisional asset through these colors so the whole map shares the target's
 * color language while authored sprites are still being produced.
 */
export const REFERENCE_TARGET_PALETTE = [
  // Semantic samples taken from clean target-image regions.
  "#80C42F", "#599E2B", "#2F792C", "#0E4527",
  "#EDCA61", "#F4DC73", "#A58D35",
  "#949392", "#C6C2BB", "#65625C", "#363828",
  "#9B6C32", "#BB8848", "#6E491E", "#392610",
  "#366CD6", "#5793F5", "#1C48A8", "#0C2A75",
  "#E76735", "#A53012", "#602B11",
  "#B22022", "#F1A346", "#DE9136",
  "#8E7520", "#C8A736", "#4E3F11", "#B3A376",
  "#78BE22", "#7B7B7B", "#0168CF", "#97999B", "#C4BFBB", "#3B3939",
  "#024B2B", "#8BC731", "#A87F45", "#639A1E", "#614221", "#BCB9B5",
  "#5B5B5D", "#014E9C", "#C48743", "#0D79DC", "#726E6B", "#8B6230",
  "#87BD2A", "#4C4A4A", "#B81F25", "#6BB231", "#A3A29C", "#656666",
  "#F3CF63", "#4C2A12", "#29671D", "#E8BD5A", "#AB6831", "#39902C",
  "#ACB2A0", "#795B30", "#E5E5DF", "#053523", "#29180C", "#333220",
  "#ECC75E", "#322619", "#51391F", "#555149", "#94D53E", "#2F7937",
  "#82471F", "#071619", "#F4DC73", "#238EC7", "#8D8371", "#0A2528",
  "#D2C7B4", "#234F1F", "#72C33D", "#939474", "#CEB56D", "#8C2015",
  "#116ACE", "#123659", "#4D4533", "#BEA475", "#585D3F", "#214B70",
  "#6F794D", "#E1D0A7", "#6A9955", "#17665A",
] as const;

interface ParsedColor {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

const targetRgb = REFERENCE_TARGET_PALETTE.map((hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
});

const cache = new Map<string, string>();

const clampByte = (value: number): number =>
  Math.max(0, Math.min(255, Math.round(value)));

const parseHex = (value: string): ParsedColor | undefined => {
  const raw = value.slice(1);
  if (raw.length === 3) {
    return {
      r: Number.parseInt(raw[0]! + raw[0]!, 16),
      g: Number.parseInt(raw[1]! + raw[1]!, 16),
      b: Number.parseInt(raw[2]! + raw[2]!, 16),
      alpha: 1,
    };
  }

  if (raw.length === 6) {
    return {
      r: Number.parseInt(raw.slice(0, 2), 16),
      g: Number.parseInt(raw.slice(2, 4), 16),
      b: Number.parseInt(raw.slice(4, 6), 16),
      alpha: 1,
    };
  }

  return undefined;
};

const parseRgb = (value: string): ParsedColor | undefined => {
  const match = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  );
  if (!match) return undefined;

  return {
    r: clampByte(Number(match[1])),
    g: clampByte(Number(match[2])),
    b: clampByte(Number(match[3])),
    alpha: match[4] === undefined
      ? 1
      : Math.max(0, Math.min(1, Number(match[4]))),
  };
};

const parseColor = (value: string): ParsedColor | undefined => {
  const normalized = value.trim();
  if (normalized.startsWith("#")) return parseHex(normalized);
  if (/^rgba?\(/i.test(normalized)) return parseRgb(normalized);
  return undefined;
};

const nearestReferenceRgb = (
  source: ParsedColor,
): Readonly<{ r: number; g: number; b: number }> => {
  let best = targetRgb[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of targetRgb) {
    // Slightly favor luminance agreement so pale stone does not jump to a
    // saturated color merely because raw RGB distance happens to be similar.
    const dr = source.r - candidate.r;
    const dg = source.g - candidate.g;
    const db = source.b - candidate.b;
    const sourceLuma = source.r * 0.2126 + source.g * 0.7152 + source.b * 0.0722;
    const targetLuma =
      candidate.r * 0.2126 + candidate.g * 0.7152 + candidate.b * 0.0722;
    const dl = sourceLuma - targetLuma;
    const distance = dr * dr + dg * dg + db * db + dl * dl * 0.35;

    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best;
};

const toHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map((value) => clampByte(value).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

/**
 * Snaps any procedural RGB/RGBA color to the nearest color sampled from the
 * target screenshot. Alpha is preserved, so shadows/highlights keep their
 * intended strength while their hue belongs to the reference palette.
 */
export const referenceColor = (value: string): string => {
  const cached = cache.get(value);
  if (cached) return cached;

  const parsed = parseColor(value);
  if (!parsed) return value;

  const nearest = nearestReferenceRgb(parsed);
  const mapped =
    parsed.alpha >= 0.999
      ? toHex(nearest.r, nearest.g, nearest.b)
      : `rgba(${nearest.r},${nearest.g},${nearest.b},${parsed.alpha})`;

  cache.set(value, mapped);
  return mapped;
};
