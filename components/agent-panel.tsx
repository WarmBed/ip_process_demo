"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, IconButton } from "@radix-ui/themes";
import {
  Send, Bot, X, Image as ImageIcon, Navigation, ChevronDown,
} from "lucide-react";
import type { AgentAction } from "@/app/api/v1/agent/chat/route";

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
  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([{
    id: "init", role: "ai",
    content: "你好，我是 IP Winner 助理。\n\n可以查詢案件進度、截止期限、人員工作量，也可以說「帶我去…」直接跳轉頁面。",
    timestamp: new Date(),
  }]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content && !pendingImage) return;
    if (!open) setOpen(true);
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

  const hasConversation = messages.length > 1;

  return (
    <>
      {/* Backdrop when open */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 90,
            background: "rgba(0,0,0,0.08)",
            transition: "opacity 0.15s",
          }}
        />
      )}

      {/* Floating panel — bottom center */}
      <div style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        width: open ? 520 : 420,
        transition: "width 0.15s",
      }}>

        {/* Expanded chat area */}
        {open && (
          <div style={{
            background: "var(--color-background)",
            border: "1px solid var(--gray-6)",
            borderBottom: "none",
            borderRadius: "10px 10px 0 0",
            display: "flex",
            flexDirection: "column",
            maxHeight: 420,
            overflow: "hidden",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
          }}>
            {/* Header */}
            <div style={{
              padding: "8px 12px",
              borderBottom: "1px solid var(--gray-6)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Bot size={14} color="var(--green-9)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-12)" }}>助理</span>
              </div>
              <IconButton variant="ghost" size="1" color="gray" onClick={() => setOpen(false)}>
                <ChevronDown size={14} />
              </IconButton>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
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

            {/* Suggestions — only show before first user message */}
            {!hasConversation && (
              <div style={{ padding: "0 14px 10px", display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--gray-4)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--gray-9)", paddingTop: 8 }}>試試看</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {SUGGESTION_GROUPS.flatMap(g => g.items).slice(0, 6).map(s => (
                    <button key={s} onClick={() => sendMessage(s)} style={{
                      fontSize: 11, padding: "3px 9px", borderRadius: 4,
                      border: "1px solid var(--gray-6)", background: "var(--color-background)",
                      color: "var(--gray-11)", cursor: "pointer",
                      transition: "background 0.12s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--gray-3)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--color-background)"}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input bar — always visible */}
        <div style={{
          background: "var(--color-background)",
          border: "1px solid var(--gray-6)",
          borderRadius: open ? "0 0 10px 10px" : 10,
          padding: "8px 10px",
          display: "flex", gap: 6, alignItems: "flex-end",
          boxShadow: open ? "0 4px 24px rgba(0,0,0,0.08)" : "0 2px 12px rgba(0,0,0,0.06)",
        }}>
          {/* Bot icon — click to toggle */}
          <IconButton
            variant="ghost"
            size="1"
            color={open ? "green" : "gray"}
            onClick={() => setOpen(!open)}
            style={{ flexShrink: 0 }}
          >
            <Bot size={15} />
          </IconButton>

          {/* Image preview */}
          {pendingImage && (
            <div style={{ position: "relative" }}>
              <img src={pendingImage} alt="preview" style={{ height: 32, borderRadius: 4, border: "1px solid var(--gray-6)" }} />
              <button onClick={() => setPendingImage(null)} style={{ position: "absolute", top: -4, right: -4, background: "var(--gray-12)", color: "white", border: "none", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={8} />
              </button>
            </div>
          )}

          {/* Text input */}
          <div style={{
            flex: 1, border: "1px solid var(--gray-5)", borderRadius: 6,
            background: "var(--gray-2)", display: "flex", alignItems: "flex-end",
            padding: "5px 8px", gap: 4,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => { if (!open) setOpen(true); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="輸入問題或說「帶我去…」"
              rows={1}
              style={{
                flex: 1, border: "none", outline: "none", resize: "none",
                fontSize: 13, lineHeight: 1.5, background: "transparent",
                color: "var(--gray-12)", fontFamily: "inherit",
                maxHeight: 60, overflowY: "auto",
              }}
            />
            <IconButton variant="ghost" size="1" color="gray" onClick={() => fileRef.current?.click()} title="上傳圖片">
              <ImageIcon size={13} />
            </IconButton>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
          </div>

          {/* Send */}
          <Button
            variant="solid"
            size="1"
            color="green"
            onClick={() => sendMessage()}
            disabled={loading || (!input.trim() && !pendingImage)}
            style={{ width: 30, height: 30, padding: 0, justifyContent: "center", flexShrink: 0 }}
          >
            <Send size={12} />
          </Button>
        </div>
      </div>
    </>
  );
}
