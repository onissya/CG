export type RGB = { r: number; g: number; b: number };
export type CMYK = { c: number; m: number; y: number; k: number };
export type HSV = { h: number; s: number; v: number };
export type HLS = { h: number; l: number; s: number };

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeHue = (hue: number): number => ((hue % 360) + 360) % 360;

export const round = (value: number, precision = 1): number => {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const normalizeRgb = ({ r, g, b }: RGB): RGB => ({
  r: Math.round(clamp(r, 0, 255)),
  g: Math.round(clamp(g, 0, 255)),
  b: Math.round(clamp(b, 0, 255)),
});

export function rgbToHex(rgb: RGB): string {
  const { r, g, b } = normalizeRgb(rgb);
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function hexToRgb(value: string): RGB | null {
  const normalized = value.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

export function rgbToCmyk(rgb: RGB): CMYK {
  const { r, g, b } = normalizeRgb(rgb);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const black = 1 - Math.max(red, green, blue);

  if (black >= 1) return { c: 0, m: 0, y: 0, k: 100 };

  return {
    c: ((1 - red - black) / (1 - black)) * 100,
    m: ((1 - green - black) / (1 - black)) * 100,
    y: ((1 - blue - black) / (1 - black)) * 100,
    k: black * 100,
  };
}

export function cmykToRgb({ c, m, y, k }: CMYK): RGB {
  const cyan = clamp(c, 0, 100) / 100;
  const magenta = clamp(m, 0, 100) / 100;
  const yellow = clamp(y, 0, 100) / 100;
  const black = clamp(k, 0, 100) / 100;

  return normalizeRgb({
    r: 255 * (1 - cyan) * (1 - black),
    g: 255 * (1 - magenta) * (1 - black),
    b: 255 * (1 - yellow) * (1 - black),
  });
}

function rgbToHue(red: number, green: number, blue: number, delta: number, max: number): number {
  if (delta === 0) return 0;
  if (max === red) return 60 * (((green - blue) / delta) % 6);
  if (max === green) return 60 * ((blue - red) / delta + 2);
  return 60 * ((red - green) / delta + 4);
}

export function rgbToHsv(rgb: RGB): HSV {
  const { r, g, b } = normalizeRgb(rgb);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  return {
    h: normalizeHue(rgbToHue(red, green, blue, delta, max)),
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100,
  };
}

function hueToRgb(hue: number, saturation: number, lightComponent: number): RGB {
  const sector = normalizeHue(hue) / 60;
  const x = saturation * (1 - Math.abs((sector % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (sector < 1) [red, green] = [saturation, x];
  else if (sector < 2) [red, green] = [x, saturation];
  else if (sector < 3) [green, blue] = [saturation, x];
  else if (sector < 4) [green, blue] = [x, saturation];
  else if (sector < 5) [red, blue] = [x, saturation];
  else [red, blue] = [saturation, x];

  return normalizeRgb({
    r: (red + lightComponent) * 255,
    g: (green + lightComponent) * 255,
    b: (blue + lightComponent) * 255,
  });
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const saturation = clamp(s, 0, 100) / 100;
  const value = clamp(v, 0, 100) / 100;
  const chroma = value * saturation;
  return hueToRgb(h, chroma, value - chroma);
}

export function rgbToHls(rgb: RGB): HLS {
  const { r, g, b } = normalizeRgb(rgb);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  return {
    h: normalizeHue(rgbToHue(red, green, blue, delta, max)),
    l: lightness * 100,
    s: delta === 0 ? 0 : (delta / (1 - Math.abs(2 * lightness - 1))) * 100,
  };
}

export function hlsToRgb({ h, l, s }: HLS): RGB {
  const lightness = clamp(l, 0, 100) / 100;
  const saturation = clamp(s, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  return hueToRgb(h, chroma, lightness - chroma / 2);
}
