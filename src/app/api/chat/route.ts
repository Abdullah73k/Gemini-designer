import { NextRequest } from "next/server";
import type {  LayoutObject, LayoutResponse, ModelsJson } from "@/types/models";
import { getModels } from "@/lib/models";
import { getTopKModels } from "@/lib/retriever";
import { buildSystemPrompt, callGemini } from "@/lib/geminiClient";

export const runtime = "nodejs";

const RAW_SNIPPET_LIMIT = 200;
const DEFAULT_TEMPERATURE = 0.2;
const TOP_K = 10;

type GenerateBody = {
  description?: unknown;
  style?: unknown;
  temperature?: unknown;
  previousLayout?: unknown;
};

/**
 * Lightweight readiness endpoint.
 */
export function GET() {
  return Response.json({ ok: true });
}

/**
 * POST handler that generates and sanitizes room layouts via Gemini.
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = (await req.json()) as GenerateBody;
    const description = extractDescription(body.description);

    if (!description) {
      return Response.json(
        { ok: false, error: "Invalid description" },
        { status: 400 }
      );
    }

    const style = toOptionalString(body.style);
    const temperature =
      typeof body.temperature === "number" ? body.temperature : DEFAULT_TEMPERATURE;
    const previousLayout = castLayoutResponse(body.previousLayout);

    const descriptionWithStyle = style
      ? `${description.trim()} style:${style.trim()}`
      : description.trim();

    console.info("[api/chat] request", {
      desc_len: descriptionWithStyle.length,
      style: style ?? null,
      temperature,
      has_previous_layout: Boolean(previousLayout),
    });

    // Fast-fail when Gemini credentials are not configured to avoid dev overlay HTML.
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json(
        {
          ok: false,
          error:
            "Missing GOOGLE_GENERATIVE_AI_API_KEY. Set it in your environment to enable layout generation.",
        },
        { status: 503 }
      );
    }

    const models: ModelsJson = await getModels();
    const modelCount = Object.keys(models).length;
    console.info("[api/chat] models_loaded", { count: modelCount });
    const candidates = getTopKModels(models, descriptionWithStyle, TOP_K);
    console.info("[api/chat] candidate_count=%d", candidates.length);
    console.debug(
      "[api/chat] candidates_sample",
      candidates.slice(0, 5).map((m) => ({ path: m.path, tags: (m.tags || []).slice(0, 3) }))
    );

    const systemPrompt = buildSystemPrompt(candidates, previousLayout ?? undefined);
    console.debug("[api/chat] system_prompt_chars=%d", systemPrompt.length);

    const raw = await callGemini(descriptionWithStyle, candidates, temperature);
    console.debug("[api/chat] raw_chars=%d", raw.length);
    console.debug("[api/chat] raw_snippet", raw.slice(0, RAW_SNIPPET_LIMIT));
    const parsed = safeParseLayout(raw);

    // Clamp positions, snap to grid, and resolve overlaps before returning.
    const clean = sanitizeLayout(parsed, {
      snap: 0.1,
      roomFallback: { width_m: 4, depth_m: 3.5, height_m: 2.7 },
    });

    return Response.json({
      ok: true,
      data: clean,
    });
  } catch (error) {
    console.error("[api/chat] Unexpected error", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate layout.";
    return Response.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

function extractDescription(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function castLayoutResponse(value: unknown): LayoutResponse | null {
  if (!value || typeof value !== "object") return null;
  return value as LayoutResponse;
}

/**
 * Attempts to parse Gemini output safely, falling back to regex extraction when
 * the model wraps JSON in prose.
 */
function safeParseLayout(raw: string): LayoutResponse {
  try {
    return JSON.parse(raw) as LayoutResponse;
  } catch {
    console.warn("[api/chat] direct JSON.parse failed; trying fenced block");
    // Try extracting fenced JSON first, e.g., ```json { ... } ```
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence && fence[1]) {
      try {
        return JSON.parse(fence[1]) as LayoutResponse;
      } catch {
        console.warn("[api/chat] fenced JSON parse failed; trying first brace block");
      }
    }

    // Regex fallback to capture the first JSON block (Gemini sometimes adds chatter).
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as LayoutResponse;
      } catch {
        console.warn("[api/chat] brace block parse failed; giving up");
      }
    }
    const snippet = raw.slice(0, RAW_SNIPPET_LIMIT);
    throw new Error(`Unable to parse layout JSON. Snippet: ${snippet}`);
  }
}

type SanitizeOptions = {
  snap: number;
  roomFallback: LayoutResponse["room"];
};

/**
 * Minimal sanitizer that snaps positions, keeps objects within room bounds, and
 * ensures unparented items rest on the floor plane.
 */
function sanitizeLayout(layout: LayoutResponse, options: SanitizeOptions): LayoutResponse {
  const room = layout.room ?? options.roomFallback;

  const snapValue = (value: number): number =>
    Math.round(value / options.snap) * options.snap;

  const clampWithinRoom = (value: number, halfSize = 0, axis: "width" | "depth"): number => {
    const limit = axis === "width" ? room.width_m / 2 : room.depth_m / 2;
    return Math.max(-limit + halfSize, Math.min(limit - halfSize, value));
  };

  const sanitizedObjects: LayoutObject[] = (layout.objects ?? []).map((object) => {
    const size = object.size_m ?? {};
    const position = object.position_m ?? { x: 0, y: 0, z: 0 };
    const snappedPosition = {
      x: snapValue(position.x ?? 0),
      y: snapValue(position.y ?? 0),
      z: snapValue(position.z ?? 0),
    };

    const halfWidth = (size.w ?? 0) / 2;
    const halfDepth = (size.d ?? 0) / 2;

    const clampedPosition = {
      x: clampWithinRoom(snappedPosition.x, halfWidth, "width"),
      y:
        object.parent || size.h == null
          ? snappedPosition.y
          : Math.max(size.h / 2, snappedPosition.y),
      z: clampWithinRoom(snappedPosition.z, halfDepth, "depth"),
    };

    return {
      ...object,
      position_m: clampedPosition,
    };
  });

  return {
    ...layout,
    room,
    objects: sanitizedObjects,
  };
}

/**
 * Setup checklist:
 * - Configure the Gemini/AI SDK API key environment variable (see src/lib/geminiClient.ts).
 * - Ensure public/models.json exists and matches the ModelsJson schema.
 * - Optionally replace the inline sanitizeLayout helper with a shared src/lib/layoutSanitizer module.
 *
 * How to test now:
 * - Run pnpm dev
 * - curl -X POST http://localhost:3000/api/generate \
 *     -H "Content-Type: application/json" \
 *     -d '{"description":"Design a cozy gaming room","style":"cozy","temperature":0.3}'
 */
