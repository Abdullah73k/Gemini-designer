import type { ModelMeta, ModelsJson } from "@/types/models";

/**
 * Opaque identifier referring to a model key in models.json.
 */
export type ModelKey = string;

/**
 * Extracts a lookup key from a model string like "gltf:desk_basic".
 */
function extractKey(model?: string | null): string | undefined {
  if (!model || typeof model !== "string") return undefined;
  const idx = model.indexOf(":");
  return idx >= 0 ? model.slice(idx + 1) : model;
}

/**
 * Resolves a model path from the manifest using a key or a prefixed model string.
 */
export function resolveModelPath(models: ModelsJson, key: ModelKey): string | undefined {
  const lookup = extractKey(key);
  if (!lookup) return undefined;
  const meta = models[lookup];
  const path = meta?.path;
  if (path && !path.startsWith("/models/")) {
    console.warn(
      "[modelLoader] Ignoring non-public path (must start with /models/):",
      path
    );
    return undefined;
  }
  return path;
}

/**
 * Returns the full metadata for a model key (supports prefixed strings like gltf:key).
 */
export function getModelMeta(models: ModelsJson, key: ModelKey): ModelMeta | undefined {
  const lookup = extractKey(key);
  if (!lookup) return undefined;
  return models[lookup];
}
