import type { Background } from "@mockdeck/scene";
import type { ImageAsset } from "./assets";
import type { Rect } from "./layout";

type GradientBackground = Extract<Background, { kind: "gradient" }>;

export type GradientLike = {
  addColorStop(offset: number, color: string): void;
};

export type BackgroundContext = {
  save(): void;
  restore(): void;
  fillStyle: unknown;
  fillRect(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  rect(x: number, y: number, width: number, height: number): void;
  clip(): void;
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
  imageSmoothingEnabled?: boolean;
  imageSmoothingQuality?: "low" | "medium" | "high";
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): GradientLike;
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): GradientLike;
  createConicGradient(startAngle: number, x: number, y: number): GradientLike;
};

export type BlurContext = {
  imageSmoothingEnabled?: boolean;
  imageSmoothingQuality?: "low" | "medium" | "high";
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
};

export type BlurCanvas = {
  width: number;
  height: number;
  getContext(contextId: "2d"): BlurContext | null;
};

export type BackgroundOptions = {
  createCanvas?: (width: number, height: number) => BlurCanvas | null;
};

type ImageFit = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function addStops(gradient: GradientLike, background: GradientBackground): void {
  const stops = [...background.stops].sort((a, b) => a.at - b.at);
  for (const stop of stops) {
    gradient.addColorStop(stop.at, stop.color);
  }
}

function linearGradient(
  ctx: BackgroundContext,
  rect: Rect,
  background: GradientBackground,
): GradientLike {
  const theta = (background.angle * Math.PI) / 180;
  const dx = Math.sin(theta);
  const dy = -Math.cos(theta);
  const length = Math.abs(rect.width * dx) + Math.abs(rect.height * dy);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  const gradient = ctx.createLinearGradient(
    cx - (dx * length) / 2,
    cy - (dy * length) / 2,
    cx + (dx * length) / 2,
    cy + (dy * length) / 2,
  );
  addStops(gradient, background);
  return gradient;
}

function radialGradient(
  ctx: BackgroundContext,
  rect: Rect,
  background: GradientBackground,
): GradientLike {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const radius = Math.hypot(rect.width / 2, rect.height / 2);

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  addStops(gradient, background);
  return gradient;
}

function conicGradient(
  ctx: BackgroundContext,
  rect: Rect,
  background: GradientBackground,
): GradientLike {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const startAngle = ((background.angle - 90) * Math.PI) / 180;

  const gradient = ctx.createConicGradient(startAngle, cx, cy);
  addStops(gradient, background);
  return gradient;
}

function fitImage(
  rect: Rect,
  background: Extract<Background, { kind: "image" }>,
  image: ImageAsset,
): ImageFit {
  const scale =
    background.fit === "cover"
      ? Math.max(rect.width / image.width, rect.height / image.height)
      : Math.min(rect.width / image.width, rect.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}

function drawSharpImage(
  ctx: BackgroundContext,
  rect: Rect,
  fit: ImageFit,
  image: ImageAsset,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();
  ctx.drawImage(image, fit.x, fit.y, fit.width, fit.height);
  ctx.restore();
}

function defaultCreateCanvas(width: number, height: number): BlurCanvas | null {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  return null;
}

function drawBlurredImage(
  ctx: BackgroundContext,
  rect: Rect,
  background: Extract<Background, { kind: "image" }>,
  fit: ImageFit,
  image: ImageAsset,
  createCanvas: (width: number, height: number) => BlurCanvas | null,
): void {
  // Downscale the image, then upscale it back. This approximates a blur
  // without depending on ctx.filter, which is inconsistent across browsers.
  const factor = Math.max(1.5, background.blur);
  const width = Math.max(1, Math.round(rect.width / factor));
  const height = Math.max(1, Math.round(rect.height / factor));
  const canvas = createCanvas(width, height);
  const scratch = canvas?.getContext("2d");

  if (!canvas || !scratch) {
    drawSharpImage(ctx, rect, fit, image);
    return;
  }

  const scaleX = width / rect.width;
  const scaleY = height / rect.height;

  scratch.imageSmoothingEnabled = true;
  scratch.imageSmoothingQuality = "high";
  scratch.drawImage(
    image,
    (fit.x - rect.x) * scaleX,
    (fit.y - rect.y) * scaleY,
    fit.width * scaleX,
    fit.height * scaleY,
  );

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}

function imageBackground(
  ctx: BackgroundContext,
  rect: Rect,
  background: Extract<Background, { kind: "image" }>,
  image: ImageAsset,
  options: BackgroundOptions,
): void {
  const fit = fitImage(rect, background, image);

  if (background.blur <= 0) {
    drawSharpImage(ctx, rect, fit, image);
    return;
  }

  drawBlurredImage(
    ctx,
    rect,
    background,
    fit,
    image,
    options.createCanvas ?? defaultCreateCanvas,
  );
}

export function drawBackground(
  ctx: BackgroundContext,
  rect: Rect,
  background: Background,
  image?: ImageAsset,
  options: BackgroundOptions = {},
): void {
  if (background.kind === "transparent") {
    return;
  }

  if (background.kind === "image") {
    if (image != null) {
      imageBackground(ctx, rect, background, image, options);
    }
    return;
  }

  if (background.kind !== "solid" && background.kind !== "gradient") {
    return;
  }

  ctx.save();
  if (background.kind === "solid") {
    ctx.fillStyle = background.color;
  } else if (background.type === "linear") {
    ctx.fillStyle = linearGradient(ctx, rect, background);
  } else if (background.type === "radial") {
    ctx.fillStyle = radialGradient(ctx, rect, background);
  } else {
    ctx.fillStyle = conicGradient(ctx, rect, background);
  }
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}
