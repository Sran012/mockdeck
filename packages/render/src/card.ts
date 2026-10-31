import type { Frame } from "@mockdeck/scene";
import { drawBrowserChrome, type ChromeContext } from "./chrome";
import type { CardLayout } from "./layout";

export type CardContext = ChromeContext & {
  clip(): void;
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
};

export function drawCard(
  ctx: CardContext,
  layout: CardLayout,
  radius: number,
  frame: Frame,
  image?: unknown,
): void {
  if (frame.type !== "browser" && frame.type !== "none") {
    throw new Error(`Unsupported frame: ${frame.type}`);
  }

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
