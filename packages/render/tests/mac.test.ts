import { describe, expect, it, vi } from "vitest";
import type { ChromeContext } from "../src/chrome";
import { drawMacChrome, macBarColor } from "../src/mac";

const card = { x: 100, y: 50, width: 1000, height: 600 };

function fakeContext() {
  let style: unknown;
  const fills: unknown[] = [];

  const ctx = {
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
    fill: vi.fn(() => {
      fills.push(style);
    }),
    font: "",
    textAlign: "left" as const,
    textBaseline: "middle" as const,
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    fillText: vi.fn(),
  } satisfies ChromeContext;

  return { ctx, fills };
}

describe("drawMacChrome", () => {
  it("draws a dark title bar, traffic lights, and separator", () => {
    const { ctx, fills } = fakeContext();

    drawMacChrome(ctx, card, "dark");

    const barHeight = 30;
    const lineHeight = Math.max(1, barHeight * 0.04);

    expect(ctx.fillRect).toHaveBeenNthCalledWith(1, 100, 50, 1000, barHeight);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(
      2,
      100,
      50 + barHeight - lineHeight,
      1000,
      lineHeight,
    );
    expect(ctx.arc.mock.calls).toEqual([
      [116.5, 65, 4.8, 0, Math.PI * 2],
      [131.5, 65, 4.8, 0, Math.PI * 2],
      [146.5, 65, 4.8, 0, Math.PI * 2],
    ]);
    expect(fills).toEqual(["#ff5f57", "#febc2e", "#28c840"]);
    expect(ctx.fillStyle).toBe("#2e2e33");
    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it("uses the light palette while keeping the traffic lights", () => {
    const { ctx, fills } = fakeContext();

    drawMacChrome(ctx, card, "light");

    expect(macBarColor("light")).toBe("#ececf0");
    expect(fills).toEqual(["#ff5f57", "#febc2e", "#28c840"]);
    expect(ctx.fillStyle).toBe("#d6d6dc");
  });

  it("caps the bar at the card height", () => {
    const { ctx } = fakeContext();

    drawMacChrome(ctx, { ...card, height: 20 }, "dark");

    expect(ctx.fillRect).toHaveBeenNthCalledWith(1, 100, 50, 1000, 20);
  });

  it("skips empty rects", () => {
    const { ctx } = fakeContext();

    drawMacChrome(ctx, { ...card, width: 0 }, "dark");

    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });
});
