import type { Transform } from "@mockdeck/scene";
import { cardSurface } from "./card";
import type { Rect } from "./layout";

export type Shadow = Transform["shadow"];

export type ShadowContext = {
  save(): void;
  restore(): void;
  fillStyle: unknown;
  beginPath(): void;
  roundRect(x: number, y: number, width: number, height: number, radii?: number): void;
  fill(): void;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
};

function toRgba(color: string, opacity: number): string {
  const hex = color.slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const alpha = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;

  return `rgba(${red}, ${green}, ${blue}, ${alpha * opacity})`;
}

export function drawCardShadow(
  ctx: ShadowContext,
  rect: Rect,
  radius: number,
  shadow: Shadow,
  surface: string,
  scale: number,
): boolean {
  if (shadow.opacity <= 0 || (shadow.blur <= 0 && shadow.offsetY === 0)) {
    return false;
  }

  ctx.save();
  ctx.shadowColor = toRgba(shadow.color, shadow.opacity);
  ctx.shadowBlur = shadow.blur * scale;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = shadow.offsetY * scale;
  ctx.fillStyle = surface;
  ctx.beginPath();
  ctx.roundRect(
    rect.x * scale,
    rect.y * scale,
    rect.width * scale,
    rect.height * scale,
    radius * scale,
  );
  ctx.fill();
  ctx.restore();

  return true;
}
