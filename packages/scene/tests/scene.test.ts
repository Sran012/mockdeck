import { describe, expect, it } from "vitest";
import { defaultScene } from "../src/defaults";
import { maxExportScale } from "../src/limits";
import { migrate } from "../src/migrate";
import { Scene } from "../src/schema";

describe("Scene", () => {
  it("accepts the default scene", () => {
    expect(Scene.safeParse(defaultScene()).success).toBe(true);
  });

  it("rejects an invalid color", () => {
    const scene = defaultScene();
    scene.background = { kind: "solid", color: "blue" };

    expect(Scene.safeParse(scene).success).toBe(false);
  });

  it("rejects an out-of-range transform", () => {
    const scene = defaultScene();
    scene.transform.tiltX = 90;

    expect(Scene.safeParse(scene).success).toBe(false);
  });

  it("round-trips JSON", () => {
    const scene = defaultScene();
    const parsed = Scene.parse(JSON.parse(JSON.stringify(scene)));

    expect(parsed).toEqual(scene);
  });
});

describe("migrate", () => {
  it("returns the current scene", () => {
    const scene = defaultScene();

    expect(migrate(scene)).toEqual(scene);
  });

  it("rejects an unsupported version", () => {
    expect(() => migrate({ ...defaultScene(), version: 2 })).toThrow(
      "Unsupported scene version",
    );
  });

  it("rejects a missing version", () => {
    expect(() => migrate({})).toThrow("missing version");
  });
});

describe("maxExportScale", () => {
  it("uses the iOS canvas limit by default", () => {
    expect(maxExportScale("16:9")).toBe(2);
  });

  it("allows 4x when the pixel budget is large enough", () => {
    expect(maxExportScale("16:9", 100_000_000)).toBe(4);
  });

  it("falls back to 1x when the budget is small", () => {
    expect(maxExportScale("16:9", 1_000_000)).toBe(1);
  });
});
