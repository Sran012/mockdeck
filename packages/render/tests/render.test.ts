import { defaultScene } from "@mockdeck/scene";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { renderScene, type RenderTarget, type SceneContext } from "../src/render";

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
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createConicGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    scale: vi.fn(),
    font: "",
    textAlign: "left" as const,
    textBaseline: "middle" as const,
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    fillText: vi.fn(),
  } satisfies SceneContext;
}

function fakeTarget(ctx: SceneContext | null) {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn((_contextId: "2d") => ctx),
  } satisfies RenderTarget;
}

describe("renderScene", () => {
  it("is compatible with real canvas targets", () => {
    expectTypeOf<HTMLCanvasElement>().toExtend<RenderTarget>();
    expectTypeOf<OffscreenCanvas>().toExtend<RenderTarget>();
  });

  it("sizes the target, scales the context, and draws background then card", () => {
    const scene = defaultScene();
    scene.background = { kind: "solid", color: "#0f1115" };
    scene.screenshot = { blobId: "shot", width: 1440, height: 900 };

    const ctx = fakeContext();
    const target = fakeTarget(ctx);

    renderScene(scene, { screenshot: image }, 2, target);

    expect(target.width).toBe(3200);
    expect(target.height).toBe(1800);
    expect(ctx.scale).toHaveBeenCalledWith(2, 2);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1600, 900);
    expect(ctx.clip).toHaveBeenCalledOnce();
    expect(ctx.drawImage).toHaveBeenCalledOnce();

    const [, x, y, width, height] = ctx.drawImage.mock.calls[0]!;
    expect(x).toBeCloseTo(291.94, 1);
    expect(y).toBeCloseTo(155.33, 1);
    expect(width).toBeCloseTo(1016.12, 1);
    expect(height).toBeCloseTo(635.07, 1);

    const scale = ctx.scale.mock.invocationCallOrder[0]!;
    const background = ctx.fillRect.mock.invocationCallOrder[0]!;
    const clip = ctx.clip.mock.invocationCallOrder[0]!;
    const screenshot = ctx.drawImage.mock.invocationCallOrder[0]!;

    expect(scale).toBeLessThan(background);
    expect(background).toBeLessThan(clip);
    expect(clip).toBeLessThan(screenshot);
  });

  it("draws only the background without a screenshot", () => {
    const scene = defaultScene();
    scene.background = { kind: "solid", color: "#0f1115" };

    const ctx = fakeContext();
    const target = fakeTarget(ctx);

    renderScene(scene, {}, 1, target);

    expect(target.width).toBe(1600);
    expect(target.height).toBe(900);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1600, 900);
    expect(ctx.clip).not.toHaveBeenCalled();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("fails when the target has no 2D context", () => {
    const target = fakeTarget(null);

    expect(() => renderScene(defaultScene(), {}, 1, target)).toThrow(
      "2D canvas context is unavailable",
    );
  });
});
