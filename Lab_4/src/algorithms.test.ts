import { describe, expect, it } from "vitest";
import {
  clipConvexPolygonSutherlandHodgman,
  clipSegmentLiangBarsky,
  normalizeWindow,
} from "./algorithms";
import type { ClipWindow, Point } from "./types";

const window: ClipWindow = { xmin: -5, ymin: -5, xmax: 5, ymax: 5 };

function expectPoint(actual: Point, expected: Point): void {
  expect(actual.x).toBeCloseTo(expected.x, 8);
  expect(actual.y).toBeCloseTo(expected.y, 8);
}

describe("алгоритм Лианга–Барски", () => {
  it("оставляет полностью видимый отрезок без изменений", () => {
    const result = clipSegmentLiangBarsky({ start: { x: -2, y: 1 }, end: { x: 4, y: 3 } }, window);
    expect(result).not.toBeNull();
    expectPoint(result!.start, { x: -2, y: 1 });
    expectPoint(result!.end, { x: 4, y: 3 });
  });

  it("находит видимую часть пересекающего отрезка", () => {
    const result = clipSegmentLiangBarsky({ start: { x: -10, y: 0 }, end: { x: 10, y: 0 } }, window);
    expect(result).not.toBeNull();
    expectPoint(result!.start, { x: -5, y: 0 });
    expectPoint(result!.end, { x: 5, y: 0 });
    expect(result!.tEnter).toBeCloseTo(0.25);
    expect(result!.tLeave).toBeCloseTo(0.75);
  });

  it("отбрасывает полностью невидимый, вертикальный и вырожденный отрезки", () => {
    expect(clipSegmentLiangBarsky({ start: { x: -8, y: 0 }, end: { x: -6, y: 4 } }, window)).toBeNull();
    const vertical = clipSegmentLiangBarsky({ start: { x: 2, y: -10 }, end: { x: 2, y: 10 } }, window);
    expect(vertical).not.toBeNull();
    expectPoint(vertical!.start, { x: 2, y: -5 });
    expectPoint(vertical!.end, { x: 2, y: 5 });
    const point = clipSegmentLiangBarsky({ start: { x: 1, y: 1 }, end: { x: 1, y: 1 } }, window);
    expect(point).not.toBeNull();
    expectPoint(point!.start, { x: 1, y: 1 });
    expect(clipSegmentLiangBarsky({ start: { x: 8, y: 8 }, end: { x: 8, y: 8 } }, window)).toBeNull();
  });

  it("нормализует границы окна", () => {
    expect(normalizeWindow({ xmin: 5, ymin: 4, xmax: -5, ymax: -4 })).toEqual({
      xmin: -5,
      ymin: -4,
      xmax: 5,
      ymax: 4,
    });
  });
});

describe("алгоритм Сазерленда–Ходжмана", () => {
  it("оставляет квадрат, пересекающий окно, ровно по границам окна", () => {
    const result = clipConvexPolygonSutherlandHodgman(
      [
        { x: -10, y: -10 },
        { x: 10, y: -10 },
        { x: 10, y: 10 },
        { x: -10, y: 10 },
      ],
      window,
    );
    expect(result).toHaveLength(4);
    const expected = [
      { x: -5, y: -5 },
      { x: 5, y: -5 },
      { x: 5, y: 5 },
      { x: -5, y: 5 },
    ];
    expected.forEach((point) => {
      expect(result.some((actual) => Math.abs(actual.x - point.x) < 1e-8 && Math.abs(actual.y - point.y) < 1e-8)).toBe(true);
    });
  });

  it("возвращает исходный многоугольник, если он внутри окна", () => {
    const polygon = [{ x: -2, y: -1 }, { x: 2, y: -1 }, { x: 0, y: 3 }];
    expect(clipConvexPolygonSutherlandHodgman(polygon, window)).toEqual(polygon);
  });

  it("возвращает пустой результат для многоугольника вне окна", () => {
    expect(clipConvexPolygonSutherlandHodgman([
      { x: 8, y: 8 },
      { x: 10, y: 8 },
      { x: 9, y: 10 },
    ], window)).toEqual([]);
  });
});
