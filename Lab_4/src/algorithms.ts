import type { ClipWindow, ClippedSegment, Point, Polygon, Segment } from "./types";

const EPSILON = 1e-9;

export function normalizeWindow(window: ClipWindow): ClipWindow {
  return {
    xmin: Math.min(window.xmin, window.xmax),
    ymin: Math.min(window.ymin, window.ymax),
    xmax: Math.max(window.xmin, window.xmax),
    ymax: Math.max(window.ymin, window.ymax),
  };
}

function pointOnSegment(segment: Segment, parameter: number): Point {
  return {
    x: segment.start.x + parameter * (segment.end.x - segment.start.x),
    y: segment.start.y + parameter * (segment.end.y - segment.start.y),
  };
}

/** Отсечение отрезка прямоугольным окном алгоритмом Лианга–Барски. */
export function clipSegmentLiangBarsky(
  segment: Segment,
  rawWindow: ClipWindow,
): ClippedSegment | null {
  const window = normalizeWindow(rawWindow);
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const p = [-dx, dx, -dy, dy];
  const q = [
    segment.start.x - window.xmin,
    window.xmax - segment.start.x,
    segment.start.y - window.ymin,
    window.ymax - segment.start.y,
  ];

  let tEnter = 0;
  let tLeave = 1;

  for (let index = 0; index < p.length; index += 1) {
    if (Math.abs(p[index]) < EPSILON) {
      if (q[index] < -EPSILON) return null;
      continue;
    }

    const parameter = q[index] / p[index];
    if (p[index] < 0) {
      tEnter = Math.max(tEnter, parameter);
    } else {
      tLeave = Math.min(tLeave, parameter);
    }

    if (tEnter - tLeave > EPSILON) return null;
  }

  return {
    start: pointOnSegment(segment, tEnter),
    end: pointOnSegment(segment, tLeave),
    tEnter,
    tLeave,
  };
}

type Boundary = "left" | "right" | "bottom" | "top";

function isInside(point: Point, window: ClipWindow, boundary: Boundary): boolean {
  if (boundary === "left") return point.x >= window.xmin - EPSILON;
  if (boundary === "right") return point.x <= window.xmax + EPSILON;
  if (boundary === "bottom") return point.y >= window.ymin - EPSILON;
  return point.y <= window.ymax + EPSILON;
}

function intersection(start: Point, end: Point, window: ClipWindow, boundary: Boundary): Point {
  if (boundary === "left" || boundary === "right") {
    const x = boundary === "left" ? window.xmin : window.xmax;
    const denominator = end.x - start.x;
    if (Math.abs(denominator) < EPSILON) return { x, y: start.y };
    const t = (x - start.x) / denominator;
    return { x, y: start.y + t * (end.y - start.y) };
  }

  const y = boundary === "bottom" ? window.ymin : window.ymax;
  const denominator = end.y - start.y;
  if (Math.abs(denominator) < EPSILON) return { x: start.x, y };
  const t = (y - start.y) / denominator;
  return { x: start.x + t * (end.x - start.x), y };
}

function samePoint(first: Point, second: Point): boolean {
  return Math.abs(first.x - second.x) < EPSILON && Math.abs(first.y - second.y) < EPSILON;
}

function removeAdjacentDuplicates(points: Polygon): Polygon {
  const result: Polygon = [];
  points.forEach((point) => {
    if (!result.length || !samePoint(result[result.length - 1], point)) result.push(point);
  });
  if (result.length > 1 && samePoint(result[0], result[result.length - 1])) result.pop();
  return result;
}

/** Отсечение выпуклого многоугольника прямоугольным окном. */
export function clipConvexPolygonSutherlandHodgman(
  polygon: Polygon,
  rawWindow: ClipWindow,
): Polygon {
  const window = normalizeWindow(rawWindow);
  const boundaries: Boundary[] = ["left", "right", "bottom", "top"];
  let output = polygon.slice();

  for (const boundary of boundaries) {
    if (!output.length) break;
    const input = output;
    output = [];
    let start = input[input.length - 1];
    let startInside = isInside(start, window, boundary);

    for (const end of input) {
      const endInside = isInside(end, window, boundary);
      if (endInside) {
        if (!startInside) output.push(intersection(start, end, window, boundary));
        output.push(end);
      } else if (startInside) {
        output.push(intersection(start, end, window, boundary));
      }
      start = end;
      startInside = endInside;
    }
    output = removeAdjacentDuplicates(output);
  }

  return output;
}
