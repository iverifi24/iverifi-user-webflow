import { useState } from "react";
import { createPortal } from "react-dom";
import { Mail, X, Headphones, MapPin } from "lucide-react";

export function SupportWidget() {
  const [open, setOpen] = useState(false);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed bottom-20 right-4 z-[2147483647] flex flex-col items-end gap-2">
      {open && (
        <div
          className="mb-1 w-80 rounded-2xl border p-4 shadow-2xl"
          style={{
            backgroundColor: "var(--iverifi-nav-bg)",
            borderColor: "var(--iverifi-accent-border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: "var(--iverifi-accent-soft)",
                  border: "1px solid var(--iverifi-accent-border)",
                }}
              >
                <Headphones className="h-4 w-4" style={{ color: "var(--iverifi-accent)" }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: "var(--iverifi-text-primary)" }}>
                Need help?
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="transition-colors cursor-pointer"
              style={{ color: "var(--iverifi-text-muted)" }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--iverifi-text-muted)" }}>
            Have questions or need assistance? Email us and we'll be happy to help.
          </p>

          <a
            href="mailto:admin@iverifi.io"
            className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 px-4 text-xs font-semibold transition-opacity hover:opacity-90 active:opacity-75 cursor-pointer mb-2"
            style={{
              backgroundColor: "var(--iverifi-accent)",
              color: "var(--iverifi-nav-bg)",
            }}
          >
            <Mail className="h-4 w-4" />
            admin@iverifi.io
          </a>

          <div className="pt-2 border-t border-border/50 text-[10px] leading-tight text-muted-foreground flex items-start gap-1.5">
            <MapPin className="h-3 w-3 shrink-0 text-[var(--iverifi-accent)] mt-0.5" />
            <span>37, 8th cross, 4th main, KGE Layout, RMV 2nd stage, Bangalore 560094</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Support"
        className="flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-95"
        style={{
          backgroundColor: "var(--iverifi-accent)",
          color: "var(--iverifi-nav-bg)",
          boxShadow: "0 4px 20px color-mix(in srgb, var(--iverifi-accent) 40%, transparent)",
        }}
      >
        {open ? <X className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}
      </button>
    </div>,
    document.body
  );
}
