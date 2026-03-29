import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useThemeOptional } from "@/context/theme_context";

const Toaster = ({ ...props }: ToasterProps) => {
  const themeCtx = useThemeOptional();
  const resolved = themeCtx?.theme ?? "dark";

  return (
    <Sonner
      theme={resolved === "dark" ? "dark" : "light"}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
