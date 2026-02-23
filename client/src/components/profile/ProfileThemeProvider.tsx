import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

const THEME_ACCENT_MAP: Record<string, { accent: string; fg: string }> = {
  amber: {
    accent: "hsl(48 98% 50%)",
    fg: "hsl(0 0% 18%)",
  },
  rose: {
    accent: "hsl(350 89% 60%)",
    fg: "hsl(0 0% 100%)",
  },
  blue: {
    accent: "hsl(217 91% 60%)",
    fg: "hsl(0 0% 100%)",
  },
  emerald: {
    accent: "hsl(160 84% 39%)",
    fg: "hsl(0 0% 100%)",
  },
};

interface ProfileThemeProviderProps {
  themeAccent?: string | null;
  themeCustomColor?: string | null;
  children: ReactNode;
  className?: string;
}

export function ProfileThemeProvider({
  themeAccent = "amber",
  themeCustomColor,
  children,
  className,
}: ProfileThemeProviderProps) {
  const resolved =
    themeAccent === "custom" && themeCustomColor
      ? { accent: themeCustomColor, fg: "hsl(0 0% 100%)" }
      : THEME_ACCENT_MAP[themeAccent ?? "amber"] ?? THEME_ACCENT_MAP.amber;

  return (
    <div
      className={cn("profile-theme-root", className)}
      style={
        {
          "--profile-accent": resolved.accent,
          "--profile-accent-foreground": resolved.fg,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
