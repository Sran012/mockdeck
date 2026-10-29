import { ARTBOARD_SIZES, type Frame, type Scene } from "@mockdeck/scene";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CardLayout = {
  card: Rect;
  screen: Rect;
};

type FrameRatios = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

function frameRatios(frame: Frame): FrameRatios {
  switch (frame.type) {
    case "none":
      return { top: 0, right: 0, bottom: 0, left: 0 };
    case "browser":
      return { top: 0.045, right: 0, bottom: 0, left: 0 };
    case "mac":
      return { top: 0.03, right: 0.008, bottom: 0.008, left: 0.008 };
    case "iphone":
      return { top: 0.06, right: 0.06, bottom: 0.06, left: 0.06 };
  }
}

export function layoutCard(scene: Scene): CardLayout | null {
  const screenshot = scene.screenshot;
  if (!screenshot) {
    return null;
  }

  const artboard = ARTBOARD_SIZES[scene.aspect];
  const contentW = artboard.width - scene.transform.padding * 2;
  const contentH = artboard.height - scene.transform.padding * 2;
  const contentRatio = contentH / contentW;

  const ratios = frameRatios(scene.frame);
  const shotRatio = screenshot.width / screenshot.height;
  const cardRatio = ratios.top + ratios.bottom + (1 - ratios.left - ratios.right) / shotRatio;

  let cardW = contentW;
  let cardH = contentW * cardRatio;
  if (cardRatio > contentRatio) {
    cardH = contentH;
    cardW = cardH / cardRatio;
  }
  cardW *= scene.transform.scale;
  cardH *= scene.transform.scale;

  const card: Rect = {
    x: (artboard.width - cardW) / 2,
    y: (artboard.height - cardH) / 2,
    width: cardW,
    height: cardH,
  };

  const screenW = cardW * (1 - ratios.left - ratios.right);
  const screenH = screenW / shotRatio;
  const screen: Rect = {
    x: card.x + cardW * ratios.left,
    y: card.y + cardW * ratios.top,
    width: screenW,
    height: screenH,
  };

  return { card, screen };
}
