import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { drawCard, type CardContext } from "../src/card";

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

describe("drawCard", () => {
  it("is compatible with a real canvas context", () => {
    expectTypeOf<CanvasRenderingContext2D>().toExtend<CardContext>();
  });

  it("clips the card, draws the browser chrome, then the screenshot", () => {
    const ctx = fakeContext();

    drawCard(ctx, layout, 16, { type: "browser", theme: "dark", url: "your-site" }, image);

    expect(ctx.roundRect).toHaveBeenCalledWith(10, 20, 1000, 600, 16);
    expect(ctx.clip).toHaveBeenCalledOnce();
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 1000, 45);
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 10, 65, 1000, 555);
    expect(ctx.restore).toHaveBeenCalledTimes(2);

    const save = ctx.save.mock.invocationCallOrder[0]!;
    const clip = ctx.clip.mock.invocationCallOrder[0]!;
    const bar = ctx.fillRect.mock.invocationCallOrder[0]!;
    const screenshot = ctx.drawImage.mock.invocationCallOrder[0]!;
    const restore = ctx.restore.mock.invocationCallOrder.at(-1)!;

    expect(save).toBeLessThan(clip);
    expect(clip).toBeLessThan(bar);
    expect(bar).toBeLessThan(screenshot);
    expect(screenshot).toBeLessThan(restore);
  });

  it("skips chrome for a frameless card", () => {
    const ctx = fakeContext();

    drawCard(ctx, layout, 16, { type: "none" }, image);

    expect(ctx.clip).toHaveBeenCalledOnce();
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 10, 65, 1000, 555);
  });

  it("skips the clip when the radius is zero", () => {
    const ctx = fakeContext();

    drawCard(ctx, layout, 0, { type: "none" }, image);

    expect(ctx.roundRect).not.toHaveBeenCalled();
    expect(ctx.clip).not.toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledOnce();
  });

  it("keeps the chrome when the image is missing", () => {
    const ctx = fakeContext();

    drawCard(ctx, layout, 16, { type: "browser", theme: "light", url: "your-site" });

    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 1000, 45);
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("rejects frames it cannot draw", () => {
    const ctx = fakeContext();

    expect(() => drawCard(ctx, layout, 16, { type: "mac", theme: "dark" }, image)).toThrow(
      "Unsupported frame: mac",
    );
    expect(ctx.save).not.toHaveBeenCalled();
  });
});
