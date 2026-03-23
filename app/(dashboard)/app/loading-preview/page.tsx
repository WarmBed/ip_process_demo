"use client";

import { useEffect, useRef, useState } from "react";
import { Text, Box, Heading } from "@radix-ui/themes";

/* --- keyframes injected once -------------------------------- */

const STYLES = `
@keyframes lp-draw   { from { width: 0 } to { width: 100% } }
@keyframes lp-fade   { from { opacity: 0 } to { opacity: 1 } }
@keyframes lp-slide  { from { transform: translateY(6px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
@keyframes lp-pulse  { 0%,100% { opacity: 0.25 } 50% { opacity: 1 } }
@keyframes lp-scan   { 0% { left: -4px } 100% { left: calc(100% + 4px) } }
@keyframes lp-spin   { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
@keyframes lp-stamp  { 0% { transform: scale(1.4) rotate(-6deg); opacity: 0 } 60% { transform: scale(0.96) rotate(1deg); opacity: 1 } 100% { transform: scale(1) rotate(0deg); opacity: 1 } }
@keyframes lp-blink  { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
@keyframes lp-march  { from { background-position: 0 0 } to { background-position: 28px 0 } }
@keyframes lp-sway   { 0%,100% { transform: rotate(-4deg) } 50% { transform: rotate(4deg) } }
@keyframes lp-wipe   { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0% 0 0) } }
@keyframes lp-count  { from { content: '00000' } to { content: '14782' } }
@keyframes lp-bars   { 0%,100% { transform: scaleY(0.3) } 50% { transform: scaleY(1) } }
`;

/* --- preview card wrapper ----------------------------------- */

function Card({ n, name, desc, children }: { n: number; name: string; desc: string; children: React.ReactNode }) {
  return (
    <Box style={{
      border: "1px solid var(--gray-6)", borderRadius: 12,
      overflow: "hidden", background: "var(--color-background)",
    }}>
      {/* header */}
      <div style={{
        padding: "10px 16px", borderBottom: "1px solid var(--gray-6)",
        background: "var(--gray-3)",
        display: "flex", alignItems: "baseline", gap: 10,
      }}>
        <Text size="1" weight="bold" style={{ color: "var(--gray-8)", minWidth: 20 }}>#{n}</Text>
        <Text size="2" weight="bold" style={{ color: "var(--gray-12)" }}>{name}</Text>
        <Text size="1" style={{ color: "var(--gray-8)", flex: 1 }}>{desc}</Text>
      </div>

      {/* preview area */}
      <div style={{
        height: 140,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--color-background)",
        position: "relative", overflow: "hidden",
      }}>
        {children}
      </div>
    </Box>
  );
}

/* ============================================================
   10 Loading Variants
============================================================ */

/** 1. Ruled Line -- a thin rule draws under small-caps text */
function L1() {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.22em",
        color: "var(--gray-12)", textTransform: "uppercase",
        marginBottom: 10,
        animation: "lp-fade 0.5s ease both",
      }}>
        Retrieving
      </div>
      <div style={{
        height: 1, background: "var(--gray-12)",
        animation: "lp-draw 1.4s cubic-bezier(0.4,0,0.2,1) infinite alternate",
      }} />
    </div>
  );
}

/** 2. Docket Stamp -- circular seal stamps down */
function L2() {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setKey(k => k + 1), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div key={key} style={{
      width: 72, height: 72, borderRadius: "50%",
      border: "2.5px solid var(--gray-12)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 2,
      animation: "lp-stamp 0.55s cubic-bezier(0.2,0.8,0.3,1) both",
    }}>
      <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.18em", color: "var(--gray-12)", textTransform: "uppercase" }}>Docket</span>
      <div style={{ width: 40, height: 1, background: "var(--gray-12)" }} />
      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-12)", letterSpacing: "-0.02em" }}>載入</span>
      <div style={{ width: 40, height: 1, background: "var(--gray-12)" }} />
      <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.18em", color: "var(--gray-12)", textTransform: "uppercase" }}>Loading</span>
    </div>
  );
}

/** 3. Document Skeleton -- paragraphs of shimmer lines */
function L3() {
  const lines = [
    { w: "82%", delay: "0s" },
    { w: "68%", delay: "0.08s" },
    { w: "75%", delay: "0.16s" },
    { w: "55%", delay: "0.24s" },
  ];
  return (
    <div style={{ width: "72%", display: "flex", flexDirection: "column", gap: 9 }}>
      {lines.map((l, i) => (
        <div key={i} style={{
          height: 8, borderRadius: 2,
          background: `linear-gradient(90deg, var(--gray-4) 25%, var(--gray-6) 50%, var(--gray-4) 75%)`,
          backgroundSize: "200% 100%",
          width: l.w,
          animation: `lp-march 1.6s linear infinite`,
          animationDelay: l.delay,
        }} />
      ))}
      <div style={{ marginTop: 4, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "var(--gray-8)", textTransform: "uppercase" }}>
        正在讀取文件...
      </div>
    </div>
  );
}

/** 4. Monogram Ring -- single letter inside a thin SVG ring */
function L4() {
  return (
    <div style={{ position: "relative", width: 72, height: 72 }}>
      <svg viewBox="0 0 72 72" style={{ position: "absolute", inset: 0, animation: "lp-spin 2.4s linear infinite" }}>
        <circle cx="36" cy="36" r="32" fill="none" stroke="var(--gray-5)" strokeWidth="2" />
        <circle cx="36" cy="36" r="32" fill="none" stroke="var(--gray-12)" strokeWidth="2"
          strokeDasharray="60 142" strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, fontWeight: 700, color: "var(--gray-12)", letterSpacing: "-0.04em",
      }}>
        M
      </div>
    </div>
  );
}

/** 5. Scan Bar -- a fine vertical line scans across content */
function L5() {
  return (
    <div style={{ position: "relative", width: "80%", height: 80 }}>
      {/* fake text lines */}
      {[70, 55, 80, 45].map((w, i) => (
        <div key={i} style={{
          height: 6, borderRadius: 1, background: "var(--gray-5)",
          width: `${w}%`, marginBottom: 10,
        }} />
      ))}
      {/* scan line */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, width: 1.5,
        background: "var(--gray-12)",
        boxShadow: "2px 0 12px rgba(0,0,0,0.15)",
        animation: "lp-scan 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
      }} />
      <div style={{
        position: "absolute", bottom: -18,
        fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
        color: "var(--gray-8)", textTransform: "uppercase",
      }}>
        Scanning
      </div>
    </div>
  );
}

/** 6. Case Number Ticker -- numbers roll up */
function L6() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN(v => (v + 1) % 100000), 80);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: "var(--gray-8)", textTransform: "uppercase", marginBottom: 8 }}>
        Case No.
      </div>
      <div style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: 24, fontWeight: 700, letterSpacing: "0.06em",
        color: "var(--gray-12)",
      }}>
        {String(n).padStart(5, "0")}
      </div>
      <div style={{ marginTop: 6, width: 120, height: 1, background: "var(--gray-6)", margin: "8px auto 0" }} />
    </div>
  );
}

/** 7. Three Dashes -- measured dash animation, no bounce */
function L7() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 20, height: 2, borderRadius: 1,
          background: "var(--gray-12)",
          animation: `lp-pulse 1.2s ease-in-out infinite`,
          animationDelay: `${i * 0.18}s`,
        }} />
      ))}
    </div>
  );
}

/** 8. Balance Scale -- arms sway */
function L8() {
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="80" height="64" viewBox="0 0 80 64" fill="none"
        style={{ animation: "lp-sway 2s ease-in-out infinite", display: "block", margin: "0 auto" }}>
        {/* pole */}
        <line x1="40" y1="10" x2="40" y2="52" stroke="var(--gray-12)" strokeWidth="1.5" />
        {/* top knob */}
        <circle cx="40" cy="8" r="3" fill="var(--gray-12)" />
        {/* beam */}
        <line x1="12" y1="22" x2="68" y2="22" stroke="var(--gray-12)" strokeWidth="1.5" />
        {/* left pan strings */}
        <line x1="14" y1="22" x2="10" y2="42" stroke="var(--gray-12)" strokeWidth="1" />
        <line x1="14" y1="22" x2="22" y2="42" stroke="var(--gray-12)" strokeWidth="1" />
        {/* right pan strings */}
        <line x1="66" y1="22" x2="58" y2="42" stroke="var(--gray-12)" strokeWidth="1" />
        <line x1="66" y1="22" x2="74" y2="42" stroke="var(--gray-12)" strokeWidth="1" />
        {/* pans */}
        <path d="M8 42 Q16 46 24 42" stroke="var(--gray-12)" strokeWidth="1.5" fill="none" />
        <path d="M56 42 Q64 46 72 42" stroke="var(--gray-12)" strokeWidth="1.5" fill="none" />
        {/* base */}
        <line x1="30" y1="52" x2="50" y2="52" stroke="var(--gray-12)" strokeWidth="1.5" />
      </svg>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: "var(--gray-8)", textTransform: "uppercase", marginTop: 6 }}>
        Processing
      </div>
    </div>
  );
}

/** 9. Redaction -- black bars appear one by one */
function L9() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setCount(c => c < 4 ? c + 1 : 1), 600);
    return () => clearInterval(t);
  }, []);
  const rows = [
    { w: "78%", text: true },
    { w: "62%", text: false },
    { w: "84%", text: true },
    { w: "50%", text: false },
  ];
  return (
    <div style={{ width: "72%", display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            height: 8, borderRadius: 1,
            background: i < count ? "var(--gray-12)" : "var(--gray-5)",
            width: r.w,
            transition: "background 0.2s ease",
          }} />
        </div>
      ))}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "var(--gray-8)", textTransform: "uppercase", marginTop: 4 }}>
        Redacting
      </div>
    </div>
  );
}

/** 10. Filing -- a rectangle slides right into a folder outline */
function L10() {
  const [pos, setPos] = useState(0);
  const dir = useRef(1);
  useEffect(() => {
    const t = setInterval(() => {
      setPos(p => {
        const next = p + dir.current * 1.8;
        if (next >= 100) { dir.current = -1; return 100; }
        if (next <= 0)   { dir.current =  1; return 0;   }
        return next;
      });
    }, 16);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="100" height="72" viewBox="0 0 100 72" fill="none">
        {/* folder body */}
        <rect x="8" y="22" width="84" height="46" rx="3" stroke="var(--gray-12)" strokeWidth="1.5" />
        <path d="M8 22 L8 16 Q8 13 11 13 L36 13 Q40 13 42 16 L46 22" stroke="var(--gray-12)" strokeWidth="1.5" fill="none" />
        {/* sliding document */}
        <rect
          x={8 + (pos / 100) * 56}
          y="30"
          width="28" height="34"
          rx="2"
          fill="var(--color-background)"
          stroke="var(--gray-12)" strokeWidth="1.5"
        />
        {/* doc lines */}
        {[38, 45, 52].map(y => (
          <line key={y}
            x1={12 + (pos / 100) * 56}
            y1={y}
            x2={32 + (pos / 100) * 56}
            y2={y}
            stroke="var(--gray-7)" strokeWidth="1"
          />
        ))}
      </svg>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: "var(--gray-8)", textTransform: "uppercase" }}>
        Archiving
      </div>
    </div>
  );
}

/* --- page --------------------------------------------------- */

export default function LoadingPreviewPage() {
  return (
    <div style={{ padding: "24px 28px", maxWidth: 1000 }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <Box mb="5">
        <Heading size="4" weight="bold" style={{ color: "var(--gray-12)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Loading 樣式選擇
        </Heading>
        <Text size="2" style={{ color: "var(--gray-8)" }}>
          10 種律師專業風格 -- 點選任一替換全站 loading 狀態
        </Text>
      </Box>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <Card n={1} name="Ruled Line" desc="細線展開 + 小型大寫">
          <L1 />
        </Card>
        <Card n={2} name="Docket Stamp" desc="印鑑章落下動畫">
          <L2 />
        </Card>
        <Card n={3} name="Document Skeleton" desc="文件骨架掃描效果">
          <L3 />
        </Card>
        <Card n={4} name="Monogram Ring" desc="單字母 + 細邊框旋轉">
          <L4 />
        </Card>
        <Card n={5} name="Scan Bar" desc="垂直掃描線過文件">
          <L5 />
        </Card>
        <Card n={6} name="Case Number Ticker" desc="案號數字滾動">
          <L6 />
        </Card>
        <Card n={7} name="Three Dashes" desc="三橫線節奏淡入">
          <L7 />
        </Card>
        <Card n={8} name="Balance Scale" desc="天平緩慢擺動">
          <L8 />
        </Card>
        <Card n={9} name="Redaction" desc="逐行遮黑塗改效果">
          <L9 />
        </Card>
        <Card n={10} name="Filing" desc="文件滑入資料夾">
          <L10 />
        </Card>
      </div>

      <Box mt="5" p="4" style={{ border: "1px solid var(--gray-6)", borderRadius: 8, background: "var(--gray-2)", fontSize: 12, color: "var(--gray-9)" }}>
        決定後告知編號，我將替換所有頁面的 <code style={{ fontFamily: "ui-monospace, monospace", background: "var(--gray-4)", padding: "1px 5px", borderRadius: 3 }}>載入中...</code> 為選定樣式的共用元件。
      </Box>
    </div>
  );
}
