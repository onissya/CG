import "./styles.css";
import {
  cmykToRgb,
  hexToRgb,
  hlsToRgb,
  normalizeRgb,
  rgbToCmyk,
  rgbToHex,
  rgbToHls,
  round,
  type RGB,
} from "./color";

type Model = "rgb" | "cmyk" | "hls";

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
  hls: [
    { key: "h", name: "Тон", min: 0, max: 360, unit: "°" },
    { key: "l", name: "Светлота", min: 0, max: 100, unit: "%" },
    { key: "s", name: "Насыщенность", min: 0, max: 100, unit: "%" },
  ],
};

let rgb: RGB = { r: 103, g: 80, b: 164 };

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Корневой элемент #app не найден");

function channelRows(model: Model): string {
  return channels[model]
    .map(
      ({ key, name, min, max, unit }) => `
        <div class="channel-row">
          <label class="channel-label" for="${model}-${key}-number">
            <b>${key.toUpperCase()}</b>
            <span>${name}</span>
          </label>
          <input
            class="range-${model}-${key}"
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
          <div class="number-input">
            <input
              id="${model}-${key}-number"
              type="number"
              min="${min}"
              max="${max}"
              step="${model === "rgb" ? 1 : 0.1}"
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
    <section class="model-card" id="${model}-card">
      <h2>${model.toUpperCase()}</h2>
      <div class="channels">${channelRows(model)}</div>
    </section>`;
}

app.innerHTML = `
  <main>
    <header>
      <h1>Лабораторная 1: Цветовые модели</h1>
    </header>

    <section class="color-workbench" aria-label="Выбор цвета">
      <div class="color-preview" id="color-preview">
        <span id="preview-hex">#6750A4</span>
      </div>

      <div class="color-controls">
        <label class="palette-field">
          <span>ПАЛИТРА <small>Нажмите на поле, чтобы выбрать цвет</small></span>
          <input id="color-picker" type="color" value="#6750A4" title="Нажмите, чтобы открыть палитру" />
        </label>
        <label class="hex-field">
          <span>HEX</span>
          <input id="hex-input" type="text" value="#6750A4" maxlength="7" spellcheck="false" />
        </label>
      </div>

    </section>

    <section class="models-grid" aria-label="Компоненты цветовых моделей">
      ${modelCard("rgb")}
      ${modelCard("cmyk")}
      ${modelCard("hls")}
    </section>
  </main>
`;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Не найден элемент ${selector}`);
  return element;
}

const colorPicker = requiredElement<HTMLInputElement>("#color-picker");
const hexInput = requiredElement<HTMLInputElement>("#hex-input");
const previewHex = requiredElement<HTMLSpanElement>("#preview-hex");

function valuesFor(model: Model): Record<string, number> {
  if (model === "rgb") return rgb;
  if (model === "cmyk") return rgbToCmyk(rgb);
  return rgbToHls(rgb);
}

function render(): void {
  const hex = rgbToHex(rgb);
  document.documentElement.style.setProperty("--selected-color", hex);
  colorPicker.value = hex;
  hexInput.value = hex;
  previewHex.textContent = hex;

  (["rgb", "cmyk", "hls"] as Model[]).forEach((model) => {
    const values = valuesFor(model);
    channels[model].forEach(({ key }) => {
      const value = round(values[key], model === "rgb" ? 0 : 1);
      const numberInput = document.querySelector<HTMLInputElement>(`#${model}-${key}-number`);
      const rangeInput = document.querySelector<HTMLInputElement>(`#${model}-${key}-range`);
      if (numberInput) numberInput.value = String(value);
      if (rangeInput) rangeInput.value = String(value);
    });
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

  if (model === "rgb") rgb = normalizeRgb(values as RGB);
  if (model === "cmyk") rgb = cmykToRgb(values as { c: number; m: number; y: number; k: number });
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
      const twin = document.querySelector<HTMLInputElement>(`#${model}-${channel}-${twinKind}`);
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
  render();
}

colorPicker.addEventListener("input", () => applyHex(colorPicker.value));
hexInput.addEventListener("input", () => applyHex(hexInput.value));

bindChannelInputs();
render();
