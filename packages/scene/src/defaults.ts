import { SCENE_VERSION, type Scene } from "./schema";

export function defaultScene(): Scene {
  return {
    version: SCENE_VERSION,
    aspect: "16:9",
    background: {
      kind: "gradient",
      type: "linear",
      angle: 135,
      stops: [
        { at: 0, color: "#0b0c0e" },
        { at: 1, color: "#1b2028" },
      ],
    },
    frame: { type: "browser", theme: "dark", url: "your-site" },
    screenshot: null,
    transform: {
      tiltX: 0,
      tiltY: 0,
      rotateZ: 0,
      scale: 0.92,
      padding: 80,
      radius: 16,
      shadow: { blur: 60, offsetY: 24, opacity: 0.45, color: "#000000" },
    },
  };
}
