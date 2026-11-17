export interface Point {
  x: number;
  y: number;
}

export type AlgorithmKind = "step" | "dda" | "bresenham" | "circle";
export type DrawMode = "line" | "circle";

export interface RasterResult {
  points: Point[];
  iterations: number;
  calculations: string[];
}

export interface LineInput {
  start: Point;
  end: Point;
}

export interface CircleInput {
  center: Point;
  radius: number;
}
