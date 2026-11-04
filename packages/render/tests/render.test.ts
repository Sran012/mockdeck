import { defaultScene } from "@mockdeck/scene";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { renderScene, type RenderTarget, type SceneContext } from "../src/render";

const image = { width: 1440, height: 900 };

function fakeContext() {
  let style: unknown;
  let composite: string = "source-over";
  const compositeChanges: string[] = [];

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
    get globalCompositeOperation() {
      return composite;
    },
    set globalCompositeOperation(value: string) {
      composite = value;
      compositeChanges.push(value);
    },
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    font: "",
    textAlign: "left" as const,
    textBaseline: "middle" as const,
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    fillText: vi.fn(),
  } satisfies SceneContext;

  return Object.assign(ctx, { compositeChanges });
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

  it("draws the shadow in device pixels before scaling the scene", () => {
    const scene = defaultScene();
    scene.background = { kind: "solid", color: "#0f1115" };
    scene.screenshot = { blobId: "shot", width: 1440, height: 900 };

    const ctx = fakeContext();
    const target = fakeTarget(ctx);

    renderScene(scene, { screenshot: image }, 2, target);

    expect(target.width).toBe(3200);
    expect(target.height).toBe(1800);
    expect(ctx.shadowColor).toBe("rgba(0, 0, 0, 0.45)");
    expect(ctx.shadowBlur).toBe(120);
    expect(ctx.shadowOffsetY).toBe(48);
    expect(ctx.scale).toHaveBeenCalledWith(2, 2);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1600, 900);
    expect(ctx.clip).toHaveBeenCalledOnce();
    expect(ctx.drawImage).toHaveBeenCalledOnce();

    const [, x, y, width, height] = ctx.drawImage.mock.calls[0]!;
    expect(x).toBeCloseTo(291.94, 1);
    expect(y).toBeCloseTo(155.33, 1);
    expect(width).toBeCloseTo(1016.12, 1);
    expect(height).toBeCloseTo(635.07, 1);

    const shadowFill = ctx.fill.mock.invocationCallOrder[0]!;
    const scale = ctx.scale.mock.invocationCallOrder[0]!;
    const background = ctx.fillRect.mock.invocationCallOrder[0]!;
    const clip = ctx.clip.mock.invocationCallOrder[0]!;
    const screenshot = ctx.drawImage.mock.invocationCallOrder[0]!;

    expect(shadowFill).toBeLessThan(scale);
    expect(scale).toBeLessThan(background);
    expect(background).toBeLessThan(clip);
    expect(clip).toBeLessThan(screenshot);
    expect(ctx.compositeChanges).toEqual(["destination-over", "source-over"]);
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
    expect(ctx.fill).not.toHaveBeenCalled();
    expect(ctx.clip).not.toHaveBeenCalled();
    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(ctx.compositeChanges).toEqual([]);
  });

  it("skips the shadow when its opacity is zero", () => {
    const scene = defaultScene();
    scene.background = { kind: "solid", color: "#0f1115" };
    scene.screenshot = { blobId: "shot", width: 1440, height: 900 };
    scene.transform.shadow.opacity = 0;

    const ctx = fakeContext();
    const target = fakeTarget(ctx);

    renderScene(scene, { screenshot: image }, 1, target);

    expect(ctx.shadowColor).toBe("");
    expect(ctx.shadowBlur).toBe(0);
    expect(ctx.compositeChanges).toEqual([]);
    expect(ctx.drawImage).toHaveBeenCalledOnce();
  });

  it("fails when the target has no 2D context", () => {
    const target = fakeTarget(null);

    expect(() => renderScene(defaultScene(), {}, 1, target)).toThrow(
      "2D canvas context is unavailable",
    );
  });
});
