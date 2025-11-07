import { generateText } from "ai";
import type { LayoutResponse, ModelMeta, ModelsJson } from "../types/models";

type ModelId = keyof ModelsJson;
const DEFAULT_MODEL = "gemini-1.5-large";

/**
 * Builds a concise system prompt that constrains Gemini to the provided models
 * and enforces a strict JSON LayoutResponse output.
 *
 * @param candidates - Ranked list of models that Gemini may reference.
 * @param exampleLayout - Optional LayoutResponse example injected as guidance.
 * @returns Prompt string describing the task, schema, and candidate manifest.
 */
export function buildSystemPrompt(
	candidates: ModelMeta[],
	exampleLayout?: LayoutResponse
): string {
	const candidateLines = candidates.map((meta, index) => {
		const candidate = meta as ModelMeta & { id?: ModelId };
		const identifier =
			(candidate.id ??
				meta.path
					.replace(/^\/+/, "")
					.replace(/\.[^/.]+$/, "")
					.replace(/[/\\]/g, ":")) ||
			`model_${index + 1}`;

		const anchors =
			Object.keys(meta.anchors ?? {})
				.slice(0, 4)
				.join(", ") || "none";

		return `- ${identifier} | size:${meta.w.toFixed(2)}x${meta.d.toFixed(
			2
		)}x${meta.h.toFixed(2)}m | anchors:${anchors}`;
	});

	const exampleBlock = exampleLayout
		? `\nValid JSON example (match this schema exactly and omit trailing text):\n${JSON.stringify(
				exampleLayout,
				null,
				2
		  )}\n`
		: "";

	return [
		"You are an interior layout planner AI.",
		"Respond ONLY with valid JSON that matches the LayoutResponse schema.",
		"Do not include markdown code fences, commentary, or extra keys.",
		"",
		"Available models (use only these IDs):",
		candidateLines.join("\n") ||
			"- none provided; describe procedural primitives only.",
		"",
		"Rules:",
		"- Keep units in meters for positions and sizes.",
		"- Snap positions to 0.1m increments where reasonable.",
		"- If an anchor is referenced, ensure the parent exists.",
		"- Always include rationale text explaining placement choices.",
		exampleBlock.trim(),
		"",
		"Return strictly JSON. No additional text.",
	]
		.filter(Boolean)
		.join("\n");
}

/**
 * Invokes Gemini through the Vercel AI SDK using the provided candidate models
 * to guide layout generation.
 *
 * @param userPrompt - Free-form description from the end user.
 * @param candidates - Ranked models produced by getTopKModels.
 * @param temperature - Optional sampling temperature (default: 0.7).
 * @returns Raw string response from Gemini (expected to be JSON).
 */
export async function callGemini(
	userPrompt: string,
	candidates: ModelMeta[],
	temperature = 0.7
): Promise<string> {
	const systemPrompt = buildSystemPrompt(candidates);

	try {
		const { text } = await generateText({
			model: process.env.GEMINI_MODEL ?? DEFAULT_MODEL,
			system: systemPrompt,
			prompt: userPrompt,
			temperature,
		});

		if (!text) {
			throw new Error("Gemini returned an empty response.");
		}

		return text;
	} catch (error) {
		console.error("[geminiClient] Gemini call failed:", error);
		throw new Error("Failed to generate layout. Check Gemini configuration.");
	}
}

/**
 * Usage:
 *
 * const layoutJSON = await callGemini(
 *   "Design a cozy gaming room",
 *   topModels,
 *   0.7
 * );
 * console.log(layoutJSON);
 */

/**
 * Setup Notes:
 * - Requires `process.env.VERCEL_AI_API_KEY` (or provider-specific key) to be configured.
 * - Customize the system prompt contents if the product needs additional constraints or branding.
 * - Always pass the curated top-K candidate models from `getTopKModels`.
 * - Recommended Gemini models: "gemini-1.5-large" (max context) or "gemini-1.5-turbo"
 *   for creative room planning with ample candidate metadata.
 * - TODO: Add structured logging of prompt/response sizes and consider streaming output for long layouts.
 */
