import { defaultScene, maxExportScale } from "@mockdeck/scene";
import { describe, expect, it } from "vitest";
import {
  applyCommand,
  backgroundAsset,
  canRedo,
  canUndo,
  COALESCE_WINDOW_MS,
  editorReducer,
  HISTORY_LIMIT,
  initialState,
  renderAssets,
  screenshotAsset,
  type Command,
  type EditorState,
} from "../src";

function setPadding(state: EditorState, padding: number): EditorState {
  return editorReducer(state, {
    type: "scene/set",
    scene: {
      ...state.scene,
      transform: { ...state.scene.transform, padding },
    },
  });
}

describe("initialState", () => {
  it("starts with the default scene, no history, and no assets", () => {
    const state = initialState();

    expect(state.scene).toEqual(defaultScene());
    expect(state.history).toEqual({ past: [], future: [], lastCoalesce: null });
    expect(state.ui).toEqual({
      selectedPanel: "background",
      exportScale: maxExportScale("16:9"),
    });
    expect(state.assets.size).toBe(0);
  });
});

describe("scene history", () => {
  it("pushes the previous scene and undoes/redoes it", () => {
    const state = initialState();
    const first = {
      ...state.scene,
      transform: { ...state.scene.transform, padding: 10 },
    };
    const second = {
      ...state.scene,
      transform: { ...state.scene.transform, padding: 20 },
    };

    const afterFirst = editorReducer(state, { type: "scene/set", scene: first });
    const afterSecond = editorReducer(afterFirst, { type: "scene/set", scene: second });

    expect(afterSecond.scene).toBe(second);
    expect(afterSecond.history.past).toEqual([state.scene, first]);

    const undone = editorReducer(afterSecond, { type: "scene/undo" });
    expect(undone.scene).toBe(first);
    expect(undone.history.future).toEqual([second]);

    const redone = editorReducer(undone, { type: "scene/redo" });
    expect(redone.scene).toBe(second);
    expect(redone.history.past).toEqual([state.scene, first]);
  });

  it("clears the redo stack after a new change", () => {
    const state = initialState();
    const first = {
      ...state.scene,
      transform: { ...state.scene.transform, padding: 10 },
    };
    const second = {
      ...state.scene,
      transform: { ...state.scene.transform, padding: 20 },
    };
    const third = {
      ...state.scene,
      transform: { ...state.scene.transform, padding: 30 },
    };

    const undone = editorReducer(
      editorReducer(
        editorReducer(state, { type: "scene/set", scene: first }),
        { type: "scene/set", scene: second },
      ),
      { type: "scene/undo" },
    );
    const afterThird = editorReducer(undone, { type: "scene/set", scene: third });

    expect(afterThird.history.future).toEqual([]);
    expect(afterThird.scene).toBe(third);
  });

  it("ignores undo and redo at the edges", () => {
    const state = initialState();

    expect(editorReducer(state, { type: "scene/undo" })).toBe(state);
    expect(editorReducer(state, { type: "scene/redo" })).toBe(state);
  });

  it("ignores a scene set with the same reference", () => {
    const state = initialState();

    expect(editorReducer(state, { type: "scene/set", scene: state.scene })).toBe(state);
  });

  it("caps the past at the history limit", () => {
    let state = initialState();

    for (let index = 0; index < HISTORY_LIMIT + 10; index += 1) {
      state = setPadding(state, index);
    }

    expect(state.history.past).toHaveLength(HISTORY_LIMIT);

    for (let index = 0; index < HISTORY_LIMIT; index += 1) {
      state = editorReducer(state, { type: "scene/undo" });
    }

    expect(state.history.past).toHaveLength(0);
    expect(state.scene.transform.padding).toBe(9);
  });

  it("loads a scene without keeping history", () => {
    const state = setPadding(initialState(), 10);
    const loaded = { ...defaultScene(), aspect: "9:16" as const };

    const next = editorReducer(state, { type: "scene/load", scene: loaded });

    expect(next.scene).toBe(loaded);
    expect(next.history).toEqual({ past: [], future: [], lastCoalesce: null });
  });
});

describe("commands", () => {
  function paddingCommand(value: number): Command {
    return {
      id: "set-padding",
      coalesceKey: "padding",
      apply: (scene) => ({
        ...scene,
        transform: { ...scene.transform, padding: value },
      }),
    };
  }

  it("applies a command and records history", () => {
    const state = initialState();
    const next = applyCommand(state, paddingCommand(20), 1000);

    expect(next.scene.transform.padding).toBe(20);
    expect(next.history.past).toEqual([state.scene]);
    expect(next.history.lastCoalesce).toEqual({ key: "padding", at: 1000 });
  });

  it("coalesces the same key inside the window", () => {
    let state = applyCommand(initialState(), paddingCommand(10), 1000);

    state = applyCommand(state, paddingCommand(20), 1200);

    expect(state.history.past).toHaveLength(1);
    expect(state.scene.transform.padding).toBe(20);
    expect(state.history.lastCoalesce).toEqual({ key: "padding", at: 1200 });
  });

  it("does not coalesce after the window", () => {
    let state = applyCommand(initialState(), paddingCommand(10), 1000);

    state = applyCommand(state, paddingCommand(20), 1000 + COALESCE_WINDOW_MS + 1);

    expect(state.history.past).toHaveLength(2);
    expect(state.scene.transform.padding).toBe(20);
  });

  it("does not coalesce different keys", () => {
    const radius: Command = {
      id: "set-radius",
      coalesceKey: "radius",
      apply: (scene) => ({
        ...scene,
        transform: { ...scene.transform, radius: 24 },
      }),
    };
    let state = applyCommand(initialState(), paddingCommand(10), 1000);

    state = applyCommand(state, radius, 1100);

    expect(state.history.past).toHaveLength(2);
    expect(state.scene.transform.radius).toBe(24);
  });

  it("does not coalesce a command without a key", () => {
    const command: Command = {
      id: "set-padding",
      apply: paddingCommand(10).apply,
    };
    let state = applyCommand(initialState(), command, 1000);

    state = applyCommand(state, command, 1100);

    expect(state.history.past).toHaveLength(2);
    expect(state.history.lastCoalesce).toBeNull();
  });

  it("breaks coalescing after undo", () => {
    let state = applyCommand(initialState(), paddingCommand(10), 1000);
    state = editorReducer(state, { type: "scene/undo" });

    expect(state.history.lastCoalesce).toBeNull();

    state = applyCommand(state, paddingCommand(20), 1100);

    expect(state.history.lastCoalesce).toEqual({ key: "padding", at: 1100 });
    expect(state.history.past).toHaveLength(1);
  });

  it("breaks coalescing after a manual scene set", () => {
    let state = applyCommand(initialState(), paddingCommand(10), 1000);
    state = setPadding(state, 30);

    expect(state.history.lastCoalesce).toBeNull();

    state = applyCommand(state, paddingCommand(20), 1100);

    expect(state.history.past).toHaveLength(3);
  });
});

describe("ui state", () => {
  it("selects a panel without touching the scene", () => {
    const state = initialState();
    const next = editorReducer(state, { type: "ui/selectPanel", panel: "frame" });

    expect(next.ui.selectedPanel).toBe("frame");
    expect(next.scene).toBe(state.scene);
    expect(editorReducer(next, { type: "ui/selectPanel", panel: "frame" })).toBe(next);
  });

  it("clamps the export scale to the artboard limit", () => {
    const state = initialState();

    expect(editorReducer(state, { type: "ui/setExportScale", scale: 1 }).ui.exportScale).toBe(1);
    expect(editorReducer(state, { type: "ui/setExportScale", scale: 4 }).ui.exportScale).toBe(
      maxExportScale(state.scene.aspect),
    );
  });

  it("clamps the export scale when the scene aspect changes", () => {
    const state = initialState();
    const high = { ...state, ui: { ...state.ui, exportScale: 4 as const } };
    const scene = { ...defaultScene(), aspect: "9:16" as const };

    expect(editorReducer(high, { type: "scene/set", scene }).ui.exportScale).toBe(2);
    expect(editorReducer(high, { type: "scene/load", scene }).ui.exportScale).toBe(2);
  });
});

describe("selectors", () => {
  it("reports undo and redo availability", () => {
    const state = initialState();
    expect(canUndo(state)).toBe(false);

    const next = setPadding(state, 20);
    expect(canUndo(next)).toBe(true);
    expect(canRedo(next)).toBe(false);

    const undone = editorReducer(next, { type: "scene/undo" });
    expect(canUndo(undone)).toBe(false);
    expect(canRedo(undone)).toBe(true);
  });

  it("resolves screenshot and background assets", () => {
    const screenshot = { width: 100, height: 50 } as unknown as ImageBitmap;
    const background = { width: 200, height: 100 } as unknown as ImageBitmap;
    const scene = {
      ...defaultScene(),
      screenshot: { blobId: "shot", width: 100, height: 50 },
      background: {
        kind: "image" as const,
        source: { type: "user" as const, blobId: "bg" },
        fit: "cover" as const,
        blur: 0,
      },
    };
    let state = initialState(scene);
    state = editorReducer(state, { type: "asset/set", id: "shot", asset: screenshot });
    state = editorReducer(state, { type: "asset/set", id: "bg", asset: background });

    expect(screenshotAsset(state)).toBe(screenshot);
    expect(backgroundAsset(state)).toBe(background);
    expect(renderAssets(state)).toEqual({ screenshot, background });
  });

  it("resolves a builtin background by id", () => {
    const asset = { width: 10, height: 10 } as unknown as ImageBitmap;
    const scene = {
      ...defaultScene(),
      background: {
        kind: "image" as const,
        source: { type: "builtin" as const, id: "mesh" },
        fit: "contain" as const,
        blur: 0,
      },
    };
    let state = initialState(scene);
    state = editorReducer(state, { type: "asset/set", id: "mesh", asset });

    expect(backgroundAsset(state)).toBe(asset);
  });

  it("returns undefined when the asset is missing", () => {
    const scene = {
      ...defaultScene(),
      screenshot: { blobId: "missing", width: 100, height: 50 },
      background: {
        kind: "image" as const,
        source: { type: "user" as const, blobId: "missing-bg" },
        fit: "cover" as const,
        blur: 0,
      },
    };
    const state = initialState(scene);

    expect(screenshotAsset(state)).toBeUndefined();
    expect(backgroundAsset(state)).toBeUndefined();
    expect(renderAssets(state)).toEqual({ screenshot: undefined, background: undefined });
  });

  it("returns no background asset for a non-image background", () => {
    expect(backgroundAsset(initialState())).toBeUndefined();
  });
});

describe("assets", () => {
  it("stores and removes assets without touching scene history", () => {
    const state = initialState();
    const asset = { width: 100, height: 50 } as unknown as ImageBitmap;

    const withAsset = editorReducer(state, { type: "asset/set", id: "shot", asset });

    expect(withAsset.assets.get("shot")).toBe(asset);
    expect(state.assets.has("shot")).toBe(false);
    expect(withAsset.scene).toBe(state.scene);
    expect(withAsset.history).toEqual(state.history);
    expect(editorReducer(withAsset, { type: "asset/set", id: "shot", asset })).toBe(
      withAsset,
    );

    const removed = editorReducer(withAsset, { type: "asset/remove", id: "shot" });
    expect(removed.assets.has("shot")).toBe(false);
    expect(withAsset.assets.has("shot")).toBe(true);
    expect(editorReducer(state, { type: "asset/remove", id: "missing" })).toBe(state);
  });
});
