import { Scene, SCENE_VERSION, type Scene as SceneType } from "./schema";

type Migration = (old: unknown) => unknown;

const migrations: Record<number, Migration> = {};

function readVersion(value: unknown): number {
  if (typeof value !== "object" || value === null || !("version" in value)) {
    throw new Error("Invalid scene: missing version");
  }

  const version = (value as { version: unknown }).version;
  if (typeof version !== "number") {
    throw new Error("Invalid scene: version must be a number");
  }

  return version;
}

export function migrate(raw: unknown): SceneType {
  let current = raw;
  let version = readVersion(current);

  while (version !== SCENE_VERSION) {
    const migration = migrations[version];
    if (!migration) {
      throw new Error(`Unsupported scene version: ${version}`);
    }

    current = migration(current);
    version = readVersion(current);
  }

  return Scene.parse(current);
}
