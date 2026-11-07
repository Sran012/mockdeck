import { maxExportScale, type ExportScale, type Scene } from "@mockdeck/scene";
import type { EditorAction } from "./actions";
import {
  COALESCE_WINDOW_MS,
  HISTORY_LIMIT,
  type CoalesceMark,
  type EditorState,
} from "./state";

function clampExportScale(aspect: Scene["aspect"], scale: ExportScale): ExportScale {
  const max = maxExportScale(aspect);
  return scale > max ? max : scale;
}

function pushScene(
  state: EditorState,
  scene: Scene,
  lastCoalesce: CoalesceMark | null,
): EditorState {
  if (scene === state.scene) {
    return state;
  }

  const past = [...state.history.past, state.scene].slice(-HISTORY_LIMIT);
  const exportScale = clampExportScale(scene.aspect, state.ui.exportScale);

  return {
    ...state,
    scene,
    history: {
      past,
      future: [],
      lastCoalesce,
    },
    ui:
      exportScale === state.ui.exportScale
        ? state.ui
        : { ...state.ui, exportScale },
  };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "command/apply": {
      const next = action.command.apply(state.scene);
      if (next === state.scene) {
        return state;
      }

      const key = action.command.coalesceKey;
      const last = state.history.lastCoalesce;

      if (
        key !== undefined &&
        last !== null &&
        last.key === key &&
        action.at - last.at <= COALESCE_WINDOW_MS
      ) {
        return {
          ...state,
          scene: next,
          history: {
            ...state.history,
            lastCoalesce: { key, at: action.at },
          },
        };
      }

      return pushScene(
        state,
        next,
        key !== undefined ? { key, at: action.at } : null,
      );
    }

    case "scene/set":
      return pushScene(state, action.scene, null);

    case "scene/load": {
      const exportScale = clampExportScale(action.scene.aspect, state.ui.exportScale);
      return {
        ...state,
        scene: action.scene,
        history: {
          past: [],
          future: [],
          lastCoalesce: null,
        },
        ui:
          exportScale === state.ui.exportScale
            ? state.ui
            : { ...state.ui, exportScale },
      };
    }

    case "scene/undo": {
      const previous = state.history.past.at(-1);
      if (previous === undefined) {
        return state;
      }

      return {
        ...state,
        scene: previous,
        history: {
          past: state.history.past.slice(0, -1),
          future: [state.scene, ...state.history.future],
          lastCoalesce: null,
        },
      };
    }

    case "scene/redo": {
      const next = state.history.future[0];
      if (next === undefined) {
        return state;
      }

      return {
        ...state,
        scene: next,
        history: {
          past: [...state.history.past, state.scene].slice(-HISTORY_LIMIT),
          future: state.history.future.slice(1),
          lastCoalesce: null,
        },
      };
    }

    case "ui/selectPanel":
      if (state.ui.selectedPanel === action.panel) {
        return state;
      }
      return { ...state, ui: { ...state.ui, selectedPanel: action.panel } };

    case "ui/setExportScale": {
      const scale = clampExportScale(state.scene.aspect, action.scale);
      if (state.ui.exportScale === scale) {
        return state;
      }
      return { ...state, ui: { ...state.ui, exportScale: scale } };
    }

    case "asset/set": {
      if (state.assets.get(action.id) === action.asset) {
        return state;
      }
      const assets = new Map(state.assets);
      assets.set(action.id, action.asset);
      return { ...state, assets };
    }

    case "asset/remove": {
      if (!state.assets.has(action.id)) {
        return state;
      }
      const assets = new Map(state.assets);
      assets.delete(action.id);
      return { ...state, assets };
    }
  }
}
