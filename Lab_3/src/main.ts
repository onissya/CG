import "./style.css";
import { bresenhamCircle, bresenhamLine, ddaLine, runLineAlgorithm, stepByStepLine } from "./algorithms";
import type { AlgorithmKind, DrawMode, Point, RasterResult } from "./types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Корневой элемент приложения не найден");

app.innerHTML = `
  <h1>Лабораторная работа №3</h1>
  <h2>Базовые растровые алгоритмы</h2>
  <p>Пошаговый алгоритм, ЦДА, алгоритм Брезенхема для отрезка и окружности.</p>
  <hr>

  <section class="controls">
    <h3>Входные данные</h3>
    <label>Фигура
      <select id="draw-mode"><option value="line">Отрезок</option><option value="circle">Окружность</option></select>
    </label>
    <label>Алгоритм <select id="algorithm"></select></label>
    <div id="line-controls" class="input-grid">
      <span>Начальная точка A</span><label>x₁ <input id="x1" type="number" value="-10"></label><label>y₁ <input id="y1" type="number" value="-5"></label>
      <span>Конечная точка B</span><label>x₂ <input id="x2" type="number" value="12"></label><label>y₂ <input id="y2" type="number" value="8"></label>
    </div>
    <div id="circle-controls" class="input-grid hidden">
      <span>Центр окружности C</span><label>x₀ <input id="cx" type="number" value="0"></label><label>y₀ <input id="cy" type="number" value="0"></label>
      <span>Радиус</span><label>R <input id="radius" type="number" min="1" value="8"></label>
    </div>
    <label>Масштаб клетки: <output id="scale-value">24 px</output><input id="scale" type="range" min="14" max="42" value="24"></label>
    <button id="draw-button" type="button">Построить</button>
    <span id="time-value">Время: —</span>
  </section>

  <section>
    <h3>Графическое построение</h3>
    <p id="canvas-caption">Отрезок A → B</p>
    <canvas id="raster-canvas" width="960" height="620"></canvas>
    <p>Синим обозначена начальная точка или центр, красным — конечная точка, зелёным — выбранные пиксели.</p>
  </section>

  <section>
    <h3>Результат</h3>
    <p><b>Алгоритм:</b> <span id="algorithm-title">—</span></p>
    <div id="calculation-list"></div>
    <p><b>Количество пикселей:</b> <span id="point-count">—</span> · <b>Итераций:</b> <span id="iteration-count">—</span> · <b>Время:</b> <span id="time-short">—</span></p>
    <h4>Сравнение времени</h4>
    <table><thead><tr><th>Метод</th><th>Среднее время</th></tr></thead><tbody id="timing-table"></tbody></table>
    <h4>Координаты выбранных пикселей</h4>
    <div class="table-scroll"><table><thead><tr><th>№</th><th>X</th><th>Y</th></tr></thead><tbody id="points-table"></tbody></table></div>
  </section>

  <section>
    <h3>Привязка к дискретной сетке</h3>
    <p>Координаты алгоритмов целые. Точка (x, y) попадает в клетку с центром: <code>(originX + x · scale, originY − y · scale)</code>. Размер клетки равен <code>scale × scale</code>. Ось Y на Canvas направлена вниз, поэтому в формуле используется минус.</p>
  </section>
`;

const names: Record<AlgorithmKind, string> = {
  step: "Пошаговый алгоритм",
  dda: "Алгоритм ЦДА",
  bresenham: "Брезенхем (отрезок)",
  circle: "Брезенхем (окружность)",
};

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Элемент ${selector} не найден`);
  return element;
}

const modeSelect = required<HTMLSelectElement>("#draw-mode");
const algorithmSelect = required<HTMLSelectElement>("#algorithm");
const canvas = required<HTMLCanvasElement>("#raster-canvas");
let mode: DrawMode = "line";
let algorithm: AlgorithmKind = "bresenham";
let scale = 24;
let lastResult: RasterResult | undefined;

function value(selector: string): number {
  return Number(required<HTMLInputElement>(selector).value) || 0;
}

function toCanvas(point: Point, originX: number, originY: number): [number, number] {
  return [originX + point.x * scale, originY - point.y * scale];
}

function drawGrid(result?: RasterResult): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const originX = canvas.width / 2;
  const originY = canvas.height / 2;
  const xLimit = Math.ceil(canvas.width / scale / 2);
  const yLimit = Math.ceil(canvas.height / scale / 2);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#dddddd";
  context.lineWidth = 1;
  for (let x = -xLimit; x <= xLimit; x += 1) {
    const px = originX + x * scale + 0.5;
    context.beginPath(); context.moveTo(px, 0); context.lineTo(px, canvas.height); context.stroke();
  }
  for (let y = -yLimit; y <= yLimit; y += 1) {
    const py = originY - y * scale + 0.5;
    context.beginPath(); context.moveTo(0, py); context.lineTo(canvas.width, py); context.stroke();
  }
  context.strokeStyle = "black";
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(0, originY); context.lineTo(canvas.width, originY); context.moveTo(originX, 0); context.lineTo(originX, canvas.height); context.stroke();

  context.fillStyle = "black";
  context.font = "12px Arial";
  context.textAlign = "center";
  for (let x = -xLimit; x <= xLimit; x += 1) {
    const [px] = toCanvas({ x, y: 0 }, originX, originY);
    if (px > 12 && px < canvas.width - 12) context.fillText(String(x), px, originY + 15);
  }
  context.textAlign = "left";
  for (let y = -yLimit; y <= yLimit; y += 1) {
    const [, py] = toCanvas({ x: 0, y }, originX, originY);
    if (py > 12 && py < canvas.height - 5) context.fillText(String(y), originX + 5, py - 4);
  }
  context.fillText("X", canvas.width - 18, originY - 6);
  context.fillText("Y", originX + 6, 14);

  if (!result) return;
  context.setLineDash([5, 5]);
  context.strokeStyle = "#5555cc";
  context.lineWidth = 1;
  if (mode === "line") {
    const [sx, sy] = toCanvas({ x: value("#x1"), y: value("#y1") }, originX, originY);
    const [ex, ey] = toCanvas({ x: value("#x2"), y: value("#y2") }, originX, originY);
    context.beginPath(); context.moveTo(sx, sy); context.lineTo(ex, ey); context.stroke();
  } else {
    const [cx, cy] = toCanvas({ x: value("#cx"), y: value("#cy") }, originX, originY);
    context.beginPath(); context.arc(cx, cy, Math.max(1, value("#radius")) * scale, 0, Math.PI * 2); context.stroke();
  }
  context.setLineDash([]);

  result.points.forEach((point) => {
    const [px, py] = toCanvas(point, originX, originY);
    context.fillStyle = "#b8e986";
    context.fillRect(px - scale / 2 + 2, py - scale / 2 + 2, scale - 4, scale - 4);
    context.strokeStyle = "#555555";
    context.strokeRect(px - scale / 2 + 2, py - scale / 2 + 2, scale - 4, scale - 4);
  });

  const markers = mode === "line"
    ? [{ point: { x: value("#x1"), y: value("#y1") }, color: "blue" }, { point: { x: value("#x2"), y: value("#y2") }, color: "red" }]
    : [{ point: { x: value("#cx"), y: value("#cy") }, color: "blue" }];
  markers.forEach(({ point, color }) => {
    const [px, py] = toCanvas(point, originX, originY);
    context.fillStyle = color;
    context.beginPath(); context.arc(px, py, 5, 0, Math.PI * 2); context.fill();
  });
}

function lineInput() {
  return { start: { x: value("#x1"), y: value("#y1") }, end: { x: value("#x2"), y: value("#y2") } };
}

function circleInput() {
  return { center: { x: value("#cx"), y: value("#cy") }, radius: value("#radius") };
}

function measure(run: () => RasterResult): number {
  const count = 1000;
  const start = performance.now();
  for (let index = 0; index < count; index += 1) run();
  return (performance.now() - start) / count;
}

function render(result: RasterResult, timings: Array<{ name: string; time: number }>): void {
  lastResult = result;
  drawGrid(result);
  const selectedTime = timings.find((item) => item.name === names[algorithm])?.time ?? 0;
  required<HTMLElement>("#algorithm-title").textContent = names[algorithm];
  required<HTMLElement>("#calculation-list").innerHTML = result.calculations.map((item) => `<p>${item}</p>`).join("");
  required<HTMLElement>("#point-count").textContent = String(result.points.length);
  required<HTMLElement>("#iteration-count").textContent = String(result.iterations);
  required<HTMLElement>("#time-short").textContent = `${selectedTime.toFixed(4)} мс`;
  required<HTMLElement>("#time-value").textContent = `Среднее время: ${selectedTime.toFixed(4)} мс`;
  required<HTMLTableSectionElement>("#timing-table").innerHTML = timings.map((item) => `<tr><td>${item.name}</td><td>${item.time.toFixed(4)} мс</td></tr>`).join("");
  required<HTMLTableSectionElement>("#points-table").innerHTML = result.points.map((point, index) => `<tr><td>${index + 1}</td><td>${point.x}</td><td>${point.y}</td></tr>`).join("");
}

function calculate(): void {
  const line = lineInput();
  const circle = circleInput();
  const functions = mode === "circle"
    ? [{ name: names.circle, run: () => bresenhamCircle(circle) }]
    : [
        { name: names.step, run: () => stepByStepLine(line) },
        { name: names.dda, run: () => ddaLine(line) },
        { name: names.bresenham, run: () => bresenhamLine(line) },
      ];
  const timings = functions.map((item) => ({ name: item.name, time: measure(item.run) }));
  const result = mode === "circle"
    ? bresenhamCircle(circle)
    : runLineAlgorithm(algorithm === "circle" ? "bresenham" : algorithm, line);
  render(result, timings);
}

function updateControls(): void {
  mode = modeSelect.value as DrawMode;
  const circle = mode === "circle";
  required<HTMLElement>("#line-controls").classList.toggle("hidden", circle);
  required<HTMLElement>("#circle-controls").classList.toggle("hidden", !circle);
  algorithmSelect.innerHTML = (circle
    ? [["circle", names.circle]]
    : [["step", names.step], ["dda", names.dda], ["bresenham", names.bresenham]])
    .map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
  algorithm = circle ? "circle" : "bresenham";
  required<HTMLElement>("#canvas-caption").textContent = circle ? "Окружность" : "Отрезок A → B";
  calculate();
}

modeSelect.addEventListener("change", updateControls);
algorithmSelect.addEventListener("change", () => { algorithm = algorithmSelect.value as AlgorithmKind; calculate(); });
required<HTMLButtonElement>("#draw-button").addEventListener("click", calculate);
required<HTMLInputElement>("#scale").addEventListener("input", (event) => {
  scale = Number((event.target as HTMLInputElement).value);
  required<HTMLOutputElement>("#scale-value").value = `${scale} px`;
  drawGrid(lastResult);
});
document.querySelectorAll<HTMLInputElement>("input[type=number]").forEach((input) => input.addEventListener("input", calculate));

updateControls();
