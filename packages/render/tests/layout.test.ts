import { defaultScene } from "@mockdeck/scene";
import { describe, expect, it } from "vitest";
import { layoutCard, PHONE_SCREEN_RATIO } from "../src/layout";

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

  it("uses a fixed portrait card for iphone frames", () => {
    const scene = defaultScene();
    scene.frame = { type: "iphone", color: "black" };
    scene.screenshot = { blobId: "shot", width: 1440, height: 900 };

    const layout = layoutCard(scene);

    expect(layout).not.toBeNull();
    expect(layout?.card.x).toBeCloseTo(633.08, 2);
    expect(layout?.card.y).toBeCloseTo(109.6, 2);
    expect(layout?.card.width).toBeCloseTo(333.83, 2);
    expect(layout?.card.height).toBeCloseTo(680.8, 2);
    expect(layout?.screen.x).toBeCloseTo(646.44, 2);
    expect(layout?.screen.y).toBeCloseTo(117.28, 2);
    expect(layout?.screen.width).toBeCloseTo(307.13, 2);
    expect(layout?.screen.height).toBeCloseTo(665.44, 2);
    expect(layout!.screen.height / layout!.screen.width).toBeCloseTo(
      PHONE_SCREEN_RATIO,
      5,
    );
  });

  it("keeps the iphone shape for landscape and portrait screenshots", () => {
    const scene = defaultScene();
    scene.frame = { type: "iphone", color: "black" };
    scene.screenshot = { blobId: "shot", width: 1440, height: 900 };
    const landscape = layoutCard(scene);

    scene.screenshot = { blobId: "shot", width: 900, height: 1440 };
    const portrait = layoutCard(scene);

    expect(portrait?.card).toEqual(landscape?.card);
    expect(portrait?.screen).toEqual(landscape?.screen);
  });
});
