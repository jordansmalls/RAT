"use client";

import { Moon, Sun } from "@/components/icons";
import { useTheme } from "next-themes";

/**
 * Light/dark switch. The icon and label follow the `.dark` class rather than
 * `resolvedTheme`, so server and client markup match before hydration.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      className={className}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle light or dark mode"
      title="Toggle light or dark mode (D)"
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
      <span className="hidden dark:inline">Light mode</span>
      <span className="dark:hidden">Dark mode</span>
    </button>
  );
}
