import type { Frame } from "@mockdeck/scene";
import { BROWSER_BAR_RATIO, type Rect } from "./layout";

export type BrowserTheme = Extract<Frame, { type: "browser" }>["theme"];

const DOT_RADIUS = 0.16;
const DOT_INSET = 0.55;
const DOT_GAP = 0.5;
const PILL_WIDTH = 0.46;
const PILL_HEIGHT = 0.52;
const FONT_SIZE = 0.3;
const TEXT_INSET = 0.14;

type ChromePalette = {
  bar: string;
  pill: string;
  text: string;
};

const TRAFFIC_LIGHTS = ["#ff5f57", "#febc2e", "#28c840"] as const;

const PALETTES: Record<BrowserTheme, ChromePalette> = {
  dark: {
    bar: "#1c1c1e",
    pill: "#3a3a3c",
    text: "#98989f",
  },
  light: {
    bar: "#e9eaec",
    pill: "#ffffff",
    text: "#5f6368",
  },
};

export function browserBarColor(theme: BrowserTheme): string {
  return PALETTES[theme].bar;
}

export type ChromeContext = {
  save(): void;
  restore(): void;
  fillStyle: unknown;
  fillRect(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  roundRect(x: number, y: number, width: number, height: number, radii?: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  fill(): void;
  font: string;
  textAlign: "start" | "end" | "left" | "right" | "center";
  textBaseline: "top" | "hanging" | "middle" | "alphabetic" | "ideographic" | "bottom";
  measureText(text: string): { width: number };
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
};

export function drawTrafficLights(ctx: ChromeContext, rect: Rect, barHeight: number): void {
  const radius = barHeight * DOT_RADIUS;
  const centerY = rect.y + barHeight / 2;

  for (let index = 0; index < TRAFFIC_LIGHTS.length; index += 1) {
    const centerX = rect.x + barHeight * (DOT_INSET + index * DOT_GAP);
    ctx.fillStyle = TRAFFIC_LIGHTS[index];
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function fitText(ctx: ChromeContext, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let low = 0;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const probe = `${text.slice(0, middle)}…`;
    if (ctx.measureText(probe).width <= maxWidth) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return `${text.slice(0, low)}…`;
}

export function drawBrowserChrome(
  ctx: ChromeContext,
  rect: Rect,
  theme: BrowserTheme,
  url: string,
): void {
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const palette = PALETTES[theme];
  const barHeight = Math.min(rect.width * BROWSER_BAR_RATIO, rect.height);

  ctx.save();

  ctx.fillStyle = browserBarColor(theme);
  ctx.fillRect(rect.x, rect.y, rect.width, barHeight);

  drawTrafficLights(ctx, rect, barHeight);

  const pillWidth = rect.width * PILL_WIDTH;
  const pillHeight = barHeight * PILL_HEIGHT;
  const pillX = rect.x + (rect.width - pillWidth) / 2;
  const pillY = rect.y + (barHeight - pillHeight) / 2;

  ctx.fillStyle = palette.pill;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
  ctx.fill();

  if (url.length > 0) {
    const inset = barHeight * TEXT_INSET;
    const textWidth = pillWidth - inset * 2;

    ctx.fillStyle = palette.text;
    ctx.font = `${barHeight * FONT_SIZE}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      fitText(ctx, url, textWidth),
      pillX + pillWidth / 2,
      pillY + pillHeight / 2,
      textWidth,
    );
  }

  ctx.restore();
}
