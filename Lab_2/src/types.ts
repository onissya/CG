export interface ImageMatrix {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export type SmoothingKind = "mean" | "gaussian";

export interface SmoothingOptions {
  kind: SmoothingKind;
  windowSize: 3 | 5;
  sigma?: number;
}

export type MorphologyKind = "erosion" | "dilation" | "opening" | "closing";

export interface MorphologyOptions {
  kind: MorphologyKind;
  windowSize: 3 | 5;
}

export interface ImageMetrics {
  mean: number;
  standardDeviation: number;
  min: number;
  max: number;
}
