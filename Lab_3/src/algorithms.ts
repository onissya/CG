import type { CircleInput, LineInput, Point, RasterResult } from "./types";

function pushUnique(points: Point[], point: Point): void {
  if (!points.some((item) => item.x === point.x && item.y === point.y)) points.push(point);
}

function rounded(value: number): number {
  return Math.round(value);
}

/** Пошаговый алгоритм: основной шаг делается по доминирующей координате. */
export function stepByStepLine({ start, end }: LineInput): RasterResult {
  const points: Point[] = [];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const calculations = [`Δx = ${dx}, Δy = ${dy}`];

  if (absDx >= absDy) {
    const direction = dx >= 0 ? 1 : -1;
    const slope = absDx === 0 ? 0 : dy / absDx;
    calculations.push(`Основной шаг по X, m = Δy / |Δx| = ${slope.toFixed(3)}`);
    for (let step = 0; step <= absDx; step += 1) {
      const x = start.x + step * direction;
      const y = rounded(start.y + step * slope);
      points.push({ x, y });
    }
  } else {
    const direction = dy >= 0 ? 1 : -1;
    const slope = absDy === 0 ? 0 : dx / absDy;
    calculations.push(`Основной шаг по Y, m = Δx / |Δy| = ${slope.toFixed(3)}`);
    for (let step = 0; step <= absDy; step += 1) {
      const y = start.y + step * direction;
      const x = rounded(start.x + step * slope);
      points.push({ x, y });
    }
  }

  calculations.push(`Число итераций: ${Math.max(absDx, absDy)}`);
  return { points, iterations: Math.max(absDx, absDy), calculations };
}

/** Цифровой дифференциальный анализатор. */
export function ddaLine({ start, end }: LineInput): RasterResult {
  const points: Point[] = [];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const xIncrement = steps === 0 ? 0 : dx / steps;
  const yIncrement = steps === 0 ? 0 : dy / steps;
  let x = start.x;
  let y = start.y;

  for (let index = 0; index <= steps; index += 1) {
    pushUnique(points, { x: rounded(x), y: rounded(y) });
    x += xIncrement;
    y += yIncrement;
  }

  return {
    points,
    iterations: steps,
    calculations: [
      `Δx = ${dx}, Δy = ${dy}, N = max(|Δx|, |Δy|) = ${steps}`,
      `dxш = Δx / N = ${xIncrement.toFixed(3)}, dyш = Δy / N = ${yIncrement.toFixed(3)}`,
      `На каждом шаге: x := x + dxш, y := y + dyш; в клетку попадает round(x), round(y)`,
    ],
  };
}

/** Целочисленный алгоритм Брезенхема для отрезка. */
export function bresenhamLine({ start, end }: LineInput): RasterResult {
  const points: Point[] = [];
  let x = start.x;
  let y = start.y;
  const dx = Math.abs(end.x - start.x);
  const sx = x < end.x ? 1 : -1;
  const dy = -Math.abs(end.y - start.y);
  const sy = y < end.y ? 1 : -1;
  let error = dx + dy;
  const steps = Math.max(dx, Math.abs(dy));
  const initialError = error;

  while (true) {
    points.push({ x, y });
    if (x === end.x && y === end.y) break;
    const doubledError = 2 * error;
    if (doubledError >= dy) {
      error += dy;
      x += sx;
    }
    if (doubledError <= dx) {
      error += dx;
      y += sy;
    }
  }

  return {
    points,
    iterations: steps,
    calculations: [
      `dx = |x₂ − x₁| = ${dx}, dy = |y₂ − y₁| = ${Math.abs(dy)}`,
      `sx = ${sx}, sy = ${sy}, начальная ошибка e₀ = dx − dy = ${initialError}`,
      `Если 2e ≥ −dy, сдвиг по X; если 2e ≤ dx, сдвиг по Y`,
    ],
  };
}

function addCircleSymmetry(points: Point[], center: Point, x: number, y: number): void {
  const candidates = [
    { x: center.x + x, y: center.y + y },
    { x: center.x - x, y: center.y + y },
    { x: center.x + x, y: center.y - y },
    { x: center.x - x, y: center.y - y },
    { x: center.x + y, y: center.y + x },
    { x: center.x - y, y: center.y + x },
    { x: center.x + y, y: center.y - x },
    { x: center.x - y, y: center.y - x },
  ];
  candidates.forEach((point) => pushUnique(points, point));
}

/** Алгоритм Брезенхема для окружности с восемью симметричными точками. */
export function bresenhamCircle({ center, radius }: CircleInput): RasterResult {
  const points: Point[] = [];
  let x = 0;
  let y = Math.max(0, Math.round(radius));
  let decision = 1 - y;
  let iterations = 0;

  while (x <= y) {
    addCircleSymmetry(points, center, x, y);
    iterations += 1;
    x += 1;
    if (decision < 0) {
      decision += 2 * x + 1;
    } else {
      y -= 1;
      decision += 2 * (x - y) + 1;
    }
  }

  return {
    points,
    iterations,
    calculations: [
      `Центр C(${center.x}; ${center.y}), R = ${Math.round(radius)}`,
      `Начальная точка: (0; R), параметр p₀ = 1 − R = ${1 - Math.round(radius)}`,
      `После каждого шага добавляются 8 симметричных точек`,
    ],
  };
}

export function runLineAlgorithm(kind: "step" | "dda" | "bresenham", input: LineInput): RasterResult {
  if (kind === "step") return stepByStepLine(input);
  if (kind === "dda") return ddaLine(input);
  return bresenhamLine(input);
}
