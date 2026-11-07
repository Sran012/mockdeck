import type { Scene } from "@mockdeck/scene";
import type { EditorState } from "./state";
import { editorReducer } from "./reducer";

export type Command = {
  id: string;
  apply(scene: Scene): Scene;
  coalesceKey?: string;
};

export function applyCommand(
  state: EditorState,
  command: Command,
  at: number = Date.now(),
): EditorState {
  return editorReducer(state, { type: "command/apply", command, at });
}
