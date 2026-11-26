import type { ImageMatrix, MorphologyOptions, SmoothingOptions } from "./types";

export interface SampleImage {
  id: string;
  title: string;
  description: string;
  badge: string;
  imagePath: string;
  smoothing: SmoothingOptions;
  morphology: MorphologyOptions;
}

const MAXIMUM_DIMENSION = 900;

export const samples: SampleImage[] = [
  {
    id: "landscape",
    title: "Пейзаж",
    description: "Обычная фотография для проверки сглаживания шума и мелких деталей.",
    badge: "фото",
    imagePath: "/images/landscape-public-domain.jpg",
    smoothing: { kind: "mean", windowSize: 3 },
    morphology: { kind: "opening", windowSize: 3 },
  },
  {
    id: "sunset",
    title: "Закат",
    description: "Фотография с плавными переходами для сравнения среднего и гауссова фильтров.",
    badge: "фото",
    imagePath: "/images/sunset-public-domain.jpg",
    smoothing: { kind: "gaussian", windowSize: 5, sigma: 1.2 },
    morphology: { kind: "closing", windowSize: 3 },
  },
  {
    id: "shapes",
    title: "Простые фигуры",
    description: "Чёрно-белое изображение с фигурами для проверки эрозии и дилатации.",
    badge: "морфология",
    imagePath: "/images/simple-shapes-public-domain.png",
    smoothing: { kind: "mean", windowSize: 3 },
    morphology: { kind: "closing", windowSize: 3 },
  },
];

function matrixFromImage(image: HTMLImageElement): ImageMatrix {
  const scale = Math.min(1, MAXIMUM_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D недоступен в этом браузере");
  context.drawImage(image, 0, 0, width, height);
  return { width, height, data: context.getImageData(0, 0, width, height).data };
}

export async function loadImageMatrix(path: string): Promise<ImageMatrix> {
  const image = new Image();
  image.src = path;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Не удалось загрузить изображение ${path}`));
  });
  return matrixFromImage(image);
}
