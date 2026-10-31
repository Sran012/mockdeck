import type { Background } from "@mockdeck/scene";
import { describe, expect, it, vi } from "vitest";
import { drawBackground, type BackgroundContext } from "../src/background";

const rect = { x: 10, y: 20, width: 200, height: 100 };

function fakeContext() {
  const gradient = { addColorStop: vi.fn() };
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: undefined,
    fillRect: vi.fn(),
    createLinearGradient: vi.fn(
      (_x0: number, _y0: number, _x1: number, _y1: number) => gradient,
    ),
    createRadialGradient: vi.fn(
      (_x0: number, _y0: number, _r0: number, _x1: number, _y1: number, _r1: number) =>
        gradient,
    ),
    createConicGradient: vi.fn((_startAngle: number, _x: number, _y: number) => gradient),
  } satisfies BackgroundContext;

  return { ctx, gradient };
}

describe("drawBackground", () => {
  it("fills the rect with a solid color", () => {
    const { ctx } = fakeContext();

    drawBackground(ctx, rect, { kind: "solid", color: "#0f172a" });

    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.fillStyle).toBe("#0f172a");
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 200, 100);
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it("does nothing for a transparent background", () => {
    const { ctx } = fakeContext();

    drawBackground(ctx, rect, { kind: "transparent" });

    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it("draws a linear gradient using the CSS angle", () => {
    const { ctx, gradient } = fakeContext();
    const background: Background = {
      kind: "gradient",
      type: "linear",
      angle: 180,
      stops: [
        { at: 1, color: "#ffffff" },
        { at: 0, color: "#000000" },
      ],
    };

    drawBackground(ctx, rect, background);

    const [x0, y0, x1, y1] = ctx.createLinearGradient.mock.calls[0]!;
    expect(x0).toBeCloseTo(110);
    expect(y0).toBeCloseTo(20);
    expect(x1).toBeCloseTo(110);
    expect(y1).toBeCloseTo(120);
    expect(gradient.addColorStop.mock.calls).toEqual([
      [0, "#000000"],
      [1, "#ffffff"],
    ]);
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 200, 100);
  });

  it("draws a radial gradient to the farthest corner", () => {
    const { ctx } = fakeContext();
    const background: Background = {
      kind: "gradient",
      type: "radial",
      angle: 0,
      stops: [
        { at: 0, color: "#ffffff" },
        { at: 1, color: "#000000" },
      ],
    };

    drawBackground(ctx, rect, background);

    expect(ctx.createRadialGradient).toHaveBeenCalledWith(
      110,
      70,
      0,
      110,
      70,
      Math.hypot(100, 50),
    );
  });

  it("offsets a conic gradient from the top", () => {
    const { ctx } = fakeContext();
    const background: Background = {
      kind: "gradient",
      type: "conic",
      angle: 90,
      stops: [
        { at: 0, color: "#ffffff" },
        { at: 1, color: "#000000" },
      ],
    };

    drawBackground(ctx, rect, background);

    expect(ctx.createConicGradient).toHaveBeenCalledWith(0, 110, 70);
  });

  it("skips backgrounds that need assets", () => {
    const { ctx } = fakeContext();

    drawBackground(ctx, rect, {
      kind: "procedural",
      pattern: "noise",
      seed: 1,
      base: "#000000",
      intensity: 0.5,
    });

    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });
});
