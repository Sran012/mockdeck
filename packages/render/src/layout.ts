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

export const BROWSER_BAR_RATIO = 0.045;
export const MAC_BAR_RATIO = 0.03;
export const MAC_BEZEL_RATIO = 0.008;

const PHONE_BEZEL_X = 0.04;
const PHONE_BEZEL_Y = 0.023;
export const PHONE_SCREEN_RATIO = 19.5 / 9;

function frameRatios(frame: Frame): FrameRatios {
  switch (frame.type) {
    case "none":
      return { top: 0, right: 0, bottom: 0, left: 0 };
    case "browser":
      return { top: BROWSER_BAR_RATIO, right: 0, bottom: 0, left: 0 };
    case "mac":
      return {
        top: MAC_BAR_RATIO,
        right: MAC_BEZEL_RATIO,
        bottom: MAC_BEZEL_RATIO,
        left: MAC_BEZEL_RATIO,
      };
    case "iphone":
      return {
        top: PHONE_BEZEL_Y,
        right: PHONE_BEZEL_X,
        bottom: PHONE_BEZEL_Y,
        left: PHONE_BEZEL_X,
      };
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
  const screenRatio = scene.frame.type === "iphone" ? PHONE_SCREEN_RATIO : 1 / shotRatio;
  const cardRatio = ratios.top + ratios.bottom + (1 - ratios.left - ratios.right) * screenRatio;

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
  const screenH = screenW * screenRatio;
  const screen: Rect = {
    x: card.x + cardW * ratios.left,
    y: card.y + cardW * ratios.top,
    width: screenW,
    height: screenH,
  };

  return { card, screen };
}
