import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { drawBrowserChrome, type ChromeContext } from "../src/chrome";

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

describe("drawBrowserChrome", () => {
  it("is compatible with a real canvas context", () => {
    expectTypeOf<CanvasRenderingContext2D>().toExtend<ChromeContext>();
  });

  it("draws a dark bar, three dots, and a centered URL pill", () => {
    const { ctx, fills } = fakeContext();

    drawBrowserChrome(ctx, card, "dark", "your-site");

    expect(ctx.fillRect).toHaveBeenCalledWith(100, 50, 1000, 45);
    expect(ctx.arc.mock.calls).toEqual([
      [124.75, 72.5, 7.2, 0, Math.PI * 2],
      [147.25, 72.5, 7.2, 0, Math.PI * 2],
      [169.75, 72.5, 7.2, 0, Math.PI * 2],
    ]);
    const [pillX, pillY, pillW, pillH, pillRadius] = ctx.roundRect.mock.calls[0]!;
    expect(pillX).toBe(370);
    expect(pillY).toBe(60.8);
    expect(pillW).toBe(460);
    expect(pillH).toBeCloseTo(23.4);
    expect(pillRadius).toBeCloseTo(11.7);
    expect(fills).toEqual(["#ff5f57", "#febc2e", "#28c840", "#3a3a3c"]);
    expect(ctx.font).toBe("13.5px system-ui, sans-serif");
    const [text, textX, textY, maxWidth] = ctx.fillText.mock.calls[0]!;
    expect(text).toBe("your-site");
    expect(textX).toBe(600);
    expect(textY).toBe(72.5);
    expect(maxWidth).toBeCloseTo(447.4);
    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it("uses the light palette while keeping the traffic lights", () => {
    const { ctx, fills } = fakeContext();

    drawBrowserChrome(ctx, card, "light", "your-site");

    expect(ctx.fillRect).toHaveBeenCalledWith(100, 50, 1000, 45);
    expect(fills).toEqual(["#ff5f57", "#febc2e", "#28c840", "#ffffff"]);
    expect(ctx.fillStyle).toBe("#5f6368");
  });

  it("truncates a URL that does not fit the pill", () => {
    const { ctx } = fakeContext();

    drawBrowserChrome(ctx, card, "dark", "a".repeat(100));

    const [text] = ctx.fillText.mock.calls[0]!;
    expect(text).toHaveLength(63);
    expect(text?.endsWith("…")).toBe(true);
  });

  it("skips empty rects", () => {
    const { ctx } = fakeContext();

    drawBrowserChrome(ctx, { ...card, width: 0 }, "dark", "your-site");

    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });
});
