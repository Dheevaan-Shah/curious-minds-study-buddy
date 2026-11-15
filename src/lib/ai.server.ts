import {
  generateMessage,
  GatewayError,
  PaymentRequiredError,
  RateLimitError,
} from "@lovable.dev/ai-gateway";
import type { AiResult } from "./study-config";

// All Study Buddy AI features run on Claude through the Lovable AI Gateway.
const MODEL = "anthropic/claude-sonnet-5" as const;

function extractText(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined;
  for (const block of content) {
    if (block && typeof block === "object" && block.type === "text" && typeof block.text === "string") {
      return block.text;
    }
  }
  return undefined;
}

/** Strip ```json fences in case the model wraps its JSON. */
function cleanJson(text: string): string {
  const t = text.trim();
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1]! : t;
}

export async function generateJson<T>(opts: {
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
  parse: (value: unknown) => T;
  effort?: "low" | "medium";
}): Promise<AiResult<T>> {
  try {
    const res = await generateMessage({
      model: MODEL,
      max_tokens: 16000,
      system: opts.instructions,
      messages: [{ role: "user", content: opts.input }],
      output_config: {
        effort: opts.effort ?? "low",
        format: { type: "json_schema", schema: opts.schema },
      },
    });
    if (res.stop_reason === "refusal")
      return { ok: false, error: "Study Buddy can't help with that topic. Try another one." };
    const text = extractText(res.content);
    if (!text) return { ok: false, error: "Study Buddy didn't send an answer. Please try again." };
    return { ok: true, data: opts.parse(JSON.parse(cleanJson(text))) };
  } catch (error) {
    console.error("AI request failed", error);
    if (error instanceof PaymentRequiredError)
      return { ok: false, error: "The AI credits for this app have run out. Please top up to continue." };
    if (error instanceof RateLimitError)
      return { ok: false, error: "Study Buddy is busy right now. Wait a moment and try again." };
    if (error instanceof GatewayError)
      return { ok: false, error: "Study Buddy couldn't reach the AI. Please try again." };
    return { ok: false, error: "Something went wrong reading the answer. Please try again." };
  }
}
