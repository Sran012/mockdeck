import type { EditorState } from "./state";

export function canUndo(state: EditorState): boolean {
  return state.history.past.length > 0;
}

export function canRedo(state: EditorState): boolean {
  return state.history.future.length > 0;
}

export function screenshotAsset(state: EditorState): ImageBitmap | undefined {
  const id = state.scene.screenshot?.blobId;
  return id === undefined ? undefined : state.assets.get(id);
}

export function backgroundAsset(state: EditorState): ImageBitmap | undefined {
  const background = state.scene.background;
  if (background.kind !== "image") {
    return undefined;
  }

  const id =
    background.source.type === "user" ? background.source.blobId : background.source.id;
  return state.assets.get(id);
}

export function renderAssets(state: EditorState): {
  screenshot?: ImageBitmap;
  background?: ImageBitmap;
} {
  return {
    screenshot: screenshotAsset(state),
    background: backgroundAsset(state),
  };
}
