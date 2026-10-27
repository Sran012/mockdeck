import type { Aspect } from "./schema";

export const ARTBOARD_SIZES: Record<Aspect, { width: number; height: number }> = {
  "16:9": { width: 1600, height: 900 },
  "1:1": { width: 1200, height: 1200 },
  "4:5": { width: 1200, height: 1500 },
  "9:16": { width: 900, height: 1600 },
};

export type ExportScale = 1 | 2 | 4;

export function maxExportScale(aspect: Aspect, maxPixels = 16_777_216): ExportScale {
  const { width, height } = ARTBOARD_SIZES[aspect];
  const basePixels = width * height;

  if (basePixels * 16 <= maxPixels) {
    return 4;
  }

  if (basePixels * 4 <= maxPixels) {
    return 2;
  }

  return 1;
}
