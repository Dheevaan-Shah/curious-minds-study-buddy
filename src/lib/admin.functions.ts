import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateJson } from "./ai.server";

export type AdminSuggestion = {
  id: string;
  title: string;
  detail: string;
  effort: "small" | "medium" | "large";
  status: "pending" | "accepted" | "rejected";
};

export type AdminFeedback = {
  id: string;
  message: string;
  category: string;
  name: string | null;
  context: string | null;
  status: "new" | "reviewed" | "done";
  created_at: string;
  suggestions_generated_at: string | null;
  suggestions: AdminSuggestion[];
};

/** Whether the signed-in user is an admin (read through their own role row). */
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) {
      console.error(error);
      return { isAdmin: false };
    }
    return { isAdmin: data === true };
  });

export const listFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminFeedback[]> => {
    // RLS only returns rows to admins.
    const { data, error } = await context.supabase
      .from("feedback")
      .select(
        "id, message, category, name, context, status, created_at, suggestions_generated_at, feedback_suggestions(id, title, detail, effort, status, created_at)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error(error);
      throw new Error("Couldn't load feedback.");
    }
    return (data ?? []).map((f) => ({
      id: f.id,
      message: f.message,
      category: f.category,
      name: f.name,
      context: f.context,
      status: f.status as AdminFeedback["status"],
      created_at: f.created_at,
      suggestions_generated_at: f.suggestions_generated_at,
      suggestions: [...(f.feedback_suggestions ?? [])]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((s) => ({
          id: s.id,
          title: s.title,
          detail: s.detail,
          effort: s.effort as AdminSuggestion["effort"],
          status: s.status as AdminSuggestion["status"],
        })),
    }));
  });

const suggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        detail: z.string().min(1).max(2000),
        effort: z.enum(["small", "medium", "large"]),
      }),
    )
    .min(1),
});

export const generateSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ feedbackId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const { data: fb, error } = await context.supabase
      .from("feedback")
      .select("id, message, category, context")
      .eq("id", data.feedbackId)
      .maybeSingle();
    if (error || !fb) return { ok: false, error: "Feedback not found." };

    const result = await generateJson({
      schemaName: "feedback_solutions",
      instructions: `You help the owner of "Study Buddy", a web app for grade 8-10 students. It explains Maths, Science and Computer Science topics simply, generates multiple-choice quizzes (easy/medium/hard) with hints, tracks scores on the device, and gives AI feedback on areas to develop.
A student sent feedback. Propose 2-3 concrete, different possible solutions the owner could make to the app.
- title: short action, max 10 words.
- detail: 1-3 plain sentences on what to change and why it helps students.
- effort: small, medium or large.
If the feedback is unclear, spam or not actionable, still return one suggestion explaining how to follow up or why to dismiss it.
Plain text only.`,
      input: `Category: ${fb.category}\nWhere they were: ${fb.context ?? "unknown"}\nFeedback: ${fb.message}`,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["suggestions"],
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "detail", "effort"],
              properties: {
                title: { type: "string" },
                detail: { type: "string" },
                effort: { type: "string", enum: ["small", "medium", "large"] },
              },
            },
          },
        },
      },
      parse: (v) => suggestionsSchema.parse(v).suggestions.slice(0, 3),
    });
    if (!result.ok) return { ok: false, error: result.error };

    // Replace any previous pending ideas, keep decisions already made.
    await context.supabase
      .from("feedback_suggestions")
      .delete()
      .eq("feedback_id", fb.id)
      .eq("status", "pending");
    const { error: insertError } = await context.supabase
      .from("feedback_suggestions")
      .insert(result.data.map((s) => ({ ...s, feedback_id: fb.id })));
    if (insertError) {
      console.error(insertError);
      return { ok: false, error: "Couldn't save the suggestions." };
    }
    await context.supabase
      .from("feedback")
      .update({ suggestions_generated_at: new Date().toISOString() })
      .eq("id", fb.id);
    return { ok: true };
  });

export const setSuggestionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["pending", "accepted", "rejected"]) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("feedback_suggestions")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error("Couldn't update the suggestion.");
    return { ok: true };
  });

export const setFeedbackStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["new", "reviewed", "done"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("feedback").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error("Couldn't update the feedback.");
    return { ok: true };
  });

export const deleteFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("feedback").delete().eq("id", data.id);
    if (error) throw new Error("Couldn't delete the feedback.");
    return { ok: true };
  });
