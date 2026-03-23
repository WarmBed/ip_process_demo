"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, IconButton, TextArea } from "@radix-ui/themes";
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
  { label: "IP概況", items: ["目前有幾件OA待答辯", "7天內截止案件", "年費即將到期"] },
  { label: "查案", items: ["TSMC23014PUS 進度", "台積電的案件", "今日官方來文"] },
  { label: "人員", items: ["陳建志目前loading", "各專利師工作量", "誰的OA最多"] },
  { label: "跳轉", items: ["帶我去截止期限", "帶我去人員管理", "前往統計頁面"] },
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
    content: "你好，我是 IP Winner 助理。\n\n可以查詢案件進度、截止期限、人員工作量，也可以說「帶我去…」直接跳轉頁面。\n\n試試下方的範例問題。",
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
      <div style={{ width: 40, borderRight: "1px solid var(--gray-6)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 8, background: "var(--gray-2)" }}>
        <IconButton variant="ghost" size="1" color="gray" onClick={() => setCollapsed(false)} title="展開助理">
          <ChevronRight size={16} />
        </IconButton>
        <Bot size={16} color="var(--gray-9)" />
      </div>
    );
  }

  return (
    <div style={{
      width, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH,
      borderRight: "1px solid var(--gray-6)",
      display: "flex", flexDirection: "column",
      background: "var(--gray-1)", flexShrink: 0, position: "relative",
    }}>
      {/* Drag handle */}
      <div onMouseDown={onResizeDown} style={{
        position: "absolute", right: -3, top: 0, bottom: 0, width: 6,
        cursor: "col-resize", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 2, height: 32, borderRadius: 2, background: "var(--gray-7)", opacity: 0.5 }} />
      </div>

      {/* Header */}
      <div style={{
        padding: "10px 12px", borderBottom: "1px solid var(--gray-6)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Bot size={14} color="var(--gray-9)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-12)" }}>助理</span>
        </div>
        <IconButton variant="ghost" size="1" color="gray" onClick={() => setCollapsed(true)}>
          <ChevronLeft size={14} />
        </IconButton>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.image && (
              <img src={msg.image} alt="uploaded" style={{ maxWidth: 160, borderRadius: 8, marginBottom: 4, border: "1px solid var(--gray-6)" }} />
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
              <Button
                variant="solid"
                size="1"
                color="green"
                onClick={() => router.push(msg.action!.url)}
                style={{ marginTop: 6, gap: 5 }}
              >
                <Navigation size={10} /> {msg.action.label}
              </Button>
            )}
            <span style={{ fontSize: 10, color: "var(--gray-9)", marginTop: 2 }}>
              {msg.timestamp.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div className="agent-msg-ai" style={{ color: "var(--gray-9)" }}><span style={{ letterSpacing: 2 }}>...</span></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div style={{ padding: "0 10px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
          {SUGGESTION_GROUPS.map(group => (
            <div key={group.label}>
              <div style={{ fontSize: 10, color: "var(--gray-9)", fontWeight: 600, marginBottom: 4, paddingLeft: 2 }}>{group.label}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {group.items.map(s => (
                  <Button key={s} variant="outline" size="1" color="gray" onClick={() => sendMessage(s)} style={{ fontSize: 11 }}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image preview */}
      {pendingImage && (
        <div style={{ padding: "0 10px 6px", position: "relative", display: "inline-block" }}>
          <img src={pendingImage} alt="preview" style={{ height: 56, borderRadius: 6, border: "1px solid var(--gray-6)" }} />
          <button onClick={() => setPendingImage(null)} style={{ position: "absolute", top: -4, right: 14, background: "var(--gray-12)", color: "white", border: "none", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={10} />
          </button>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "8px 10px", borderTop: "1px solid var(--gray-6)", display: "flex", gap: 6, alignItems: "flex-end" }}>
        <div style={{ flex: 1, border: "1px solid var(--gray-6)", borderRadius: 8, background: "var(--color-background)", display: "flex", alignItems: "flex-end", padding: "6px 8px", gap: 4 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="輸入問題或說「帶我去…」"
            rows={1}
            style={{ flex: 1, border: "none", outline: "none", resize: "none", fontSize: 13, lineHeight: 1.5, background: "transparent", color: "var(--gray-12)", fontFamily: "inherit", maxHeight: 80, overflowY: "auto" }}
          />
          <IconButton variant="ghost" size="1" color="gray" onClick={() => fileRef.current?.click()} title="上傳圖片">
            <ImageIcon size={14} />
          </IconButton>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
        </div>
        <Button
          variant="solid"
          size="2"
          color="green"
          onClick={() => sendMessage()}
          disabled={loading || (!input.trim() && !pendingImage)}
          style={{ width: 34, height: 34, padding: 0, justifyContent: "center", flexShrink: 0 }}
        >
          <Send size={13} />
        </Button>
      </div>
    </div>
  );
}
