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

function imageBackground(
  ctx: BackgroundContext,
  rect: Rect,
  background: Extract<Background, { kind: "image" }>,
  image: ImageAsset,
): void {
  const scale =
    background.fit === "cover"
      ? Math.max(rect.width / image.width, rect.height / image.height)
      : Math.min(rect.width / image.width, rect.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = rect.x + (rect.width - width) / 2;
  const y = rect.y + (rect.height - height) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();
  ctx.drawImage(image, x, y, width, height);
  ctx.restore();
}

export function drawBackground(
  ctx: BackgroundContext,
  rect: Rect,
  background: Background,
  image?: ImageAsset,
): void {
  if (background.kind === "transparent") {
    return;
  }

  if (background.kind === "image") {
    if (image != null) {
      imageBackground(ctx, rect, background, image);
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
