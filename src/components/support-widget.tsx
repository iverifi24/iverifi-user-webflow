import { useState } from "react";
import { createPortal } from "react-dom";
import { PhoneCall, X, Headphones } from "lucide-react";

export function SupportWidget() {
  const [open, setOpen] = useState(false);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed bottom-20 right-4 z-[2147483647] flex flex-col items-end gap-2">
      {open && (
        <div
          className="mb-1 w-72 rounded-2xl border p-4 shadow-2xl"
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
              className="transition-colors"
              style={{ color: "var(--iverifi-text-muted)" }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--iverifi-text-muted)" }}>
            Stuck somewhere or have a question? Call us — we're happy to walk you through it.
          </p>

          <a
            href="tel:+917676487732"
            className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 px-4 text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-75"
            style={{
              backgroundColor: "var(--iverifi-accent)",
              color: "var(--iverifi-nav-bg)",
            }}
          >
            <PhoneCall className="h-4 w-4" />
            +91 76764 87732
          </a>
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
