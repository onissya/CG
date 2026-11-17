import type {
  ImageMatrix,
  ImageMetrics,
  MorphologyKind,
  MorphologyOptions,
  SmoothingOptions,
} from "./types";

export function cloneImage(image: ImageMatrix): ImageMatrix {
  return {
    width: image.width,
    height: image.height,
    data: new Uint8ClampedArray(image.data),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pixelIndex(image: ImageMatrix, x: number, y: number, channel: number): number {
  const safeX = clamp(x, 0, image.width - 1);
  const safeY = clamp(y, 0, image.height - 1);
  return (safeY * image.width + safeX) * 4 + channel;
}

function makeKernel(options: SmoothingOptions): number[][] {
  const radius = Math.floor(options.windowSize / 2);
  const kernel: number[][] = [];
  const sigma = options.sigma ?? 1;
  let sum = 0;

  for (let y = -radius; y <= radius; y += 1) {
    const row: number[] = [];
    for (let x = -radius; x <= radius; x += 1) {
      const value =
        options.kind === "mean"
          ? 1
          : Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      row.push(value);
      sum += value;
    }
    kernel.push(row);
  }

  return kernel.map((row) => row.map((value) => value / sum));
}

export function applyLowPassFilter(image: ImageMatrix, options: SmoothingOptions): ImageMatrix {
  const radius = Math.floor(options.windowSize / 2);
  const kernel = makeKernel(options);
  const result = cloneImage(image);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const outputIndex = (y * image.width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        let value = 0;
        for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
          for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
            const weight = kernel[offsetY + radius][offsetX + radius];
            value += image.data[pixelIndex(image, x + offsetX, y + offsetY, channel)] * weight;
          }
        }
        result.data[outputIndex + channel] = Math.round(value);
      }
    }
  }

  return result;
}

function applyBasicMorphology(image: ImageMatrix, kind: "erosion" | "dilation", windowSize: 3 | 5): ImageMatrix {
  const radius = Math.floor(windowSize / 2);
  const result = cloneImage(image);
  const isErosion = kind === "erosion";

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const outputIndex = (y * image.width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        let value = isErosion ? 255 : 0;
        for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
          for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
            const neighbor = image.data[pixelIndex(image, x + offsetX, y + offsetY, channel)];
            value = isErosion ? Math.min(value, neighbor) : Math.max(value, neighbor);
          }
        }
        result.data[outputIndex + channel] = value;
      }
    }
  }

  return result;
}

export function applyMorphology(image: ImageMatrix, options: MorphologyOptions): ImageMatrix {
  if (options.kind === "erosion" || options.kind === "dilation") {
    return applyBasicMorphology(image, options.kind, options.windowSize);
  }

  if (options.kind === "opening") {
    return applyBasicMorphology(
      applyBasicMorphology(image, "erosion", options.windowSize),
      "dilation",
      options.windowSize,
    );
  }

  return applyBasicMorphology(
    applyBasicMorphology(image, "dilation", options.windowSize),
    "erosion",
    options.windowSize,
  );
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function calculateMetrics(image: ImageMatrix): ImageMetrics {
  const values: number[] = [];
  let min = 255;
  let max = 0;

  for (let index = 0; index < image.data.length; index += 4) {
    const value = luminance(image.data[index], image.data[index + 1], image.data[index + 2]);
    values.push(value);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return { mean, standardDeviation: Math.sqrt(variance), min, max };
}

export function getOperationTitle(kind: MorphologyKind): string {
  return {
    erosion: "Эрозия",
    dilation: "Дилатация",
    opening: "Открытие",
    closing: "Закрытие",
  }[kind];
}
