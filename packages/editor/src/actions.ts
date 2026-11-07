import type { ExportScale, Scene } from "@mockdeck/scene";
import type { Command } from "./commands";
import type { EditorAsset } from "./state";

export type EditorAction =
  | { type: "command/apply"; command: Command; at: number }
  | { type: "scene/set"; scene: Scene }
  | { type: "scene/load"; scene: Scene }
  | { type: "scene/undo" }
  | { type: "scene/redo" }
  | { type: "ui/selectPanel"; panel: string }
  | { type: "ui/setExportScale"; scale: ExportScale }
  | { type: "asset/set"; id: string; asset: EditorAsset }
  | { type: "asset/remove"; id: string };
