import "./style.css";
import {
  clipConvexPolygonSutherlandHodgman,
  clipSegmentLiangBarsky,
  normalizeWindow,
} from "./algorithms";
import type { ClipWindow, ClippedSegment, Point, Polygon, Segment } from "./types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Корневой элемент приложения не найден");

app.innerHTML = `
  <main>
    <h1>Лабораторная работа №4</h1>
    <h2>Алгоритмы отсечения</h2>
    <p>Вариант 17: Лианг–Барски для отрезков и отсечение выпуклого многоугольника.</p>
    <hr>

    <section class="controls">
      <h3>Входные данные</h3>
      <label>Задание
        <select id="mode">
          <option value="segments">Отрезки — Лианг–Барски</option>
          <option value="polygon">Выпуклый многоугольник</option>
        </select>
      </label>

      <fieldset>
        <legend>Отсекающее окно</legend>
        <div class="window-grid">
          <label>Xmin <input id="xmin" type="number" value="-5"></label>
          <label>Ymin <input id="ymin" type="number" value="-5"></label>
          <label>Xmax <input id="xmax" type="number" value="5"></label>
          <label>Ymax <input id="ymax" type="number" value="5"></label>
        </div>
      </fieldset>

      <div id="segment-input">
        <label class="wide-label">Отрезки, по одному на строку: <code>x1 y1 x2 y2</code>
          <textarea id="segments" rows="6">-10 0 10 0
-8 -8 8 8
-12 8 -8 12
-2 -12 -2 12</textarea>
        </label>
      </div>

      <div id="polygon-input" class="hidden">
        <label class="wide-label">Вершины выпуклого многоугольника, по одной на строку: <code>x y</code>
          <textarea id="polygon" rows="6">-8 -3
8 -3
10 8
0 12
-10 8</textarea>
        </label>
      </div>

      <label>Масштаб сетки: <output id="scale-value">28 px</output>
        <input id="scale" type="range" min="16" max="48" value="28">
      </label>
      <button id="run-button" type="button">Выполнить отсечение</button>
      <p id="status" role="status">Готово к расчёту.</p>
    </section>

    <section>
      <h3>Графическое построение</h3>
      <canvas id="clipping-canvas" width="960" height="620"></canvas>
      <div class="legend">
        <span><i class="legend-window"></i> окно отсечения</span>
        <span><i class="legend-original"></i> исходная геометрия</span>
        <span><i class="legend-visible"></i> видимая часть</span>
      </div>
    </section>

    <section>
      <h3>Результат</h3>
      <div id="result"></div>
    </section>
  </main>
`;

type Mode = "segments" | "polygon";
type Scene = {
  window: ClipWindow;
  segments: Segment[];
  clippedSegments: Array<ClippedSegment | null>;
  polygon: Polygon;
  clippedPolygon: Polygon;
};

let scale = 28;
let lastScene: Scene | null = null;

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Элемент ${selector} не найден`);
  return element;
}

function numberValue(selector: string): number {
  return Number(required<HTMLInputElement>(selector).value);
}

function readWindow(): ClipWindow {
  const values = ["#xmin", "#ymin", "#xmax", "#ymax"].map(numberValue);
  if (values.some((value) => !Number.isFinite(value))) throw new Error("Все координаты окна должны быть числами.");
  return normalizeWindow({ xmin: values[0], ymin: values[1], xmax: values[2], ymax: values[3] });
}

function parseRows(text: string, expectedLength: number, name: string): number[][] {
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!rows.length) throw new Error(`${name}: добавьте хотя бы одну строку.`);
  return rows.map((row, index) => {
    const values = row.split(/[;,\s]+/).map(Number);
    if (values.length !== expectedLength || values.some((value) => !Number.isFinite(value))) {
      throw new Error(`${name}, строка ${index + 1}: нужно ${expectedLength} числовых значений.`);
    }
    return values;
  });
}

function parseSegments(): Segment[] {
  return parseRows(required<HTMLTextAreaElement>("#segments").value, 4, "Отрезки")
    .map(([x1, y1, x2, y2]) => ({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 } }));
}

function parsePolygon(): Polygon {
  const points = parseRows(required<HTMLTextAreaElement>("#polygon").value, 2, "Многоугольник")
    .map(([x, y]) => ({ x, y }));
  if (points.length < 3) throw new Error("Многоугольник должен содержать минимум три вершины.");
  return points;
}

function format(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function toCanvas(point: Point): [number, number] {
  return [canvas.width / 2 + point.x * scale, canvas.height / 2 - point.y * scale];
}

const canvas = required<HTMLCanvasElement>("#clipping-canvas");

function drawLine(context: CanvasRenderingContext2D, first: Point, second: Point): void {
  const [x1, y1] = toCanvas(first);
  const [x2, y2] = toCanvas(second);
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

function drawPolygon(context: CanvasRenderingContext2D, polygon: Polygon): void {
  if (!polygon.length) return;
  const [firstX, firstY] = toCanvas(polygon[0]);
  context.beginPath();
  context.moveTo(firstX, firstY);
  polygon.slice(1).forEach((point) => {
    const [x, y] = toCanvas(point);
    context.lineTo(x, y);
  });
  context.closePath();
  context.stroke();
}

function fillPolygon(context: CanvasRenderingContext2D, polygon: Polygon): void {
  if (!polygon.length) return;
  drawPolygon(context, polygon);
  context.fill();
}

function drawGrid(context: CanvasRenderingContext2D): void {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const xLimit = Math.ceil(canvas.width / (2 * scale));
  const yLimit = Math.ceil(canvas.height / (2 * scale));

  context.strokeStyle = "#e3e3e3";
  context.lineWidth = 1;
  for (let x = -xLimit; x <= xLimit; x += 1) {
    drawLine(context, { x, y: -yLimit }, { x, y: yLimit });
  }
  for (let y = -yLimit; y <= yLimit; y += 1) {
    drawLine(context, { x: -xLimit, y }, { x: xLimit, y });
  }

  context.strokeStyle = "#333";
  context.lineWidth = 2;
  drawLine(context, { x: -xLimit, y: 0 }, { x: xLimit, y: 0 });
  drawLine(context, { x: 0, y: -yLimit }, { x: 0, y: yLimit });
  context.fillStyle = "#222";
  context.font = "12px Arial";
  context.textAlign = "center";
  for (let x = -xLimit; x <= xLimit; x += 1) {
    const [canvasX, canvasY] = toCanvas({ x, y: 0 });
    if (canvasX > 12 && canvasX < canvas.width - 12) context.fillText(String(x), canvasX, canvasY + 15);
  }
  context.textAlign = "left";
  for (let y = -yLimit; y <= yLimit; y += 1) {
    const [canvasX, canvasY] = toCanvas({ x: 0, y });
    if (canvasY > 12 && canvasY < canvas.height - 8) context.fillText(String(y), canvasX + 5, canvasY - 4);
  }
  context.fillText("X", canvas.width - 18, canvas.height / 2 - 6);
  context.fillText("Y", canvas.width / 2 + 6, 14);
}

function drawScene(scene: Scene | null): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  drawGrid(context);
  if (!scene) return;

  const [xmin, ymin] = toCanvas({ x: scene.window.xmin, y: scene.window.ymin });
  const [xmax, ymax] = toCanvas({ x: scene.window.xmax, y: scene.window.ymax });
  context.fillStyle = "rgba(105, 42, 145, 0.08)";
  context.fillRect(xmin, ymax, xmax - xmin, ymin - ymax);
  context.strokeStyle = "#6b2d91";
  context.lineWidth = 3;
  context.setLineDash([8, 5]);
  context.strokeRect(xmin, ymax, xmax - xmin, ymin - ymax);
  context.setLineDash([]);

  context.strokeStyle = "#d56616";
  context.lineWidth = 2;
  scene.segments.forEach((segment) => drawLine(context, segment.start, segment.end));
  if (scene.polygon.length) {
    context.fillStyle = "rgba(213, 102, 22, 0.13)";
    context.strokeStyle = "#d56616";
    fillPolygon(context, scene.polygon);
  }

  context.strokeStyle = "#16833b";
  context.lineWidth = 4;
  scene.clippedSegments.forEach((segment) => {
    if (segment) drawLine(context, segment.start, segment.end);
  });
  if (scene.clippedPolygon.length) {
    context.fillStyle = "rgba(22, 131, 59, 0.18)";
    context.strokeStyle = "#16833b";
    fillPolygon(context, scene.clippedPolygon);
  }
}

function segmentTable(segments: Segment[], clipped: Array<ClippedSegment | null>): string {
  const rows = segments.map((segment, index) => {
    const visible = clipped[index];
    const original = `(${format(segment.start.x)}; ${format(segment.start.y)}) → (${format(segment.end.x)}; ${format(segment.end.y)})`;
    const result = visible
      ? `(${format(visible.start.x)}; ${format(visible.start.y)}) → (${format(visible.end.x)}; ${format(visible.end.y)})`
      : "невидим";
    const parameters = visible ? `t₁ = ${format(visible.tEnter)}, t₂ = ${format(visible.tLeave)}` : "—";
    return `<tr><td>${index + 1}</td><td>${original}</td><td>${result}</td><td>${parameters}</td></tr>`;
  }).join("");
  return `<table><thead><tr><th>№</th><th>Исходный отрезок</th><th>Видимая часть</th><th>Параметры</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function pointList(points: Polygon): string {
  return points.map((point, index) => `${index + 1}. (${format(point.x)}; ${format(point.y)})`).join("<br>") || "нет точек";
}

function renderResult(mode: Mode, scene: Scene): void {
  const result = required<HTMLDivElement>("#result");
  if (mode === "segments") {
    const visibleCount = scene.clippedSegments.filter(Boolean).length;
    result.innerHTML = `<p><b>Алгоритм:</b> Лианг–Барски. Видимых отрезков: ${visibleCount} из ${scene.segments.length}.</p>${segmentTable(scene.segments, scene.clippedSegments)}`;
    return;
  }
  result.innerHTML = `
    <p><b>Алгоритм:</b> Сазерленд–Ходжман. Вершин после отсечения: ${scene.clippedPolygon.length}.</p>
    <div class="polygon-result"><div><b>Исходный многоугольник</b><br>${pointList(scene.polygon)}</div><div><b>Видимая часть</b><br>${pointList(scene.clippedPolygon)}</div></div>`;
}

function setStatus(message: string, error = false): void {
  const status = required<HTMLParagraphElement>("#status");
  status.textContent = message;
  status.classList.toggle("error", error);
}

function run(): void {
  try {
    const window = readWindow();
    const mode = required<HTMLSelectElement>("#mode").value as Mode;
    const segments = mode === "segments" ? parseSegments() : [];
    const polygon = mode === "polygon" ? parsePolygon() : [];
    const clippedSegments = segments.map((segment) => clipSegmentLiangBarsky(segment, window));
    const clippedPolygon = polygon.length ? clipConvexPolygonSutherlandHodgman(polygon, window) : [];
    lastScene = { window, segments, clippedSegments, polygon, clippedPolygon };
    drawScene(lastScene);
    renderResult(mode, lastScene);
    setStatus("Расчёт выполнен.");
  } catch (error) {
    lastScene = null;
    drawScene(null);
    required<HTMLDivElement>("#result").innerHTML = "";
    setStatus(error instanceof Error ? error.message : "Не удалось выполнить расчёт.", true);
  }
}

function updateMode(): void {
  const mode = required<HTMLSelectElement>("#mode").value as Mode;
  required<HTMLDivElement>("#segment-input").classList.toggle("hidden", mode !== "segments");
  required<HTMLDivElement>("#polygon-input").classList.toggle("hidden", mode !== "polygon");
  run();
}

required<HTMLSelectElement>("#mode").addEventListener("change", updateMode);
required<HTMLButtonElement>("#run-button").addEventListener("click", run);
required<HTMLInputElement>("#scale").addEventListener("input", (event) => {
  scale = Number((event.target as HTMLInputElement).value);
  required<HTMLOutputElement>("#scale-value").value = `${scale} px`;
  drawScene(lastScene);
});

run();
