export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  start: Point;
  end: Point;
}

export interface ClipWindow {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export type Polygon = Point[];

export interface ClippedSegment extends Segment {
  tEnter: number;
  tLeave: number;
}
