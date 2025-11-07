import type { ModelMeta, ModelsJson } from "../types/models";

/**
 * Picks the most relevant model candidates for a natural language query.
 *
 * @param models - Complete manifest loaded from `public/models.json`.
 * @param query - User description to match against model tags and identifiers.
 * @param k - Maximum number of results to return (default: 10).
 * @returns Array of top-ranked {@link ModelMeta} entries best matching the query.
 *
 * @example
 * const topModels = getTopKModels(modelsJson, "white desk modern", 5);
 */
export function getTopKModels(
	models: ModelsJson,
	query: string,
	k = 10
): ModelMeta[] {
	const allEntries = Object.entries(models);
	const words = query
		.toLowerCase()
		.split(/\s+/)
		.map((word) => word.trim())
		.filter(Boolean);

	if (words.length === 0) {
		return allEntries.slice(0, k).map(([, meta]) => meta);
	}

	const scored = allEntries.map(([id, meta]) => {
		const haystack = [id, ...(meta.tags ?? [])].map((value) =>
			value.toLowerCase()
		);

		const score = words.reduce((acc, word) => {
			return acc + (haystack.some((text) => text.includes(word)) ? 1 : 0);
		}, 0);

		return { meta, score };
	});

	const ranked = scored
		.filter((entry) => entry.score > 0)
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			return a.meta.path.localeCompare(b.meta.path);
		})
		.slice(0, k)
		.map((entry) => entry.meta);

	if (ranked.length < k) {
		const remaining = allEntries
			.map(([, meta]) => meta)
			.filter((meta) => !ranked.includes(meta))
			.slice(0, k - ranked.length);
		return [...ranked, ...remaining];
	}

	return ranked;
}

/**
 * Usage:
 *
 * const topModels = getTopKModels(modelsJson, "white desk modern", 5);
 * console.log(topModels.map((model) => model.path));
 */
// TODO: Experiment with fuzzy scoring (e.g., cosine similarity) if time allows.
