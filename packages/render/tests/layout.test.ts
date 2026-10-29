import { defaultScene } from "@mockdeck/scene";
import { describe, expect, it } from "vitest";
import { layoutCard } from "../src/layout";

describe("layoutCard", () => {
  it("fits a browser card inside the padded content box", () => {
    const scene = defaultScene();
    scene.screenshot = { blobId: "shot", width: 1440, height: 900 };

    const layout = layoutCard(scene);

    expect(layout).not.toBeNull();
    expect(layout?.card.x).toBeCloseTo(291.94, 2);
    expect(layout?.card.y).toBeCloseTo(109.6, 2);
    expect(layout?.card.width).toBeCloseTo(1016.12, 2);
    expect(layout?.card.height).toBeCloseTo(680.8, 2);
    expect(layout?.screen.x).toBeCloseTo(291.94, 2);
    expect(layout?.screen.y).toBeCloseTo(155.325, 2);
    expect(layout?.screen.width).toBeCloseTo(1016.12, 2);
    expect(layout?.screen.height).toBeCloseTo(635.075, 2);
  });

  it("returns null without a screenshot", () => {
    const scene = defaultScene();

    expect(layoutCard(scene)).toBeNull();
  });
});
