import {
  defaultScene,
  maxExportScale,
  type ExportScale,
  type Scene,
} from "@mockdeck/scene";

export type EditorAsset = ImageBitmap;

export type CoalesceMark = {
  key: string;
  at: number;
};

export type EditorState = {
  scene: Scene;
  history: {
    past: Scene[];
    future: Scene[];
    lastCoalesce: CoalesceMark | null;
  };
  ui: {
    selectedPanel: string;
    exportScale: ExportScale;
  };
  assets: Map<string, EditorAsset>;
};

export const HISTORY_LIMIT = 50;
export const COALESCE_WINDOW_MS = 400;

export function initialState(scene: Scene = defaultScene()): EditorState {
  return {
    scene,
    history: {
      past: [],
      future: [],
      lastCoalesce: null,
    },
    ui: {
      selectedPanel: "background",
      exportScale: maxExportScale(scene.aspect),
    },
    assets: new Map(),
  };
}
