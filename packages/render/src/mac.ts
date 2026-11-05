import type { Frame } from "@mockdeck/scene";
import { drawTrafficLights, type ChromeContext } from "./chrome";
import { MAC_BAR_RATIO, type Rect } from "./layout";

export type MacTheme = Extract<Frame, { type: "mac" }>["theme"];

type MacPalette = {
  bar: string;
  line: string;
};

const PALETTES: Record<MacTheme, MacPalette> = {
  dark: {
    bar: "#202024",
    line: "#2e2e33",
  },
  light: {
    bar: "#ececf0",
    line: "#d6d6dc",
  },
};

export function macBarColor(theme: MacTheme): string {
  return PALETTES[theme].bar;
}

export function drawMacChrome(ctx: ChromeContext, rect: Rect, theme: MacTheme): void {
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const barHeight = Math.min(rect.width * MAC_BAR_RATIO, rect.height);
  const lineHeight = Math.max(1, barHeight * 0.04);

  ctx.save();

  ctx.fillStyle = macBarColor(theme);
  ctx.fillRect(rect.x, rect.y, rect.width, barHeight);

  drawTrafficLights(ctx, rect, barHeight);

  ctx.fillStyle = PALETTES[theme].line;
  ctx.fillRect(rect.x, rect.y + barHeight - lineHeight, rect.width, lineHeight);

  ctx.restore();
}
