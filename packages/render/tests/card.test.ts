import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { cardSurface, drawCard, type CardContext } from "../src/card";

const layout = {
  card: { x: 10, y: 20, width: 1000, height: 600 },
  screen: { x: 10, y: 65, width: 1000, height: 555 },
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

  it("uses a neutral surface for frameless cards", () => {
    expect(cardSurface({ type: "none" })).toBe("#ffffff");
  });

  it("rejects frames it cannot draw", () => {
    expect(() => cardSurface({ type: "iphone", color: "black" })).toThrow(
      "Unsupported frame: iphone",
    );
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

  it("rejects frames it cannot draw before touching the context", () => {
    const ctx = fakeContext();

    expect(() =>
      drawCard(ctx, layout, 16, { type: "iphone", color: "black" }, image),
    ).toThrow("Unsupported frame: iphone");
    expect(ctx.save).not.toHaveBeenCalled();
  });
});
