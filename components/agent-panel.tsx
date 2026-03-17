"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Send, Bot, X, ChevronLeft, ChevronRight, Image as ImageIcon, Navigation,
} from "lucide-react";
import type { AgentAction } from "@/app/api/v1/agent/chat/route";

const MIN_WIDTH = 200;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 280;

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  image?: string;
  action?: AgentAction;
  timestamp: Date;
}

const SUGGESTION_GROUPS = [
  { label: "📊 統計", items: ["今天處理了幾封？", "本週統計", "累計成本多少？"] },
  { label: "📋 信件", items: ["有哪些待確認？", "最新 5 封信件", "有附件的信件"] },
  { label: "📁 案號", items: ["BRIT25710PUS1 的信件", "KOIT20004TUS7 最新狀態"] },
  { label: "🧭 跳轉", items: ["帶我去信件列表", "帶我去分類規則", "前往統計頁面"] },
];

export default function AgentPanel() {
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth]         = useState(DEFAULT_WIDTH);
  const isDragging                = useRef(false);
  const startX                    = useRef(0);
  const startWidth                = useRef(DEFAULT_WIDTH);

  const onResizeDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current     = e.clientX;
    startWidth.current = width;
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + (e.clientX - startX.current)));
      setWidth(newWidth);
    };
    const onUp = () => {
      isDragging.current             = false;
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, []);

  const [messages, setMessages] = useState<Message[]>([{
    id: "init", role: "ai",
    content: "你好！我是 MailFlow AI。\n\n可以用自然語言查詢信件、統計、案號，也可以說「帶我去…」直接跳轉頁面。",
    timestamp: new Date(),
  }]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content && !pendingImage) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content, image: pendingImage ?? undefined, timestamp: new Date() }]);
    setInput(""); setPendingImage(null); setLoading(true);
    try {
      const res  = await fetch("/api/v1/agent/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content }) });
      const json = await res.json() as { reply: string; action?: AgentAction };
      setMessages(prev => [...prev, { id: `${Date.now()}_ai`, role: "ai", content: json.reply, action: json.action, timestamp: new Date() }]);
      if (json.action?.auto) setTimeout(() => router.push(json.action!.url), 600);
    } catch {
      setMessages(prev => [...prev, { id: `${Date.now()}_err`, role: "ai", content: "連線錯誤，請稍後再試。", timestamp: new Date() }]);
    } finally { setLoading(false); }
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPendingImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (collapsed) {
    return (
      <div style={{ width: 40, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 8, background: "var(--sl2)" }}>
        <button className="btn-ghost" onClick={() => setCollapsed(false)} title="展開 AI 助理"><ChevronRight size={16} /></button>
        <Bot size={16} color="var(--fg-subtle)" />
      </div>
    );
  }

  return (
    <div style={{
      width, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH,
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      background: "var(--sl1)", flexShrink: 0, position: "relative",
    }}>
      {/* Drag handle */}
      <div onMouseDown={onResizeDown} style={{
        position: "absolute", right: -3, top: 0, bottom: 0, width: 6,
        cursor: "col-resize", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 2, height: 32, borderRadius: 2, background: "var(--sl7)", opacity: 0.5 }} />
      </div>

      {/* Header */}
      <div style={{
        padding: "10px 12px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Bot size={14} color="var(--fg-muted)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>AI 助理</span>
        </div>
        <button className="btn-ghost" onClick={() => setCollapsed(true)} style={{ padding: "2px 4px" }}>
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.image && (
              <img src={msg.image} alt="uploaded" style={{ maxWidth: 160, borderRadius: 8, marginBottom: 4, border: "1px solid var(--border)" }} />
            )}
            <div
              className={msg.role === "user" ? "agent-msg-user" : "agent-msg-ai"}
              style={{ whiteSpace: "pre-wrap" }}
              dangerouslySetInnerHTML={{ __html: msg.role === "ai"
                ? msg.content
                    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
                    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
                    .replace(/`(.+?)`/g,"<code style='background:rgba(0,0,0,0.08);padding:1px 4px;border-radius:3px;font-size:11px'>$1</code>")
                : msg.content }}
            />
            {msg.role === "ai" && msg.action && (
              <button
                onClick={() => router.push(msg.action!.url)}
                style={{
                  marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 5,
                  background: "var(--fg)", color: "var(--bg)", border: "none", cursor: "pointer", opacity: 0.88,
                }}
              >
                <Navigation size={10} /> {msg.action.label}
              </button>
            )}
            <span style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 2 }}>
              {msg.timestamp.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div className="agent-msg-ai" style={{ color: "var(--fg-subtle)" }}><span style={{ letterSpacing: 2 }}>●●●</span></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (shown only before first user message) */}
      {messages.length === 1 && (
        <div style={{ padding: "0 10px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
          {SUGGESTION_GROUPS.map(group => (
            <div key={group.label}>
              <div style={{ fontSize: 10, color: "var(--fg-subtle)", fontWeight: 600, marginBottom: 4, paddingLeft: 2 }}>{group.label}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {group.items.map(s => (
                  <button key={s} onClick={() => sendMessage(s)} style={{
                    fontSize: 11, padding: "3px 9px", borderRadius: 5,
                    border: "1px solid var(--border)", background: "var(--sl3)",
                    color: "var(--fg-muted)", cursor: "pointer",
                  }}>{s}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image preview */}
      {pendingImage && (
        <div style={{ padding: "0 10px 6px", position: "relative", display: "inline-block" }}>
          <img src={pendingImage} alt="preview" style={{ height: 56, borderRadius: 6, border: "1px solid var(--border)" }} />
          <button onClick={() => setPendingImage(null)} style={{ position: "absolute", top: -4, right: 14, background: "var(--fg)", color: "var(--bg)", border: "none", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={10} />
          </button>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border)", display: "flex", gap: 6, alignItems: "flex-end" }}>
        <div style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", display: "flex", alignItems: "flex-end", padding: "6px 8px", gap: 4 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="輸入問題或說「帶我去…」"
            rows={1}
            style={{ flex: 1, border: "none", outline: "none", resize: "none", fontSize: 13, lineHeight: 1.5, background: "transparent", color: "var(--fg)", fontFamily: "inherit", maxHeight: 80, overflowY: "auto" }}
          />
          <button className="btn-ghost" onClick={() => fileRef.current?.click()} style={{ padding: "2px 3px", flexShrink: 0 }} title="上傳圖片">
            <ImageIcon size={14} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
        </div>
        <button
          className="btn-primary"
          onClick={() => sendMessage()}
          disabled={loading || (!input.trim() && !pendingImage)}
          style={{ height: 34, width: 34, padding: 0, justifyContent: "center", flexShrink: 0 }}
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}
