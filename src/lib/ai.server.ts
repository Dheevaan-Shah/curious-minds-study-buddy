import {
  generateResponse,
  GatewayError,
  PaymentRequiredError,
  RateLimitError,
} from "@lovable.dev/ai-gateway";
import type { AiResult } from "./study-config";

function extractText(output: unknown): { text?: string; refusal?: string } {
  if (!Array.isArray(output)) return {};
  for (const item of output) {
    if (!item || typeof item !== "object" || item.type !== "message") continue;
    const content: unknown = item.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (c && typeof c === "object") {
        if (c.type === "output_text" && typeof c.text === "string") return { text: c.text };
        if (c.type === "refusal" && typeof c.refusal === "string") return { refusal: c.refusal };
      }
    }
  }
  return {};
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
    const res = await generateResponse({
      model: "openai/gpt-6-astra",
      instructions: opts.instructions,
      input: opts.input,
      reasoning: { effort: opts.effort ?? "low" },
      text: {
        format: { type: "json_schema", name: opts.schemaName, strict: true, schema: opts.schema },
      },
    });
    const { text, refusal } = extractText(res.output);
    if (refusal) return { ok: false, error: "Study Buddy can't help with that topic. Try another one." };
    if (!text) return { ok: false, error: "Study Buddy didn't send an answer. Please try again." };
    return { ok: true, data: opts.parse(JSON.parse(text)) };
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
