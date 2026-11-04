import { ARTBOARD_SIZES, type Scene } from "@mockdeck/scene";
import { drawBackground, type BackgroundContext } from "./background";
import { drawCard, type CardContext } from "./card";
import { layoutCard } from "./layout";

export type Assets = {
  screenshot?: unknown;
};

export type SceneContext = BackgroundContext &
  CardContext & {
    scale(x: number, y: number): void;
  };

export type RenderTarget = {
  width: number;
  height: number;
  getContext(contextId: "2d"): SceneContext | null;
};

export function renderScene(
  scene: Scene,
  assets: Assets,
  scale: number,
  target: RenderTarget,
): void {
  const artboard = ARTBOARD_SIZES[scene.aspect];

  target.width = Math.round(artboard.width * scale);
  target.height = Math.round(artboard.height * scale);

  const ctx = target.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context is unavailable");
  }

  ctx.scale(scale, scale);
  drawBackground(ctx, { x: 0, y: 0, ...artboard }, scene.background);

  const layout = layoutCard(scene);
  if (layout) {
    drawCard(ctx, layout, scene.transform.radius, scene.frame, assets.screenshot);
  }
}
