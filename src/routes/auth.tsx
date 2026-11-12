import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

function safeRedirect(value: string | undefined): string {
  if (!value) return "/admin";
  try {
    const url = new URL(value, "http://x");
    if (value.startsWith("/") && !value.startsWith("//")) return url.pathname + url.search;
    if (typeof window !== "undefined" && url.origin === window.location.origin) return url.pathname + url.search;
  } catch {
    // ignore
  }
  return "/admin";
}

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Admin sign in — Study Buddy" },
      { name: "description", content: "Sign in to the Study Buddy admin area to read student feedback." },
      { property: "og:title", content: "Admin sign in — Study Buddy" },
      { property: "og:description", content: "Sign in to the Study Buddy admin area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const GOOGLE_SVG = (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

function AuthPage() {
  const search = Route.useSearch();
  const router = useRouter();
  const target = safeRedirect(search.redirect);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.history.replace(target);
    });
  }, [router, target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      router.history.replace(target);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}${target}` },
      });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Check your email to confirm your account, then sign in.");
      setMode("signin");
    }
  }

  async function social(provider: "google" | "lovable") {
    sessionStorage.setItem("post-auth-redirect", target);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) {
      toast.error("Sign in didn't work. Please try again.");
      return;
    }
    if (result.redirected) return;
    router.history.replace(target);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="sheet w-full max-w-sm space-y-5 p-6 sm:p-8">
        <div>
          <Link to="/" className="font-display text-lg font-bold">
            Study Buddy<span className="text-muted-foreground">.</span>
          </Link>
          <h1 className="mt-4 text-3xl font-bold">{mode === "signin" ? "Admin sign in" : "Create admin account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Read and act on feedback from students.</p>
        </div>

        <div className="space-y-2">
          <button type="button" className="lovable-auth-button w-full" onClick={() => social("lovable")}>
            Continue with Lovable
          </button>
          <button
            type="button"
            onClick={() => social("google")}
            className="flex h-10 w-full items-center justify-center gap-2.5 rounded-md border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F]"
          >
            {GOOGLE_SVG} Continue with Google
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Input type="email" required autoComplete="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 border-[1.5px] bg-card" />
          <Input type="password" required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="Password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 border-[1.5px] bg-card" />
          <Button type="submit" variant="ink" size="lg" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? "No account yet? " : "Already have an account? "}
          <button type="button" className="font-medium text-foreground underline underline-offset-4" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
