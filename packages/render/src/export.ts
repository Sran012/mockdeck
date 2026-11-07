import { maxExportScale, type Scene } from "@mockdeck/scene";
import type { Assets, RenderTarget } from "./render";
import { renderScene } from "./render";

export type ExportTarget = RenderTarget & {
  convertToBlob?(options?: { type?: string }): Promise<Blob>;
  toBlob?(callback: (blob: Blob | null) => void, type?: string): void;
};

function defaultCanvas(): ExportTarget {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(1, 1);
  }

  if (typeof document !== "undefined") {
    return document.createElement("canvas");
  }

  throw new Error("Canvas is unavailable");
}

function canvasToBlob(canvas: ExportTarget): Promise<Blob> {
  if (typeof canvas.convertToBlob === "function") {
    return canvas.convertToBlob({ type: "image/png" });
  }

  if (typeof canvas.toBlob === "function") {
    return new Promise((resolve, reject) => {
      canvas.toBlob?.((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas export failed"));
        }
      }, "image/png");
    });
  }

  throw new Error("Canvas cannot export a blob");
}

export async function renderToBlob(
  scene: Scene,
  assets: Assets,
  scale: number,
  createCanvas: () => ExportTarget = defaultCanvas,
): Promise<Blob> {
  const target = createCanvas();
  const exportScale = Math.min(scale, maxExportScale(scene.aspect));

  renderScene(scene, assets, exportScale, target);

  return canvasToBlob(target);
}
