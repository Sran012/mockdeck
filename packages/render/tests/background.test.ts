import type { Background } from "@mockdeck/scene";
import { describe, expect, it, vi } from "vitest";
import {
  drawBackground,
  type BackgroundContext,
  type BlurCanvas,
  type BlurContext,
} from "../src/background";

const rect = { x: 10, y: 20, width: 200, height: 100 };

function fakeContext() {
  const gradient = { addColorStop: vi.fn() };
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: undefined,
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low" as const,
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

function fakeScratchCanvas() {
  const context: BlurContext = {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
    drawImage: vi.fn(),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn((_contextId: "2d") => context),
  } satisfies BlurCanvas;

  const createCanvas = vi.fn((width: number, height: number) => {
    canvas.width = width;
    canvas.height = height;
    return canvas;
  });

  return { canvas, context, createCanvas };
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

  it("skips backgrounds that need procedural assets", () => {
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

  it("covers the rect with a user image and clips the overflow", () => {
    const { ctx } = fakeContext();
    const image = { width: 400, height: 100 };
    const background: Background = {
      kind: "image",
      source: { type: "user", blobId: "bg" },
      fit: "cover",
      blur: 0,
    };

    drawBackground(ctx, rect, background, image);

    expect(ctx.rect).toHaveBeenCalledWith(10, 20, 200, 100);
    expect(ctx.clip).toHaveBeenCalledOnce();
    expect(ctx.drawImage).toHaveBeenCalledWith(image, -90, 20, 400, 100);
    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it("contains a user image inside the rect", () => {
    const { ctx } = fakeContext();
    const image = { width: 400, height: 100 };
    const background: Background = {
      kind: "image",
      source: { type: "user", blobId: "bg" },
      fit: "contain",
      blur: 0,
    };

    drawBackground(ctx, rect, background, image);

    expect(ctx.drawImage).toHaveBeenCalledWith(image, 10, 45, 200, 50);
  });

  it("blurs an image by downscaling and upscaling a scratch canvas", () => {
    const { ctx } = fakeContext();
    const { canvas, context, createCanvas } = fakeScratchCanvas();
    const image = { width: 400, height: 100 };
    const background: Background = {
      kind: "image",
      source: { type: "user", blobId: "bg" },
      fit: "cover",
      blur: 10,
    };

    drawBackground(ctx, rect, background, image, { createCanvas });

    expect(createCanvas).toHaveBeenCalledWith(20, 10);
    expect(context.imageSmoothingEnabled).toBe(true);
    expect(context.imageSmoothingQuality).toBe("high");
    expect(context.drawImage).toHaveBeenCalledWith(image, -10, 0, 40, 10);
    expect(ctx.imageSmoothingEnabled).toBe(true);
    expect(ctx.imageSmoothingQuality).toBe("high");
    expect(ctx.drawImage).toHaveBeenCalledWith(canvas, 10, 20, 200, 100);
    expect(ctx.clip).not.toHaveBeenCalled();
    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it("falls back to a sharp image when a scratch canvas is unavailable", () => {
    const { ctx } = fakeContext();
    const image = { width: 400, height: 100 };
    const background: Background = {
      kind: "image",
      source: { type: "user", blobId: "bg" },
      fit: "cover",
      blur: 10,
    };

    drawBackground(ctx, rect, background, image, {
      createCanvas: () => null,
    });

    expect(ctx.clip).toHaveBeenCalledOnce();
    expect(ctx.drawImage).toHaveBeenCalledWith(image, -90, 20, 400, 100);
  });

  it("skips an image background when the asset is missing", () => {
    const { ctx } = fakeContext();

    drawBackground(ctx, rect, {
      kind: "image",
      source: { type: "user", blobId: "missing" },
      fit: "cover",
      blur: 0,
    });

    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });
});
