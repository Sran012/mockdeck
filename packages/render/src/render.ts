import { ARTBOARD_SIZES, type Scene } from "@mockdeck/scene";
import { drawBackground, type BackgroundContext } from "./background";
import { cardSurface, drawCard, type CardContext } from "./card";
import { layoutCard } from "./layout";
import { drawCardShadow, type ShadowContext } from "./shadow";

export type Assets = {
  screenshot?: unknown;
};

export type SceneContext = BackgroundContext &
  CardContext &
  ShadowContext & {
    scale(x: number, y: number): void;
    globalCompositeOperation: string;
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

  const layout = layoutCard(scene);
  const cardLayout =
    layout !== null && (assets.screenshot != null || scene.frame.type === "browser")
      ? layout
      : null;
  let shadowDrawn = false;

  if (cardLayout) {
    shadowDrawn = drawCardShadow(
      ctx,
      cardLayout.card,
      scene.transform.radius,
      scene.transform.shadow,
      cardSurface(scene.frame),
      scale,
    );
  }

  if (shadowDrawn) {
    ctx.globalCompositeOperation = "destination-over";
  }

  ctx.scale(scale, scale);
  drawBackground(ctx, { x: 0, y: 0, ...artboard }, scene.background);

  if (shadowDrawn) {
    ctx.globalCompositeOperation = "source-over";
  }

  if (cardLayout) {
    drawCard(ctx, cardLayout, scene.transform.radius, scene.frame, assets.screenshot);
  }
}
