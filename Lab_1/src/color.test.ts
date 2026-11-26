import { describe, expect, it } from "vitest";
import {
  cmykToRgb,
  hexToRgb,
  hlsToRgb,
  rgbToCmyk,
  rgbToHex,
  rgbToHls,
  type RGB,
} from "./color";

const samples: RGB[] = [
  { r: 0, g: 0, b: 0 },
  { r: 255, g: 255, b: 255 },
  { r: 255, g: 0, b: 0 },
  { r: 33, g: 150, b: 243 },
  { r: 103, g: 80, b: 164 },
];

function expectRgbClose(actual: RGB, expected: RGB): void {
  expect(actual.r).toBeCloseTo(expected.r, 0);
  expect(actual.g).toBeCloseTo(expected.g, 0);
  expect(actual.b).toBeCloseTo(expected.b, 0);
}

describe("цветовые преобразования", () => {
  it("преобразует RGB в HEX и обратно", () => {
    expect(rgbToHex({ r: 103, g: 80, b: 164 })).toBe("#6750A4");
    expect(hexToRgb("#6750A4")).toEqual({ r: 103, g: 80, b: 164 });
    expect(hexToRgb("#abc")).toEqual({ r: 170, g: 187, b: 204 });
  });

  it("сохраняет цвет после цикла RGB → CMYK → RGB", () => {
    samples.forEach((sample) => expectRgbClose(cmykToRgb(rgbToCmyk(sample)), sample));
  });

  it("сохраняет цвет после цикла RGB → HLS → RGB", () => {
    samples.forEach((sample) => expectRgbClose(hlsToRgb(rgbToHls(sample)), sample));
  });

  it("обрабатывает контрольные значения", () => {
    expect(rgbToCmyk({ r: 0, g: 0, b: 0 })).toEqual({ c: 0, m: 0, y: 0, k: 100 });
    expect(hlsToRgb({ h: 240, l: 50, s: 100 })).toEqual({ r: 0, g: 0, b: 255 });
  });
});
