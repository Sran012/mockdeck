import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { cardRadius, cardSurface, drawCard, type CardContext } from "../src/card";

const layout = {
  card: { x: 10, y: 20, width: 1000, height: 600 },
  screen: { x: 10, y: 65, width: 1000, height: 555 },
};

const phoneLayout = {
  card: { x: 100, y: 50, width: 300, height: 611.8 },
  screen: { x: 112, y: 56.9, width: 276, height: 598 },
};

const image = { width: 1440, height: 900 };

function fakeContext() {
  let style: unknown;

  return {
    save: vi.fn(),
    restore: vi.fn(),
    get fillStyle() {
      return style;
    },
    set fillStyle(value: unknown) {
      style = value;
    },
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    font: "",
    textAlign: "left" as const,
    textBaseline: "middle" as const,
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    fillText: vi.fn(),
  } satisfies CardContext;
}

describe("cardSurface", () => {
  it("uses the browser bar colour for browser frames", () => {
    expect(cardSurface({ type: "browser", theme: "dark", url: "" })).toBe("#1c1c1e");
    expect(cardSurface({ type: "browser", theme: "light", url: "" })).toBe("#e9eaec");
  });

  it("uses the mac bar colour for mac frames", () => {
    expect(cardSurface({ type: "mac", theme: "dark" })).toBe("#202024");
    expect(cardSurface({ type: "mac", theme: "light" })).toBe("#ececf0");
  });

  it("uses the iphone body colour for phone frames", () => {
    expect(cardSurface({ type: "iphone", color: "black" })).toBe("#1c1c1e");
    expect(cardSurface({ type: "iphone", color: "silver" })).toBe("#d9d9de");
    expect(cardSurface({ type: "iphone", color: "natural" })).toBe("#b9b0a4");
  });

  it("uses a neutral surface for frameless cards", () => {
    expect(cardSurface({ type: "none" })).toBe("#ffffff");
  });
});

describe("cardRadius", () => {
  it("gives iphone frames a phone-sized minimum radius", () => {
    expect(cardRadius({ type: "iphone", color: "black" }, 300, 16)).toBe(36);
    expect(cardRadius({ type: "iphone", color: "black" }, 300, 80)).toBe(80);
  });

  it("keeps the scene radius for other frames", () => {
    expect(cardRadius({ type: "browser", theme: "dark", url: "" }, 300, 16)).toBe(16);
  });
});

describe("drawCard", () => {
  it("is compatible with a real canvas context", () => {
    expectTypeOf<CanvasRenderingContext2D>().toExtend<CardContext>();
  });

  it("clips the card, fills its surface, draws chrome, then the screenshot", () => {
    const ctx = fakeContext();

    drawCard(ctx, layout, 16, { type: "browser", theme: "dark", url: "your-site" }, image);

    expect(ctx.roundRect).toHaveBeenCalledWith(10, 20, 1000, 600, 16);
    expect(ctx.clip).toHaveBeenCalledOnce();
    expect(ctx.fillRect).toHaveBeenNthCalledWith(1, 10, 20, 1000, 600);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(2, 10, 20, 1000, 45);
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 10, 65, 1000, 555);
    expect(ctx.restore).toHaveBeenCalledTimes(2);

    const save = ctx.save.mock.invocationCallOrder[0]!;
    const clip = ctx.clip.mock.invocationCallOrder[0]!;
    const surface = ctx.fillRect.mock.invocationCallOrder[0]!;
    const bar = ctx.fillRect.mock.invocationCallOrder[1]!;
    const screenshot = ctx.drawImage.mock.invocationCallOrder[0]!;
    const restore = ctx.restore.mock.invocationCallOrder.at(-1)!;

    expect(save).toBeLessThan(clip);
    expect(clip).toBeLessThan(surface);
    expect(surface).toBeLessThan(bar);
    expect(bar).toBeLessThan(screenshot);
    expect(screenshot).toBeLessThan(restore);
  });

  it("skips chrome for a frameless card", () => {
    const ctx = fakeContext();

    drawCard(ctx, layout, 16, { type: "none" }, image);

    expect(ctx.clip).toHaveBeenCalledOnce();
    expect(ctx.fillRect).toHaveBeenCalledOnce();
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 1000, 600);
    expect(ctx.fillStyle).toBe("#ffffff");
    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 10, 65, 1000, 555);
  });

  it("draws the mac window chrome and screenshot", () => {
    const ctx = fakeContext();

    drawCard(ctx, layout, 16, { type: "mac", theme: "dark" }, image);

    const barHeight = 1000 * 0.03;
    const lineHeight = Math.max(1, barHeight * 0.04);

    expect(ctx.clip).toHaveBeenCalledOnce();
    expect(ctx.fillRect).toHaveBeenNthCalledWith(1, 10, 20, 1000, 600);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(2, 10, 20, 1000, barHeight);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(
      3,
      10,
      20 + barHeight - lineHeight,
      1000,
      lineHeight,
    );
    expect(ctx.arc).toHaveBeenCalledTimes(3);
    expect(ctx.fillStyle).toBe("#2e2e33");
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 10, 65, 1000, 555);
    expect(ctx.restore).toHaveBeenCalledTimes(2);
  });

  it("draws the iphone body, screen, cover image, and dynamic island", () => {
    const ctx = fakeContext();

    drawCard(ctx, phoneLayout, 16, { type: "iphone", color: "black" }, image);

    const bodyRadius = 36;
    const screenRadius = bodyRadius * 0.75;
    const rim = Math.max(1, 276 * 0.006);

    expect(ctx.roundRect).toHaveBeenNthCalledWith(1, 100, 50, 300, 611.8, bodyRadius);
    expect(ctx.fillRect).toHaveBeenCalledWith(100, 50, 300, 611.8);
    expect(ctx.roundRect).toHaveBeenNthCalledWith(
      2,
      112 - rim,
      56.9 - rim,
      276 + rim * 2,
      598 + rim * 2,
      screenRadius + rim,
    );
    expect(ctx.roundRect).toHaveBeenNthCalledWith(3, 112, 56.9, 276, 598, screenRadius);
    expect(ctx.clip).toHaveBeenCalledTimes(2);

    const [, x, y, width, height] = ctx.drawImage.mock.calls[0]!;
    expect(x).toBeCloseTo(-228.4, 1);
    expect(y).toBeCloseTo(56.9, 1);
    expect(width).toBeCloseTo(956.8, 1);
    expect(height).toBeCloseTo(598, 1);

    const islandWidth = 276 * 0.3;
    const islandHeight = islandWidth * 0.3;
    const islandX = 112 + (276 - islandWidth) / 2;
    const islandY = 56.9 + 598 * 0.012;
    expect(ctx.roundRect).toHaveBeenNthCalledWith(
      4,
      islandX,
      islandY,
      islandWidth,
      islandHeight,
      islandHeight / 2,
    );
    expect(ctx.fillStyle).toBe("#000000");
    expect(ctx.restore).toHaveBeenCalledTimes(2);
  });

  it("keeps the iphone screen and island when the image is missing", () => {
    const ctx = fakeContext();

    drawCard(ctx, phoneLayout, 16, { type: "iphone", color: "silver" });

    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalledWith(100, 50, 300, 611.8);
    expect(ctx.clip).toHaveBeenCalledTimes(2);
    expect(ctx.fillStyle).toBe("#000000");
  });

  it("skips the clip when the radius is zero", () => {
    const ctx = fakeContext();

    drawCard(ctx, layout, 0, { type: "none" }, image);

    expect(ctx.roundRect).not.toHaveBeenCalled();
    expect(ctx.clip).not.toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalledOnce();
    expect(ctx.drawImage).toHaveBeenCalledOnce();
  });

  it("keeps the chrome when the image is missing", () => {
    const ctx = fakeContext();

    drawCard(ctx, layout, 16, { type: "browser", theme: "light", url: "your-site" });

    expect(ctx.fillRect).toHaveBeenNthCalledWith(1, 10, 20, 1000, 600);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(2, 10, 20, 1000, 45);
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });
});
