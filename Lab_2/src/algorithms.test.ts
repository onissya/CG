import { describe, expect, it } from "vitest";
import {
  applyLowPassFilter,
  applyMorphology,
  calculateMetrics,
} from "./algorithms";
import type { ImageMatrix } from "./types";

function grayscale(width: number, values: number[]): ImageMatrix {
  const data = new Uint8ClampedArray(width * (values.length / width) * 4);
  values.forEach((value, pixel) => {
    data[pixel * 4] = value;
    data[pixel * 4 + 1] = value;
    data[pixel * 4 + 2] = value;
    data[pixel * 4 + 3] = 255;
  });
  return { width, height: values.length / width, data };
}

describe("низкочастотные фильтры", () => {
  it("средний фильтр сглаживает яркий пиксель", () => {
    const image = grayscale(3, [0, 0, 0, 0, 255, 0, 0, 0, 0]);
    const result = applyLowPassFilter(image, { kind: "mean", windowSize: 3 });
    expect(result.data[(1 * 3 + 1) * 4]).toBe(28);
  });

  it("гауссов фильтр сохраняет однородное изображение", () => {
    const image = grayscale(2, [80, 80, 80, 80]);
    const result = applyLowPassFilter(image, { kind: "gaussian", windowSize: 3, sigma: 1 });
    expect([...result.data]).toEqual([...image.data]);
  });
});

describe("морфологическая обработка", () => {
  it("эрозия удаляет одиночный светлый пиксель", () => {
    const image = grayscale(3, [0, 0, 0, 0, 255, 0, 0, 0, 0]);
    const result = applyMorphology(image, { kind: "erosion", windowSize: 3 });
    expect(result.data[(1 * 3 + 1) * 4]).toBe(0);
  });

  it("дилатация расширяет светлую область", () => {
    const image = grayscale(3, [0, 0, 0, 0, 255, 0, 0, 0, 0]);
    const result = applyMorphology(image, { kind: "dilation", windowSize: 3 });
    expect(result.data[0]).toBe(255);
    expect(result.data[(1 * 3 + 1) * 4]).toBe(255);
  });

  it("открытие удаляет одиночный светлый пиксель", () => {
    const image = grayscale(3, [0, 0, 0, 0, 255, 0, 0, 0, 0]);
    const result = applyMorphology(image, { kind: "opening", windowSize: 3 });
    expect(result.data[(1 * 3 + 1) * 4]).toBe(0);
  });

  it("закрытие заполняет одиночное тёмное отверстие", () => {
    const image = grayscale(3, [255, 255, 255, 255, 0, 255, 255, 255, 255]);
    const result = applyMorphology(image, { kind: "closing", windowSize: 3 });
    expect(result.data[(1 * 3 + 1) * 4]).toBe(255);
  });
});

describe("метрики", () => {
  it("считает диапазон яркости", () => {
    const metrics = calculateMetrics(grayscale(2, [10, 20]));
    expect(Math.round(metrics.min)).toBe(10);
    expect(Math.round(metrics.max)).toBe(20);
    expect(metrics.standardDeviation).toBeGreaterThan(0);
  });
});
