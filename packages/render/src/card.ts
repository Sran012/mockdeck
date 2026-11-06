import type { Frame } from "@mockdeck/scene";
import { browserBarColor, drawBrowserChrome, type ChromeContext } from "./chrome";
import {
  drawIphoneScreen,
  phoneBodyColor,
  PHONE_RADIUS_RATIO,
} from "./iphone";
import type { CardLayout } from "./layout";
import { drawMacChrome, macBarColor } from "./mac";

export type CardContext = ChromeContext & {
  clip(): void;
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
};

export type Screenshot = {
  width: number;
  height: number;
};

const CARD_SURFACE = "#ffffff";

export function cardSurface(frame: Frame): string {
  switch (frame.type) {
    case "none":
      return CARD_SURFACE;
    case "browser":
      return browserBarColor(frame.theme);
    case "mac":
      return macBarColor(frame.theme);
    case "iphone":
      return phoneBodyColor(frame.color);
    default:
      throw new Error(`Unsupported frame: ${(frame as Frame).type}`);
  }
}

export function cardRadius(frame: Frame, cardWidth: number, radius: number): number {
  return frame.type === "iphone" ? Math.max(radius, cardWidth * PHONE_RADIUS_RATIO) : radius;
}

export function drawCard(
  ctx: CardContext,
  layout: CardLayout,
  radius: number,
  frame: Frame,
  image?: Screenshot,
): void {
  const surface = cardSurface(frame);
  const outerRadius = cardRadius(frame, layout.card.width, radius);

  ctx.save();

  if (outerRadius > 0) {
    ctx.beginPath();
    ctx.roundRect(
      layout.card.x,
      layout.card.y,
      layout.card.width,
      layout.card.height,
      outerRadius,
    );
    ctx.clip();
  }

  ctx.fillStyle = surface;
  ctx.fillRect(layout.card.x, layout.card.y, layout.card.width, layout.card.height);

  if (frame.type === "iphone") {
    drawIphoneScreen(ctx, layout.screen, outerRadius, frame.color, image);
  } else {
    if (frame.type === "browser") {
      drawBrowserChrome(ctx, layout.card, frame.theme, frame.url);
    } else if (frame.type === "mac") {
      drawMacChrome(ctx, layout.card, frame.theme);
    }

    if (image != null) {
      ctx.drawImage(
        image,
        layout.screen.x,
        layout.screen.y,
        layout.screen.width,
        layout.screen.height,
      );
    }
  }

  ctx.restore();
}
