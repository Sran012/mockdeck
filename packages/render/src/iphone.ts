import type { Frame } from "@mockdeck/scene";
import type { ImageAsset } from "./assets";
import type { ChromeContext } from "./chrome";
import type { Rect } from "./layout";

export type IphoneColor = Extract<Frame, { type: "iphone" }>["color"];

type IphoneContext = ChromeContext & {
  clip(): void;
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
};

type IphonePalette = {
  body: string;
  rim: string;
};

export const PHONE_RADIUS_RATIO = 0.12;

const PALETTES: Record<IphoneColor, IphonePalette> = {
  black: {
    body: "#1c1c1e",
    rim: "#3a3a3c",
  },
  silver: {
    body: "#d9d9de",
    rim: "#b8b8bf",
  },
  natural: {
    body: "#b9b0a4",
    rim: "#9c9387",
  },
};

export function phoneBodyColor(color: IphoneColor): string {
  return PALETTES[color].body;
}

function drawIsland(ctx: IphoneContext, screen: Rect): void {
  const width = screen.width * 0.3;
  const height = width * 0.3;
  const x = screen.x + (screen.width - width) / 2;
  const y = screen.y + screen.height * 0.012;

  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, height / 2);
  ctx.fill();
}

export function drawIphoneScreen(
  ctx: IphoneContext,
  screen: Rect,
  bodyRadius: number,
  color: IphoneColor,
  image?: ImageAsset,
): void {
  if (screen.width <= 0 || screen.height <= 0) {
    return;
  }

  const palette = PALETTES[color];
  const screenRadius = bodyRadius * 0.75;
  const rim = Math.max(1, screen.width * 0.006);

  ctx.save();

  ctx.fillStyle = palette.rim;
  ctx.beginPath();
  ctx.roundRect(
    screen.x - rim,
    screen.y - rim,
    screen.width + rim * 2,
    screen.height + rim * 2,
    screenRadius + rim,
  );
  ctx.fill();

  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.roundRect(screen.x, screen.y, screen.width, screen.height, screenRadius);
  ctx.fill();
  ctx.clip();

  if (image != null) {
    const scale = Math.max(screen.width / image.width, screen.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;

    ctx.drawImage(
      image,
      screen.x + (screen.width - width) / 2,
      screen.y + (screen.height - height) / 2,
      width,
      height,
    );
  }

  ctx.restore();

  drawIsland(ctx, screen);
}
