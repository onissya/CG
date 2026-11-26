import { describe, expect, it } from "vitest";
import { bresenhamCircle, bresenhamLine, ddaLine, stepByStepLine } from "./algorithms";

const input = { start: { x: -4, y: -2 }, end: { x: 5, y: 3 } };

describe("растровые алгоритмы отрезка", () => {
  it("пошаговый алгоритм включает обе конечные точки", () => {
    const result = stepByStepLine(input);
    expect(result.points[0]).toEqual(input.start);
    expect(result.points.at(-1)).toEqual(input.end);
    expect(result.points.length).toBe(10);
  });

  it("пошаговый алгоритм сохраняет знак при обратном направлении", () => {
    const result = stepByStepLine({ start: { x: 5, y: 3 }, end: { x: -4, y: -2 } });
    expect(result.points[0]).toEqual({ x: 5, y: 3 });
    expect(result.points.at(-1)).toEqual({ x: -4, y: -2 });
  });

  it("ЦДА включает обе конечные точки", () => {
    const result = ddaLine(input);
    expect(result.points[0]).toEqual(input.start);
    expect(result.points.at(-1)).toEqual(input.end);
    expect(result.points.length).toBe(10);
  });

  it("Брезенхем строит целочисленный путь от начала до конца", () => {
    const result = bresenhamLine(input);
    expect(result.points[0]).toEqual(input.start);
    expect(result.points.at(-1)).toEqual(input.end);
    expect(result.points.every((point) => Number.isInteger(point.x) && Number.isInteger(point.y))).toBe(true);
  });
});

describe("Брезенхем для окружности", () => {
  it("строит восемь крайних точек окружности радиуса 3", () => {
    const result = bresenhamCircle({ center: { x: 0, y: 0 }, radius: 3 });
    expect(result.points).toEqual(expect.arrayContaining([
      { x: 3, y: 0 }, { x: -3, y: 0 }, { x: 0, y: 3 }, { x: 0, y: -3 },
    ]));
    expect(result.points.length).toBeGreaterThan(8);
  });
});
