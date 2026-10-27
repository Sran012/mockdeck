import { z } from "zod";

export const SCENE_VERSION = 1;

export const ASPECTS = ["16:9", "1:1", "4:5", "9:16"] as const;
export const Aspect = z.enum(ASPECTS);

const Color = z.string().regex(/^#([0-9a-f]{6}|[0-9a-f]{8})$/i);

export const Background = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("transparent") }),
  z.object({ kind: z.literal("solid"), color: Color }),
  z.object({
    kind: z.literal("gradient"),
    type: z.enum(["linear", "radial", "conic"]),
    angle: z.number().min(0).max(360),
    stops: z
      .array(z.object({ at: z.number().min(0).max(1), color: Color }))
      .min(2)
      .max(8),
  }),
  z.object({
    kind: z.literal("mesh"),
    seed: z.number().int(),
    points: z
      .array(z.object({ x: z.number(), y: z.number(), color: Color }))
      .min(3)
      .max(9),
  }),
  z.object({
    kind: z.literal("procedural"),
    pattern: z.enum(["noise", "grid", "paper"]),
    seed: z.number().int(),
    base: Color,
    intensity: z.number().min(0).max(1),
  }),
  z.object({
    kind: z.literal("image"),
    source: z.discriminatedUnion("type", [
      z.object({ type: z.literal("builtin"), id: z.string() }),
      z.object({ type: z.literal("user"), blobId: z.string() }),
    ]),
    fit: z.enum(["cover", "contain"]),
    blur: z.number().min(0).max(80),
  }),
]);

export const Frame = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({
    type: z.literal("browser"),
    theme: z.enum(["light", "dark"]),
    url: z.string().max(200),
  }),
  z.object({ type: z.literal("mac"), theme: z.enum(["light", "dark"]) }),
  z.object({
    type: z.literal("iphone"),
    color: z.enum(["black", "silver", "natural"]),
  }),
]);

export const Transform = z.object({
  tiltX: z.number().min(-45).max(45),
  tiltY: z.number().min(-45).max(45),
  rotateZ: z.number().min(-180).max(180),
  scale: z.number().min(0.3).max(1.5),
  padding: z.number().min(0).max(400),
  radius: z.number().min(0).max(80),
  shadow: z.object({
    blur: z.number().min(0).max(200),
    offsetY: z.number().min(-100).max(200),
    opacity: z.number().min(0).max(1),
    color: Color,
  }),
});

export const Scene = z.object({
  version: z.literal(SCENE_VERSION),
  aspect: Aspect,
  background: Background,
  frame: Frame,
  screenshot: z
    .object({
      blobId: z.string(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .nullable(),
  transform: Transform,
});

export type Aspect = z.infer<typeof Aspect>;
export type Background = z.infer<typeof Background>;
export type Frame = z.infer<typeof Frame>;
export type Transform = z.infer<typeof Transform>;
export type Scene = z.infer<typeof Scene>;
