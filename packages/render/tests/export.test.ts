import { defaultScene } from "@mockdeck/scene";
import { describe, expect, it, vi } from "vitest";
import { renderToBlob, type ExportTarget } from "../src/export";
import type { SceneContext } from "../src/render";

function solidScene() {
  const scene = defaultScene();
  scene.background = { kind: "solid", color: "#000000" };
  return scene;
}

function fakeContext(): SceneContext {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
  } as unknown as SceneContext;
}

function target(overrides: Partial<ExportTarget>): ExportTarget {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => fakeContext()),
    ...overrides,
  };
}

describe("renderToBlob", () => {
  it("renders a PNG blob and clamps the export scale", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const toBlob = vi.fn((callback: (value: Blob | null) => void) => callback(blob));
    const canvas = target({ toBlob });

    await expect(renderToBlob(solidScene(), {}, 4, () => canvas)).resolves.toBe(blob);

    expect(canvas.width).toBe(3200);
    expect(canvas.height).toBe(1800);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
  });

  it("prefers convertToBlob on offscreen canvases", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const convertToBlob = vi.fn(async () => blob);
    const toBlob = vi.fn();
    const canvas = target({ convertToBlob, toBlob });

    await expect(renderToBlob(solidScene(), {}, 1, () => canvas)).resolves.toBe(blob);

    expect(convertToBlob).toHaveBeenCalledWith({ type: "image/png" });
    expect(toBlob).not.toHaveBeenCalled();
  });

  it("rejects when the canvas produces no blob", async () => {
    const canvas = target({
      toBlob: (callback) => callback(null),
    });

    await expect(renderToBlob(solidScene(), {}, 1, () => canvas)).rejects.toThrow(
      "Canvas export failed",
    );
  });

  it("rejects when the canvas has no blob export", async () => {
    const canvas = target({});

    await expect(renderToBlob(solidScene(), {}, 1, () => canvas)).rejects.toThrow(
      "Canvas cannot export a blob",
    );
  });
});
