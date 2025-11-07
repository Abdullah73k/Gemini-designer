import type { ModelsJson } from "../types/models";

const MODELS_JSON_RELATIVE_PATH = ["public", "models.json"] as const;

/**
 * Reads the precomputed models manifest directly from the filesystem.
 *
 * @returns A parsed {@link ModelsJson} map containing every model's metadata.
 * @example
 * const models = await getModels();
 * const diningTable = models["gltf:dining_table"];
 */
export async function getModels(): Promise<ModelsJson> {
	try {
		const fs = await import("fs/promises");
		const path = await import("path");
		const jsonPath = path.join(process.cwd(), ...MODELS_JSON_RELATIVE_PATH);
		const file = await fs.readFile(jsonPath, "utf8");
		return JSON.parse(file) as ModelsJson;
	} catch (error) {
		console.error("[models] Failed to read public/models.json", error);
		throw new Error(
			"Unable to read model metadata from disk. Check server logs for details."
		);
	}
}

/**
 * Fetches the models manifest over HTTP for use within client components.
 *
 * @returns A parsed {@link ModelsJson} map sourced from `/models.json`.
 * @example
 * const models = await fetchModels();
 * const firstKey = Object.keys(models)[0];
 */
export async function fetchModels(): Promise<ModelsJson> {
	try {
		const response = await fetch("/models.json", {
			headers: { Accept: "application/json" },
		});

		if (!response.ok) {
			throw new Error(
				`Request failed with status ${response.status} (${response.statusText})`
			);
		}

		return (await response.json()) as ModelsJson;
	} catch (error) {
		console.error("[models] Failed to fetch /models.json", error);
		throw new Error(
			"Unable to fetch model metadata from the client. Verify the static asset exists."
		);
	}
}

/**
 * Usage:
 *
 * // In a Route Handler (server):
 * // const models = await getModels();
 *
 * // In a client hook/component:
 * // const models = await fetchModels();
 */
// TODO: Consider caching the parsed manifest once Next.js caching strategy is finalized.
