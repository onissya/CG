import "./style.css";
import {
  applyLowPassFilter,
  applyMorphology,
  calculateMetrics,
  getOperationTitle,
} from "./algorithms";
import { loadImageMatrix, samples, type SampleImage } from "./samples";
import type { ImageMatrix, MorphologyKind, SmoothingKind } from "./types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Корневой элемент приложения не найден");

app.innerHTML = `
  <main class="page">
    <header class="page-header">
      <h1>Лабораторная работа №2</h1>
      <p>Основы обработки цифровых изображений. Вариант 17.</p>
    </header>

    <section class="box" id="workspace">
      <h2>1. Исходное изображение</h2>
      <p>Вариант 17: низкочастотные фильтры и морфологическая обработка.</p>
      <div class="upload-row">
        <label class="upload-button">
          <input id="file-input" type="file" accept="image/*" />
          <span>Загрузить изображение</span>
        </label>
      </div>
      <div class="sample-list" id="sample-list"></div>
      <p class="source-status"><span class="status-dot"></span><span id="source-name">—</span><span id="source-size">—</span></p>
    </section>

    <section class="box" id="smoothing">
      <h2>2. Низкочастотные фильтры</h2>
      <p>Фильтр заменяет пиксель средним значением соседних пикселей и сглаживает шум.</p>
      <div class="filter-layout">
        <div class="control-panel">
          <label>Метод
            <select id="smoothing-kind">
              <option value="mean">Средний фильтр</option>
              <option value="gaussian">Гауссов фильтр</option>
            </select>
          </label>
          <label>Размер окна
            <span class="segmented" id="smoothing-window">
              <button type="button" data-size="3" class="active">3 × 3</button>
              <button type="button" data-size="5">5 × 5</button>
            </span>
          </label>
          <label class="range-control hidden" id="sigma-control">σ: <output id="sigma-value">1.2</output>
            <input id="sigma" type="range" min="0.5" max="3" value="1.2" step="0.1" />
          </label>
          <button class="button" id="apply-smoothing" type="button">Применить фильтр</button>
          <p class="processing-note" id="smoothing-time">Готово к обработке</p>
          <div class="small-metrics" id="smoothing-metrics"></div>
        </div>
        <div class="comparison-pair">
          <article class="image-panel"><h3>До обработки</h3><canvas id="smoothing-before"></canvas></article>
          <article class="image-panel"><h3>После сглаживания</h3><canvas id="smoothing-after"></canvas></article>
        </div>
      </div>
    </section>

    <section class="box" id="morphology">
      <h2>3. Морфологическая обработка</h2>
      <p>Операции выполняются с помощью квадратного структурирующего элемента.</p>
      <div class="filter-layout">
        <div class="control-panel">
          <label>Операция
            <select id="morphology-kind">
              <option value="erosion">Эрозия</option>
              <option value="dilation">Дилатация</option>
              <option value="opening">Открытие</option>
              <option value="closing">Закрытие</option>
            </select>
          </label>
          <label>Размер элемента
            <span class="segmented" id="morphology-window">
              <button type="button" data-size="3" class="active">3 × 3</button>
              <button type="button" data-size="5">5 × 5</button>
            </span>
          </label>
          <button class="button" id="apply-morphology" type="button">Применить операцию</button>
          <p class="processing-note" id="morphology-time">Готово к обработке</p>
          <div class="small-metrics" id="morphology-metrics"></div>
        </div>
        <div class="comparison-pair">
          <article class="image-panel"><h3>До обработки</h3><canvas id="morphology-before"></canvas></article>
          <article class="image-panel"><h3>После операции</h3><canvas id="morphology-after"></canvas></article>
        </div>
      </div>
    </section>

    <section class="box" id="theory">
      <h2>4. Краткие пояснения</h2>
      <div class="theory-grid">
        <article><h3>Средний фильтр</h3><p>Каждый пиксель заменяется средним по окну. Шум уменьшается, но границы становятся мягче.</p><code>g(x,y) = 1/N · Σ f(i,j)</code></article>
        <article><h3>Фильтр Гаусса</h3><p>Ближайшие пиксели имеют больший вес. Изображение получается сглаженным без резких переходов.</p><code>G(x,y) = e−(x²+y²)/2σ²</code></article>
        <article><h3>Эрозия и дилатация</h3><p>Эрозия уменьшает светлые области, а дилатация увеличивает их.</p><code>erosion = min(S), dilation = max(S)</code></article>
        <article><h3>Открытие и закрытие</h3><p>Открытие убирает маленькие объекты. Закрытие заполняет маленькие отверстия.</p><code>opening = dilation(erosion)<br>closing = erosion(dilation)</code></article>
      </div>
    </section>
    <footer>Лабораторная работа №2 · Вариант 17 · TypeScript / Canvas API</footer>
  </main>
`;

let currentSource: ImageMatrix;
let smoothingWindowSize: 3 | 5 = 3;
let morphologyWindowSize: 3 | 5 = 3;

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Элемент ${selector} не найден`);
  return element;
}

function drawImage(canvas: HTMLCanvasElement, image: ImageMatrix): void {
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
}

function metricMarkup(image: ImageMatrix): string {
  const metrics = calculateMetrics(image);
  return `σ: ${metrics.standardDeviation.toFixed(1)}<br>диапазон: ${Math.round(metrics.min)}–${Math.round(metrics.max)}`;
}

function setMetrics(selector: string, image: ImageMatrix): void {
  required<HTMLElement>(selector).innerHTML = metricMarkup(image);
}

function smoothingOptions(): { kind: SmoothingKind; windowSize: 3 | 5; sigma: number } {
  return {
    kind: required<HTMLSelectElement>("#smoothing-kind").value as SmoothingKind,
    windowSize: smoothingWindowSize,
    sigma: Number(required<HTMLInputElement>("#sigma").value),
  };
}

function morphologyOptions(): { kind: MorphologyKind; windowSize: 3 | 5 } {
  return {
    kind: required<HTMLSelectElement>("#morphology-kind").value as MorphologyKind,
    windowSize: morphologyWindowSize,
  };
}

function applySmoothing(): void {
  const button = required<HTMLButtonElement>("#apply-smoothing");
  button.disabled = true;
  button.textContent = "Обработка...";
  requestAnimationFrame(() => {
    const startedAt = performance.now();
    const result = applyLowPassFilter(currentSource, smoothingOptions());
    drawImage(required<HTMLCanvasElement>("#smoothing-after"), result);
    setMetrics("#smoothing-metrics", result);
    required<HTMLElement>("#smoothing-time").textContent = `Выполнено за ${(performance.now() - startedAt).toFixed(0)} мс`;
    button.disabled = false;
    button.textContent = "Применить фильтр";
  });
}

function applyMorphologyFilter(): void {
  const button = required<HTMLButtonElement>("#apply-morphology");
  button.disabled = true;
  button.textContent = "Обработка...";
  requestAnimationFrame(() => {
    const startedAt = performance.now();
    const options = morphologyOptions();
    const result = applyMorphology(currentSource, options);
    drawImage(required<HTMLCanvasElement>("#morphology-after"), result);
    setMetrics("#morphology-metrics", result);
    required<HTMLElement>("#morphology-time").textContent = `${getOperationTitle(options.kind)} выполнено за ${(performance.now() - startedAt).toFixed(0)} мс`;
    button.disabled = false;
    button.textContent = "Применить операцию";
  });
}

function updateSmoothingControls(): void {
  const gaussianSelected = required<HTMLSelectElement>("#smoothing-kind").value === "gaussian";
  required<HTMLElement>("#sigma-control").classList.toggle("hidden", !gaussianSelected);
}

function setWindowButtons(selector: string, size: 3 | 5): void {
  document.querySelectorAll<HTMLButtonElement>(`${selector} button`).forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.size) === size);
  });
}

function setRecommendedFilters(sampleId: string): void {
  const sample = samples.find((item) => item.id === sampleId);
  if (!sample) return;
  required<HTMLSelectElement>("#smoothing-kind").value = sample.smoothing.kind;
  smoothingWindowSize = sample.smoothing.windowSize;
  setWindowButtons("#smoothing-window", smoothingWindowSize);
  if (sample.smoothing.sigma) required<HTMLInputElement>("#sigma").value = String(sample.smoothing.sigma);
  required<HTMLSelectElement>("#morphology-kind").value = sample.morphology.kind;
  morphologyWindowSize = sample.morphology.windowSize;
  setWindowButtons("#morphology-window", morphologyWindowSize);
  required<HTMLOutputElement>("#sigma-value").value = required<HTMLInputElement>("#sigma").value;
  updateSmoothingControls();
}

function loadSource(image: ImageMatrix, name: string, sampleId: string): void {
  currentSource = image;
  required<HTMLElement>("#source-name").textContent = name;
  required<HTMLElement>("#source-size").textContent = `${image.width} × ${image.height} px`;
  drawImage(required<HTMLCanvasElement>("#smoothing-before"), image);
  drawImage(required<HTMLCanvasElement>("#smoothing-after"), image);
  drawImage(required<HTMLCanvasElement>("#morphology-before"), image);
  drawImage(required<HTMLCanvasElement>("#morphology-after"), image);
  document.querySelectorAll<HTMLElement>(".sample-card").forEach((card) => {
    card.classList.toggle("selected", card.dataset.sample === sampleId);
  });
  applySmoothing();
  applyMorphologyFilter();
}

async function selectSample(sample: SampleImage): Promise<void> {
  setRecommendedFilters(sample.id);
  const image = await loadImageMatrix(sample.imagePath);
  loadSource(image, sample.title, sample.id);
}

function renderSampleList(): void {
  const list = required<HTMLElement>("#sample-list");
  samples.forEach((sample, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sample-card";
    button.dataset.sample = sample.id;
    button.innerHTML = `<span class="sample-index">0${index + 1}</span><span class="sample-badge">${sample.badge}</span><strong>${sample.title}</strong><small>${sample.description}</small><span class="sample-arrow">↗</span>`;
    button.addEventListener("click", () => void selectSample(sample));
    list.append(button);
  });
}

async function loadUploadedFile(file: File): Promise<void> {
  const bitmap = await createImageBitmap(file);
  const maximumDimension = 900;
  const scale = Math.min(1, maximumDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D недоступен");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const imageData = context.getImageData(0, 0, width, height);
  loadSource({ width, height, data: imageData.data }, file.name, "custom");
}

renderSampleList();

required<HTMLSelectElement>("#smoothing-kind").addEventListener("change", updateSmoothingControls);
required<HTMLButtonElement>("#apply-smoothing").addEventListener("click", applySmoothing);
required<HTMLButtonElement>("#apply-morphology").addEventListener("click", applyMorphologyFilter);

document.querySelectorAll<HTMLButtonElement>("#smoothing-window button").forEach((button) => {
  button.addEventListener("click", () => {
    smoothingWindowSize = Number(button.dataset.size) as 3 | 5;
    setWindowButtons("#smoothing-window", smoothingWindowSize);
  });
});

document.querySelectorAll<HTMLButtonElement>("#morphology-window button").forEach((button) => {
  button.addEventListener("click", () => {
    morphologyWindowSize = Number(button.dataset.size) as 3 | 5;
    setWindowButtons("#morphology-window", morphologyWindowSize);
  });
});

required<HTMLInputElement>("#sigma").addEventListener("input", (event) => {
  required<HTMLOutputElement>("#sigma-value").value = (event.target as HTMLInputElement).value;
});

required<HTMLInputElement>("#file-input").addEventListener("change", async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) await loadUploadedFile(file);
});

setRecommendedFilters(samples[0].id);
void selectSample(samples[0]);
