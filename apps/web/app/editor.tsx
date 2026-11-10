"use client";

import {
  canRedo,
  canUndo,
  editorReducer,
  hashBlob,
  initialState,
  renderAssets,
  type Command,
} from "@mockdeck/editor";
import { renderScene, renderToBlob } from "@mockdeck/render";
import {
  ARTBOARD_SIZES,
  ASPECTS,
  maxExportScale,
  type Aspect,
  type ExportScale,
  type Frame,
  type Scene,
} from "@mockdeck/scene";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

const ACCEPTED = new Set(["image/jpg", "image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;

function imageFromTransfer(data: DataTransfer | null): File | null {
  if (!data) {
    return null;
  }

  for (const item of Array.from(data.items)) {
    if (item.kind === "file" && ACCEPTED.has(item.type)) {
      const file = item.getAsFile();
      if (file) {
        return file;
      }
    }
  }

  return Array.from(data.files).find((file) => ACCEPTED.has(file.type)) ?? null;
}

function frameFor(type: Frame["type"], current: Frame): Frame {
  switch (type) {
    case "none":
      return { type: "none" };
    case "browser":
      return {
        type: "browser",
        theme: current.type === "browser" ? current.theme : "dark",
        url: current.type === "browser" ? current.url : "your-site",
      };
    case "mac":
      return {
        type: "mac",
        theme: current.type === "mac" ? current.theme : "dark",
      };
    case "iphone":
      return {
        type: "iphone",
        color: current.type === "iphone" ? current.color : "black",
      };
  }
}

export function Editor() {
  const [state, dispatch] = useReducer(editorReducer, undefined, () => initialState());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const loadToken = useRef(0);

  const updateScene = (scene: Scene) => {
    dispatch({ type: "scene/set", scene });
  };

  const loadFile = useCallback(async (file: File) => {
    const token = ++loadToken.current;
    setError(null);
    setBusy(true);

    try {
      if (!ACCEPTED.has(file.type)) {
        throw new Error("Use a PNG, JPEG, or WebP image.");
      }

      if (file.size > MAX_BYTES) {
        throw new Error("Image must be 20 MB or smaller.");
      }

      const blobId = await hashBlob(file);
      if (token !== loadToken.current) {
        return;
      }

      const bitmap = await createImageBitmap(file);
      if (token !== loadToken.current) {
        bitmap.close();
        return;
      }

      if (bitmap.width * bitmap.height > MAX_PIXELS) {
        bitmap.close();
        throw new Error("Image is too large. Use 40 megapixels or less.");
      }

      dispatch({ type: "asset/set", id: blobId, asset: bitmap });
      const command: Command = {
        id: "set-screenshot",
        apply: (scene) => ({
          ...scene,
          screenshot: { blobId, width: bitmap.width, height: bitmap.height },
        }),
      };
      dispatch({ type: "command/apply", command, at: Date.now() });
    } catch (cause) {
      if (token === loadToken.current) {
        setError(cause instanceof Error ? cause.message : "Could not read that image.");
      }
    } finally {
      if (token === loadToken.current) {
        setBusy(false);
      }
    }
  }, []);

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const file = imageFromTransfer(event.clipboardData);
      if (!file) {
        return;
      }

      event.preventDefault();
      void loadFile(file);
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [loadFile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      renderScene(state.scene, renderAssets(state), 1, canvas);
    });

    return () => cancelAnimationFrame(frame);
  }, [state.scene, state.assets]);

  const shot = state.scene.screenshot;
  const artboard = ARTBOARD_SIZES[state.scene.aspect];
  const maxScale = maxExportScale(state.scene.aspect);
  const scaleOptions = ([1, 2, 4] as ExportScale[]).filter((scale) => scale <= maxScale);

  function openPicker() {
    fileInputRef.current?.click();
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file) {
      void loadFile(file);
    }
  }

  function onUrlChange(url: string) {
    const command: Command = {
      id: "set-browser-url",
      coalesceKey: "browser-url",
      apply: (scene) =>
        scene.frame.type === "browser"
          ? { ...scene, frame: { ...scene.frame, url } }
          : scene,
    };

    dispatch({ type: "command/apply", command, at: Date.now() });
  }

  async function onDownload() {
    if (!shot) {
      return;
    }

    setError(null);
    setExporting(true);

    try {
      const blob = await renderToBlob(state.scene, renderAssets(state), state.ui.exportScale);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mockdeck.png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current -= 1;

    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);

    const file = imageFromTransfer(event.dataTransfer);
    if (file) {
      void loadFile(file);
    } else {
      setError("Drop a PNG, JPEG, or WebP image.");
    }
  }

  return (
    <div
      className="app"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className="topbar">
        <div className="brand">
          <h1>Mockdeck</h1>
          <p className="muted">Screenshot mockups</p>
        </div>

        <div className="controls">
          <label className="field">
            Aspect
            <select
              value={state.scene.aspect}
              onChange={(event) =>
                updateScene({ ...state.scene, aspect: event.target.value as Aspect })
              }
            >
              {ASPECTS.map((aspect) => (
                <option key={aspect} value={aspect}>
                  {aspect}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Frame
            <select
              value={state.scene.frame.type}
              onChange={(event) =>
                updateScene({
                  ...state.scene,
                  frame: frameFor(event.target.value as Frame["type"], state.scene.frame),
                })
              }
            >
              <option value="browser">Browser</option>
              <option value="mac">Mac</option>
              <option value="iphone">iPhone</option>
              <option value="none">None</option>
            </select>
          </label>

          {state.scene.frame.type === "browser" && (
            <label className="field">
              URL
              <input
                value={state.scene.frame.url}
                maxLength={200}
                spellCheck={false}
                onChange={(event) => onUrlChange(event.target.value)}
              />
            </label>
          )}

          <label className="field">
            Export
            <select
              value={state.ui.exportScale}
              onChange={(event) =>
                dispatch({
                  type: "ui/setExportScale",
                  scale: Number(event.target.value) as ExportScale,
                })
              }
            >
              {scaleOptions.map((scale) => (
                <option key={scale} value={scale}>
                  {scale}x
                </option>
              ))}
            </select>
          </label>

          <button
            className="primary"
            type="button"
            onClick={onDownload}
            disabled={!shot || exporting}
          >
            {exporting ? "Exporting..." : "Download PNG"}
          </button>
        </div>
      </header>

      <main className="main">
        {error && <div className="error">{error}</div>}

        <div className="status">
          <span>{shot ? `${shot.width} × ${shot.height}` : "No image yet"}</span>
          <span>·</span>
          <span>
            {artboard.width} × {artboard.height} canvas
          </span>
          <span>·</span>
          <button
            className="ghost"
            type="button"
            onClick={() => dispatch({ type: "scene/undo" })}
            disabled={!canUndo(state)}
          >
            Undo
          </button>
          <button
            className="ghost"
            type="button"
            onClick={() => dispatch({ type: "scene/redo" })}
            disabled={!canRedo(state)}
          >
            Redo
          </button>
          <button className="ghost" type="button" onClick={openPicker}>
            {shot ? "Replace image" : "Choose image"}
          </button>
          {busy && <span>Reading image...</span>}
        </div>

        <div className="preview">
          <div className="canvas-stage">
            <canvas
              ref={canvasRef}
              className={shot ? "canvas" : "canvas canvas-empty"}
              aria-label="Mockup preview"
            />
            {!shot && (
              <div className="empty">
                <h2>Drop a screenshot here</h2>
                <p className="muted">Paste from the clipboard or choose a file.</p>
                <button className="primary" type="button" onClick={openPicker}>
                  Choose image
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {dragging && <div className="drop-overlay">Drop to use this image</div>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={onFileInput}
      />
    </div>
  );
}
