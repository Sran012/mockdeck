import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { drawCardShadow, type ShadowContext } from "../src/shadow";

const rect = { x: 10, y: 20, width: 1000, height: 600 };
const shadow = { blur: 60, offsetY: 24, opacity: 0.45, color: "#000000" };

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
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  } satisfies ShadowContext;
}

describe("drawCardShadow", () => {
  it("is compatible with a real canvas context", () => {
    expectTypeOf<CanvasRenderingContext2D>().toExtend<ShadowContext>();
  });

  it("draws a scaled rounded shadow in device pixels", () => {
    const ctx = fakeContext();

    const drawn = drawCardShadow(ctx, rect, 16, shadow, "#1c1c1e", 2);

    expect(drawn).toBe(true);
    expect(ctx.roundRect).toHaveBeenCalledWith(20, 40, 2000, 1200, 32);
    expect(ctx.fillStyle).toBe("#1c1c1e");
    expect(ctx.shadowColor).toBe("rgba(0, 0, 0, 0.45)");
    expect(ctx.shadowBlur).toBe(120);
    expect(ctx.shadowOffsetX).toBe(0);
    expect(ctx.shadowOffsetY).toBe(48);
    expect(ctx.fill).toHaveBeenCalledOnce();
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it("multiplies alpha from the colour and the shadow opacity", () => {
    const ctx = fakeContext();

    drawCardShadow(ctx, rect, 16, { ...shadow, color: "#00000080", opacity: 0.5 }, "#fff", 1);

    expect(ctx.shadowColor).toBe(`rgba(0, 0, 0, ${(128 / 255) * 0.5})`);
  });

  it("skips a fully transparent shadow", () => {
    const ctx = fakeContext();

    const drawn = drawCardShadow(ctx, rect, 16, { ...shadow, opacity: 0 }, "#fff", 1);

    expect(drawn).toBe(false);
    expect(ctx.save).not.toHaveBeenCalled();
  });

  it("skips a shadow with no blur and no offset", () => {
    const ctx = fakeContext();

    const drawn = drawCardShadow(ctx, rect, 16, { ...shadow, blur: 0, offsetY: 0 }, "#fff", 1);

    expect(drawn).toBe(false);
    expect(ctx.save).not.toHaveBeenCalled();
  });

  it("keeps a hard shadow when only the offset is set", () => {
    const ctx = fakeContext();

    const drawn = drawCardShadow(ctx, rect, 0, { ...shadow, blur: 0 }, "#fff", 1);

    expect(drawn).toBe(true);
    expect(ctx.shadowBlur).toBe(0);
    expect(ctx.shadowOffsetY).toBe(24);
  });
});
