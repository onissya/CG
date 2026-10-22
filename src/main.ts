import "./styles.css";
import {
  cmykToRgb,
  hexToRgb,
  hlsToRgb,
  hsvToRgb,
  normalizeRgb,
  rgbToCmyk,
  rgbToHex,
  rgbToHls,
  rgbToHsv,
  round,
  type RGB,
} from "./color";

type Model = "rgb" | "cmyk" | "hsv" | "hls";
type Variant = "hsv" | "hls";

type Channel = {
  key: string;
  name: string;
  min: number;
  max: number;
  unit: string;
};

const channels: Record<Model, Channel[]> = {
  rgb: [
    { key: "r", name: "Красный", min: 0, max: 255, unit: "" },
    { key: "g", name: "Зелёный", min: 0, max: 255, unit: "" },
    { key: "b", name: "Синий", min: 0, max: 255, unit: "" },
  ],
  cmyk: [
    { key: "c", name: "Голубой", min: 0, max: 100, unit: "%" },
    { key: "m", name: "Пурпурный", min: 0, max: 100, unit: "%" },
    { key: "y", name: "Жёлтый", min: 0, max: 100, unit: "%" },
    { key: "k", name: "Чёрный", min: 0, max: 100, unit: "%" },
  ],
  hsv: [
    { key: "h", name: "Тон", min: 0, max: 360, unit: "°" },
    { key: "s", name: "Насыщенность", min: 0, max: 100, unit: "%" },
    { key: "v", name: "Яркость", min: 0, max: 100, unit: "%" },
  ],
  hls: [
    { key: "h", name: "Тон", min: 0, max: 360, unit: "°" },
    { key: "l", name: "Светлота", min: 0, max: 100, unit: "%" },
    { key: "s", name: "Насыщенность", min: 0, max: 100, unit: "%" },
  ],
};

const modelDescriptions: Record<Model, string> = {
  rgb: "Аддитивная модель для экранов",
  cmyk: "Субтрактивная модель для печати",
  hsv: "Тон, насыщенность и яркость",
  hls: "Тон, светлота и насыщенность",
};

const presets = [
  "#EF4444",
  "#F97316",
  "#FACC15",
  "#22C55E",
  "#14B8A6",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#A855F7",
  "#EC4899",
  "#FFFFFF",
  "#111827",
];

let rgb: RGB = { r: 103, g: 80, b: 164 };
let variant: Variant = "hsv";
let sourceModel: Model | "palette" = "palette";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Корневой элемент #app не найден");

function channelRows(model: Model): string {
  return channels[model]
    .map(
      ({ key, name, min, max, unit }) => `
        <div class="channel-row">
          <label class="channel-label" for="${model}-${key}-number">
            <span class="channel-key">${key.toUpperCase()}</span>
            <span>${name}</span>
          </label>
          <input
            class="channel-range"
            id="${model}-${key}-range"
            type="range"
            min="${min}"
            max="${max}"
            step="1"
            data-model="${model}"
            data-channel="${key}"
            data-kind="range"
            aria-label="${name}: ползунок"
          />
          <div class="number-wrap">
            <input
              class="channel-number"
              id="${model}-${key}-number"
              type="number"
              min="${min}"
              max="${max}"
              step="${model === "rgb" ? 1 : 0.1}"
              inputmode="decimal"
              data-model="${model}"
              data-channel="${key}"
              data-kind="number"
            />
            <span>${unit}</span>
          </div>
        </div>`,
    )
    .join("");
}

function modelCard(model: Model): string {
  return `
    <section class="model-card" id="${model}-card" data-model-card="${model}">
      <div class="model-heading">
        <div>
          <p class="eyebrow">Цветовая модель</p>
          <h2>${model.toUpperCase()}</h2>
        </div>
        <span class="source-badge" data-source-badge="${model}">Источник</span>
      </div>
      <p class="model-description">${modelDescriptions[model]}</p>
      <div class="channels">${channelRows(model)}</div>
    </section>`;
}

app.innerHTML = `
  <main>
    <header class="hero">
      <div>
        <p class="lab-label">Лабораторная работа №1 · Компьютерная графика</p>
        <h1>Цветовые модели</h1>
        <p class="hero-copy">
          Выберите цвет любым способом — значения во всех моделях пересчитаются автоматически.
        </p>
      </div>
      <div class="variant-control" role="group" aria-label="Вариант лабораторной работы">
        <span>Вариант</span>
        <button type="button" class="variant-button is-active" data-variant="hsv">Чётный · HSV</button>
        <button type="button" class="variant-button" data-variant="hls">Нечётный · HLS</button>
      </div>
    </header>

    <section class="color-workbench" aria-label="Выбор цвета">
      <div class="color-preview" id="color-preview" aria-label="Предпросмотр выбранного цвета">
        <span id="preview-hex">#6750A4</span>
      </div>
      <div class="picker-panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Быстрый выбор</p>
            <h2>Задайте исходный цвет</h2>
          </div>
          <span class="live-indicator"><i></i> Синхронизация включена</span>
        </div>

        <div class="quick-inputs">
          <label class="native-picker">
            <span>Палитра</span>
            <input id="color-picker" type="color" value="#6750A4" />
          </label>
          <label class="hex-field">
            <span>Точное значение HEX</span>
            <input id="hex-input" type="text" value="#6750A4" maxlength="7" spellcheck="false" />
          </label>
        </div>

        <div>
          <p class="palette-title">Готовые цвета</p>
          <div class="preset-palette" aria-label="Готовая палитра">
            ${presets
              .map(
                (hex) => `
                  <button
                    type="button"
                    class="swatch"
                    data-hex="${hex}"
                    style="--swatch: ${hex}"
                    aria-label="Выбрать цвет ${hex}"
                    title="${hex}"
                  ></button>`,
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>

    <section class="models-grid" aria-label="Компоненты цветовых моделей">
      ${modelCard("rgb")}
      ${modelCard("cmyk")}
      <div id="variant-card">${modelCard("hsv")}</div>
    </section>

    <section class="explanation">
      <p class="eyebrow">Что происходит</p>
      <h2>Один цвет — разные способы описания</h2>
      <div class="explanation-grid">
        <p><strong>RGB</strong> смешивает красный, зелёный и синий свет. Чем больше компонента, тем больше света этого цвета.</p>
        <p><strong>CMYK</strong> показывает доли печатных красок. K добавляет общий чёрный и уменьшает расход цветных красок.</p>
        <p id="variant-explanation"><strong>HSV</strong> отделяет тон от насыщенности и яркости, поэтому цвет удобно подбирать визуально.</p>
      </div>
    </section>
  </main>
  <footer>Лабораторная работа №1 · Интерактивное преобразование цветовых моделей</footer>
`;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Не найден элемент ${selector}`);
  return element;
}

const colorPicker = requiredElement<HTMLInputElement>("#color-picker");
const hexInput = requiredElement<HTMLInputElement>("#hex-input");
const previewHex = requiredElement<HTMLSpanElement>("#preview-hex");
const variantCard = requiredElement<HTMLDivElement>("#variant-card");
const variantExplanation = requiredElement<HTMLParagraphElement>("#variant-explanation");

function valuesFor(model: Model): Record<string, number> {
  if (model === "rgb") return rgb;
  if (model === "cmyk") return rgbToCmyk(rgb);
  if (model === "hsv") return rgbToHsv(rgb);
  return rgbToHls(rgb);
}

function paintRange(input: HTMLInputElement, value: number): void {
  const min = Number(input.min);
  const max = Number(input.max);
  const percent = ((value - min) / (max - min)) * 100;
  input.style.setProperty("--range-progress", `${percent}%`);
}

function render(): void {
  const hex = rgbToHex(rgb);
  document.documentElement.style.setProperty("--selected-color", hex);
  colorPicker.value = hex;
  hexInput.value = hex;
  previewHex.textContent = hex;

  (["rgb", "cmyk", variant] as Model[]).forEach((model) => {
    const values = valuesFor(model);
    channels[model].forEach(({ key }) => {
      const value = round(values[key], model === "rgb" ? 0 : 1);
      const numberInput = document.querySelector<HTMLInputElement>(`#${model}-${key}-number`);
      const rangeInput = document.querySelector<HTMLInputElement>(`#${model}-${key}-range`);
      if (numberInput) numberInput.value = String(value);
      if (rangeInput) {
        rangeInput.value = String(value);
        paintRange(rangeInput, value);
      }
    });
  });

  document.querySelectorAll<HTMLElement>("[data-source-badge]").forEach((badge) => {
    badge.classList.toggle("is-visible", badge.dataset.sourceBadge === sourceModel);
  });

  document.querySelectorAll<HTMLButtonElement>(".swatch").forEach((swatch) => {
    swatch.classList.toggle("is-selected", swatch.dataset.hex === hex);
  });
}

function readModel(model: Model): Record<string, number> | null {
  const values: Record<string, number> = {};
  for (const { key } of channels[model]) {
    const input = document.querySelector<HTMLInputElement>(`#${model}-${key}-number`);
    if (!input || input.value.trim() === "") return null;
    const value = Number(input.value);
    if (!Number.isFinite(value)) return null;
    values[key] = value;
  }
  return values;
}

function updateFromModel(model: Model): void {
  const values = readModel(model);
  if (!values) return;

  sourceModel = model;
  if (model === "rgb") rgb = normalizeRgb(values as RGB);
  if (model === "cmyk") rgb = cmykToRgb(values as { c: number; m: number; y: number; k: number });
  if (model === "hsv") rgb = hsvToRgb(values as { h: number; s: number; v: number });
  if (model === "hls") rgb = hlsToRgb(values as { h: number; l: number; s: number });
  render();
}

function bindChannelInputs(container: ParentNode = document): void {
  container.querySelectorAll<HTMLInputElement>("[data-model][data-channel]").forEach((input) => {
    input.addEventListener("input", () => {
      const model = input.dataset.model as Model;
      const channel = input.dataset.channel;
      const kind = input.dataset.kind;
      if (!channel || !kind) return;

      const twinKind = kind === "range" ? "number" : "range";
      const twin = document.querySelector<HTMLInputElement>(
        `#${model}-${channel}-${twinKind}`,
      );
      if (twin) twin.value = input.value;
      updateFromModel(model);
    });
  });
}

function applyHex(value: string): void {
  const parsed = hexToRgb(value);
  if (!parsed) {
    hexInput.setAttribute("aria-invalid", "true");
    return;
  }
  hexInput.removeAttribute("aria-invalid");
  rgb = parsed;
  sourceModel = "palette";
  render();
}

colorPicker.addEventListener("input", () => applyHex(colorPicker.value));
hexInput.addEventListener("input", () => applyHex(hexInput.value));

document.querySelectorAll<HTMLButtonElement>(".swatch").forEach((swatch) => {
  swatch.addEventListener("click", () => applyHex(swatch.dataset.hex ?? ""));
});

document.querySelectorAll<HTMLButtonElement>("[data-variant]").forEach((button) => {
  button.addEventListener("click", () => {
    variant = button.dataset.variant as Variant;
    sourceModel = "palette";
    document.querySelectorAll<HTMLButtonElement>("[data-variant]").forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    variantCard.innerHTML = modelCard(variant);
    variantExplanation.innerHTML =
      variant === "hsv"
        ? "<strong>HSV</strong> отделяет тон от насыщенности и яркости, поэтому цвет удобно подбирать визуально."
        : "<strong>HLS</strong> отделяет тон от светлоты и насыщенности, сохраняя понятную шкалу от чёрного к белому.";
    bindChannelInputs(variantCard);
    render();
  });
});

bindChannelInputs();
render();
