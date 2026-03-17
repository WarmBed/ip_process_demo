import React from "react";

const KEYFRAMES = `
@keyframes lp-draw {
  from { width: 0 }
  to   { width: 100% }
}
@keyframes lp-fade {
  from { opacity: 0 }
  to   { opacity: 1 }
}
`;

let injected = false;
function injectStyles() {
  if (injected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = KEYFRAMES;
  document.head.appendChild(el);
  injected = true;
}

interface LoadingProps {
  /** Vertical padding around the widget. Default: 48px */
  pad?: number;
  /** Override label. Default: "Retrieving" */
  label?: string;
}

/**
 * Ruled Line loading indicator — a thin rule draws under small-caps text.
 * Professional, minimal, no bounce.
 */
export function Loading({ pad = 48, label = "Retrieving" }: LoadingProps) {
  if (typeof window !== "undefined") injectStyles();

  return (
    <div style={{
      padding: `${pad}px 0`,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}>
      <div style={{ textAlign: "center", width: 120 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.22em",
          color: "var(--fg)",
          textTransform: "uppercase",
          marginBottom: 10,
          animation: "lp-fade 0.4s ease both",
        }}>
          {label}
        </div>
        <div style={{
          height: 1,
          background: "var(--fg)",
          animation: "lp-draw 1.4s cubic-bezier(0.4,0,0.2,1) infinite alternate",
        }} />
      </div>
    </div>
  );
}
