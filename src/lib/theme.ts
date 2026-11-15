import { useEffect } from "react";
import { createLocalStore } from "./local-store";

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "study-buddy:theme";

export const themeStore = createLocalStore<ThemeChoice>(THEME_KEY, "system", (raw) =>
  raw === "light" || raw === "dark" || raw === "system" ? raw : "system",
);

/** Runs before first paint (inlined in <head>) so dark mode never flashes white. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(THEME_KEY)})||'"system"');var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

/** Keep the <html> .dark class in sync with the saved choice and the system setting. */
export function useApplyTheme() {
  const choice = themeStore.useValue();
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      // Read the saved value directly: during hydration `choice` is still the default.
      const saved = themeStore.get();
      const dark = saved === "dark" || (saved === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [choice]);
}
