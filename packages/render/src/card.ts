import type { Frame } from "@mockdeck/scene";
import { browserBarColor, drawBrowserChrome, type ChromeContext } from "./chrome";
import type { CardLayout } from "./layout";

export type CardContext = ChromeContext & {
  clip(): void;
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
};

const CARD_SURFACE = "#ffffff";

export function cardSurface(frame: Frame): string {
  switch (frame.type) {
    case "none":
      return CARD_SURFACE;
    case "browser":
      return browserBarColor(frame.theme);
    default:
      throw new Error(`Unsupported frame: ${frame.type}`);
  }
}

export function drawCard(
  ctx: CardContext,
  layout: CardLayout,
  radius: number,
  frame: Frame,
  image?: unknown,
): void {
  const surface = cardSurface(frame);

  ctx.save();

  if (radius > 0) {
    ctx.beginPath();
    ctx.roundRect(
      layout.card.x,
      layout.card.y,
      layout.card.width,
      layout.card.height,
      radius,
    );
    ctx.clip();
  }

  ctx.fillStyle = surface;
  ctx.fillRect(layout.card.x, layout.card.y, layout.card.width, layout.card.height);

  if (frame.type === "browser") {
    drawBrowserChrome(ctx, layout.card, frame.theme, frame.url);
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

  ctx.restore();
}
