"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, MessageSquare, ZoomIn, ZoomOut, X, Send, Navigation, Pin,
  RotateCcw, Maximize2, ChevronDown, ChevronUp, Paperclip, ExternalLink,
} from "lucide-react";
import { MOCK_EMAILS, MOCK_STATS, MOCK_BENEFITS } from "@/lib/mock-data";
import { EmailDetailPanel } from "@/components/email-detail-panel";
import type { AgentAction } from "@/app/api/v1/agent/chat/route";
import { Button, Badge, Text, Box, Flex, IconButton } from "@radix-ui/themes";

// -- Types ----------------------------------------------------

type CardType = "emails_pending" | "emails_recent" | "emails_attachment" | "deadlines" | "stats" | "note";

interface BoardCard {
  id: string; type: CardType; title: string; summary: string;
  x: number; y: number; width: number; color: string; borderColor: string;
  tag?: string; tagColor?: string;
}

interface ChatMsg {
  id: string; role: "user" | "ai"; content: string; action?: AgentAction;
}

// -- Default cards --------------------------------------------

const INITIAL_CARDS: BoardCard[] = [
  { id: "pending",   type: "emails_pending",    title: "待確認信件",   tag: "需處理",    tagColor: "var(--amber-9)", summary: "3 封待確認 -- 需要人工審核",                 x: 0,   y: 0,   width: 284, color: "var(--amber-2)", borderColor: "var(--amber-7)" },
  { id: "recent",    type: "emails_recent",     title: "最新信件",     tag: "今日 3 封", tagColor: "var(--blue-9)", summary: "今天共收到 3 封，最後更新 16:42",           x: 308, y: 0,   width: 300, color: "var(--blue-2)", borderColor: "var(--blue-7)" },
  { id: "attach",    type: "emails_attachment", title: "含附件信件",   tag: "4 封",      tagColor: "var(--purple-9)", summary: "Google Drive 已同步 -- 最新附件 today",     x: 632, y: 0,   width: 268, color: "var(--purple-2)", borderColor: "var(--purple-7)" },
  { id: "deadlines", type: "deadlines",         title: "近期行動期限", tag: "今天",      tagColor: "var(--red-9)", summary: "最近期限：3/17 今天 -- 3/20 3天後",          x: 0,   y: 460, width: 284, color: "var(--red-2)", borderColor: "var(--red-7)" },
  { id: "stats",     type: "stats",             title: "本週統計",     tag: "本週",      tagColor: "var(--green-9)", summary: "47 封 -- 準確率 94.7% -- 省 4.3 hr",         x: 308, y: 460, width: 268, color: "var(--green-2)", borderColor: "var(--green-7)" },
];

const DOT_SIZE = 24;

// -- Main component -------------------------------------------

export default function CanvasPage() {
  const router       = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [cards, setCards]         = useState<BoardCard[]>(INITIAL_CARDS);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set(INITIAL_CARDS.map(c => c.id)));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [offset, setOffset]       = useState({ x: 40, y: 40 });
  const [scale, setScale]         = useState(1);
  const [chatOpen, setChatOpen]   = useState(false);
  const [panelWidth, setPanelWidth] = useState(400);

  const [msgs, setMsgs]           = useState<ChatMsg[]>([{ id: "init", role: "ai", content: "你好！點擊卡片展開信件，點選任一封可在右側查看詳情。或說「帶我去...」直接跳轉頁面。" }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isPanning    = useRef(false);
  const panStart     = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const cardDrag     = useRef<{ id: string; cx: number; cy: number; mx: number; my: number } | null>(null);
  const panelResizing    = useRef(false);
  const panelResizeStart = useRef({ mx: 0, pw: 400 });

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panelResizing.current) return;
      const newW = Math.min(680, Math.max(300, panelResizeStart.current.pw - (e.clientX - panelResizeStart.current.mx)));
      setPanelWidth(newW);
    };
    const onUp = () => {
      if (!panelResizing.current) return;
      panelResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // -- Pan / zoom ---------------------------------------------

  const onContainerDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-card],[data-ui]")) return;
    isPanning.current = true;
    panStart.current  = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
    document.body.style.cursor = "grabbing";
  }, [offset]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (cardDrag.current) {
      const { id, cx, cy, mx, my } = cardDrag.current;
      setCards(prev => prev.map(c => c.id === id ? { ...c, x: cx + (e.clientX - mx) / scale, y: cy + (e.clientY - my) / scale } : c));
      return;
    }
    if (isPanning.current) {
      setOffset({ x: panStart.current.ox + (e.clientX - panStart.current.mx), y: panStart.current.oy + (e.clientY - panStart.current.my) });
    }
  }, [scale]);

  const onMouseUp = useCallback(() => {
    isPanning.current = false; cardDrag.current = null;
    document.body.style.cursor = "";
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.9;
    const ns = Math.min(3, Math.max(0.2, scale * factor));
    setScale(ns);
    setOffset(prev => ({ x: mx - (mx - prev.x) * (ns / scale), y: my - (my - prev.y) * (ns / scale) }));
  }, [scale]);

  const onCardDragStart = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const card = cards.find(c => c.id === id);
    if (card) cardDrag.current = { id, cx: card.x, cy: card.y, mx: e.clientX, my: e.clientY };
  }, [cards]);

  const onPanelResizeDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    panelResizing.current = true;
    panelResizeStart.current = { mx: e.clientX, pw: panelWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [panelWidth]);

  // -- Card actions -------------------------------------------

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const deleteCard = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    setExpanded(prev => { const n = new Set(prev); n.delete(id); return n; });
  }, []);

  const addNoteCard = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = rect ? (rect.width / 2 - offset.x) / scale : 300;
    const cy = rect ? (rect.height / 2 - offset.y) / scale : 200;
    setCards(prev => [...prev, { id: `note-${Date.now()}`, type: "note", title: "筆記", summary: "", x: cx - 130, y: cy - 40, width: 260, color: "var(--gray-2)", borderColor: "var(--gray-6)" }]);
  }, [offset, scale]);

  const pinToCanvas = useCallback((msg: ChatMsg) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = rect ? (rect.width / 2 - offset.x) / scale + (Math.random() - 0.5) * 320 : 400;
    const cy = rect ? (rect.height / 2 - offset.y) / scale + (Math.random() - 0.5) * 160 : 250;
    setCards(prev => [...prev, {
      id: `ai-${msg.id}`, type: "note",
      title: "AI 摘要", summary: msg.content.replace(/\*\*(.+?)\*\*/g, "$1").slice(0, 120) + "...",
      x: cx, y: cy, width: 280, color: "var(--amber-2)", borderColor: "var(--amber-7)", tag: "AI", tagColor: "var(--amber-9)",
    }]);
  }, [offset, scale]);

  const fitAll = useCallback(() => {
    if (!cards.length || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pad = 48, ns = Math.min(
      (rect.width - pad * 2) / (Math.max(...cards.map(c => c.x + c.width)) - Math.min(...cards.map(c => c.x))),
      (rect.height - pad * 2) / (Math.max(...cards.map(c => c.y + 200)) - Math.min(...cards.map(c => c.y))),
      1.4,
    );
    setScale(ns);
    setOffset({ x: pad - Math.min(...cards.map(c => c.x)) * ns, y: pad - Math.min(...cards.map(c => c.y)) * ns });
  }, [cards]);

  // -- Chat ---------------------------------------------------

  const sendChat = useCallback(async (text?: string) => {
    const content = (text ?? chatInput).trim();
    if (!content) return;
    setMsgs(prev => [...prev, { id: Date.now().toString(), role: "user", content }]);
    setChatInput(""); setChatLoading(true);
    try {
      const res  = await fetch("/api/v1/agent/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content }) });
      const json = await res.json();
      setMsgs(prev => [...prev, { id: `${Date.now()}_ai`, role: "ai", content: json.reply, action: json.action }]);
      if (json.action?.auto) setTimeout(() => router.push(json.action.url), 600);
    } catch {
      setMsgs(prev => [...prev, { id: `${Date.now()}_e`, role: "ai", content: "連線錯誤。" }]);
    } finally { setChatLoading(false); }
  }, [chatInput, router]);

  // -- Background dots ----------------------------------------

  const tileSize = DOT_SIZE * scale;
  const bpx = `${((offset.x % tileSize) + tileSize) % tileSize}px`;
  const bpy = `${((offset.y % tileSize) + tileSize) % tileSize}px`;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

      {/* -- Canvas area ----------------------------------------- */}
      <div
        ref={containerRef}
        style={{
          flex: 1, position: "relative", overflow: "hidden", cursor: "grab",
          backgroundImage: "radial-gradient(circle, var(--gray-7) 1.3px, transparent 1.3px)",
          backgroundSize: `${tileSize}px ${tileSize}px`,
          backgroundPosition: `${bpx} ${bpy}`,
          backgroundColor: "var(--gray-2)",
        }}
        onMouseDown={onContainerDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        {/* Canvas transform layer */}
        <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
          {cards.map(card => (
            <CardNode
              key={card.id}
              card={card}
              isExpanded={expanded.has(card.id)}
              isSelected={card.type !== "note" && expanded.has(card.id)}
              onDragStart={onCardDragStart}
              onToggle={toggleExpand}
              onDelete={deleteCard}
              onSelectEmail={(id) => { setSelectedId(id); }}
              onNavigate={(url) => router.push(url)}
            />
          ))}
        </div>

        {/* Floating chat */}
        {chatOpen && (
          <FloatingChat
            msgs={msgs} input={chatInput} loading={chatLoading} bottomRef={chatBottomRef}
            onInput={setChatInput} onSend={sendChat}
            onClose={() => setChatOpen(false)} onPin={pinToCanvas}
            onNavigate={(url) => router.push(url)}
          />
        )}

        {/* Bottom toolbar */}
        <div data-ui style={{
          position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 2,
          background: "var(--color-background)", border: "1px solid var(--gray-6)",
          borderRadius: 10, padding: "4px 8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.10)", zIndex: 50,
        }}>
          <ToolBtn icon={<MessageSquare size={14} />} label="AI 助理" onClick={() => setChatOpen(v => !v)} active={chatOpen} />
          <Sep />
          <ToolBtn icon={<Plus size={14} />} label="筆記" onClick={addNoteCard} />
          <Sep />
          <ToolBtn icon={<ZoomIn size={13} />} onClick={() => setScale(s => Math.min(3, s * 1.15))} />
          <Text size="1" style={{ color: "var(--gray-9)", minWidth: 36, textAlign: "center" }}>{Math.round(scale * 100)}%</Text>
          <ToolBtn icon={<ZoomOut size={13} />} onClick={() => setScale(s => Math.max(0.2, s / 1.15))} />
          <Sep />
          <ToolBtn icon={<Maximize2 size={13} />} label="全部" onClick={fitAll} />
          <ToolBtn icon={<RotateCcw size={13} />} label="重置" onClick={() => { setOffset({ x: 40, y: 40 }); setScale(1); }} />
        </div>

        {/* Card count */}
        <div data-ui style={{
          position: "absolute", top: 12, right: 12, fontSize: 11, color: "var(--gray-8)",
          background: "var(--color-background)", border: "1px solid var(--gray-6)",
          padding: "3px 9px", borderRadius: 6, zIndex: 50,
        }}>
          {cards.length} 張卡片{selectedId ? " -- 右側查看詳情" : " -- 點擊展開"}
        </div>
      </div>

      {/* -- Right detail panel ---------------------------------- */}
      <div style={{
        width: selectedId ? panelWidth : 0,
        overflow: "hidden",
        borderLeft: selectedId ? "1px solid var(--gray-6)" : "none",
        background: "var(--color-background)",
        flexShrink: 0,
        display: "flex", flexDirection: "column",
        position: "relative",
      }}>
        {selectedId && (
          <>
            {/* Resize handle on left edge */}
            <div
              onMouseDown={onPanelResizeDown}
              style={{
                position: "absolute", left: -3, top: 0, bottom: 0, width: 6,
                cursor: "col-resize", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <div style={{ width: 2, height: 32, borderRadius: 2, background: "var(--gray-7)", opacity: 0.5 }} />
            </div>
            <EmailDetailPanel
              emailId={selectedId}
              onClose={() => setSelectedId(null)}
              onNavigate={(url) => router.push(url)}
            />
          </>
        )}
      </div>
    </div>
  );
}

// -- Card node ------------------------------------------------

function CardNode({ card, isExpanded, isSelected, onDragStart, onToggle, onDelete, onSelectEmail, onNavigate }: {
  card: BoardCard; isExpanded: boolean; isSelected: boolean;
  onDragStart: (e: React.MouseEvent, id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectEmail: (id: string) => void;
  onNavigate: (url: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      data-card
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "absolute", left: card.x, top: card.y, width: card.width,
        background: card.color,
        border: `1.5px solid ${hovered || isExpanded ? card.borderColor : "var(--gray-6)"}`,
        borderRadius: 10, overflow: "hidden",
        boxShadow: isExpanded ? "0 12px 40px rgba(0,0,0,0.14)" : hovered ? "0 6px 20px rgba(0,0,0,0.10)" : "0 2px 8px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={(e) => onDragStart(e, card.id)}
        style={{
          padding: "11px 13px 10px", cursor: "grab",
          borderBottom: isExpanded ? "1px solid var(--gray-6)" : "none",
          background: isExpanded ? "rgba(255,255,255,0.55)" : "transparent",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {card.tag && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: card.tagColor ?? "var(--gray-9)", textTransform: "uppercase", marginBottom: 4 }}>{card.tag}</div>}
            <Text size="2" weight="bold" style={{ color: "var(--gray-12)", lineHeight: 1.3 }}>{card.title}</Text>
            {!isExpanded && card.summary && <Text size="1" style={{ color: "var(--gray-9)", display: "block", marginTop: 5, lineHeight: 1.5 }}>{card.summary}</Text>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 6, flexShrink: 0 }}>
            {hovered && (
              <button onMouseDown={(e) => e.stopPropagation()} onClick={() => onDelete(card.id)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--gray-8)", padding: 2, borderRadius: 3 }}>
                <X size={11} />
              </button>
            )}
            {card.type !== "note" && (
              <button onMouseDown={(e) => e.stopPropagation()} onClick={() => onToggle(card.id)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--gray-9)", padding: 2, borderRadius: 3 }}>
                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div onMouseDown={(e) => e.stopPropagation()} style={{ maxHeight: 340, overflowY: "auto" }}>
          <ExpandedContent card={card} onSelectEmail={onSelectEmail} onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
}

// -- Expanded content by type ---------------------------------

function ViewAllBtn({ url, label, onNavigate }: { url: string; label: string; onNavigate: (url: string) => void }) {
  return (
    <div style={{ padding: "8px 13px", borderTop: "1px solid var(--gray-6)" }}>
      <button
        onClick={(e) => { e.stopPropagation(); onNavigate(url); }}
        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--gray-9)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <ExternalLink size={10} /> {label}
      </button>
    </div>
  );
}

function ExpandedContent({ card, onSelectEmail, onNavigate }: {
  card: BoardCard;
  onSelectEmail: (id: string) => void;
  onNavigate: (url: string) => void;
}) {
  const pending = MOCK_EMAILS.filter(e => e.status === "pending");
  const recent  = [...MOCK_EMAILS].sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()).slice(0, 6);
  const withAtt = MOCK_EMAILS.filter(e => e.has_attachments);
  const codeColor: Record<string, string> = { FA: "var(--blue-9)", FC: "var(--purple-9)", TA: "var(--green-9)", TC: "var(--amber-9)", FG: "var(--red-9)", TG: "var(--gray-9)", FX: "var(--gray-8)" };
  const statusLabel: Record<string, string> = { pending: "待確認", confirmed: "已確認", corrected: "已修正", failed: "失敗" };
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" });

  if (card.type === "emails_pending") return (
    <div>
      {pending.length === 0
        ? <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: "var(--gray-8)" }}>沒有待確認信件</div>
        : pending.map((e, i) => <EmailRow key={e.id} e={e} codeColor={codeColor} statusLabel={statusLabel} fmt={fmt} isLast={i === pending.length - 1} onClick={() => onSelectEmail(e.id)} />)
      }
      <ViewAllBtn url="/app/emails?status=pending" label="查看全部待確認" onNavigate={onNavigate} />
    </div>
  );

  if (card.type === "emails_recent") return (
    <div>
      {recent.map((e, i) => <EmailRow key={e.id} e={e} codeColor={codeColor} statusLabel={statusLabel} fmt={fmt} isLast={i === recent.length - 1} onClick={() => onSelectEmail(e.id)} />)}
      <ViewAllBtn url="/app/emails" label="查看全部信件" onNavigate={onNavigate} />
    </div>
  );

  if (card.type === "emails_attachment") return (
    <div>
      {withAtt.map((e, i) => (
        <div key={e.id} onClick={(ev) => { ev.stopPropagation(); onSelectEmail(e.id); }}
          style={{ padding: "9px 13px", borderBottom: i < withAtt.length - 1 ? "1px solid var(--gray-6)" : "none", cursor: "pointer", transition: "background 0.1s" }}
          onMouseEnter={el => (el.currentTarget.style.background = "rgba(0,0,0,0.03)")}
          onMouseLeave={el => (el.currentTarget.style.background = "transparent")}
        >
          <div style={{ display: "flex", gap: 7 }}>
            <Paperclip size={12} color="var(--gray-8)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--gray-12)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: codeColor[e.direction_code ?? ""] ?? "var(--gray-8)", background: "rgba(0,0,0,0.05)", padding: "0 4px", borderRadius: 3 }}>{e.direction_code}</span>
                <span style={{ fontSize: 10, color: "var(--gray-8)" }}>{e.sender_name}</span>
                <span style={{ fontSize: 10, color: "var(--gray-8)", marginLeft: "auto" }}>{fmt(e.received_at)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
      <ViewAllBtn url="/app/settings/storage" label="管理儲存空間" onNavigate={onNavigate} />
    </div>
  );

  if (card.type === "deadlines") {
    const items = [
      { date: "3/17", label: "BRIT25710PUS1 OA 答辯草稿審閱", type: "FA", daysLeft: 0, id: "e001" },
      { date: "3/20", label: "KOIT20004TUS7 TA 委託答辯草稿", type: "TA", daysLeft: 3, id: "e002" },
      { date: "4/15", label: "BRIT25710PUS1 USPTO 官方 OA",   type: "官方", daysLeft: 29, id: "e001" },
      { date: "6/15", label: "KOIT20004TUS7 USPTO OA2 官方",  type: "官方", daysLeft: 90, id: "e002" },
    ];
    const uc = (d: number) => d === 0 ? "var(--red-9)" : d <= 5 ? "var(--amber-9)" : "var(--gray-9)";
    return (
      <div>
        {items.map((d, i) => (
          <div key={i} onClick={(ev) => { ev.stopPropagation(); onSelectEmail(d.id); }}
            style={{ padding: "9px 13px", borderBottom: i < items.length - 1 ? "1px solid var(--gray-6)" : "none", cursor: "pointer", transition: "background 0.1s" }}
            onMouseEnter={el => (el.currentTarget.style.background = "rgba(0,0,0,0.03)")}
            onMouseLeave={el => (el.currentTarget.style.background = "transparent")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ minWidth: 32, fontSize: 11, fontWeight: 700, color: uc(d.daysLeft), textAlign: "center" }}>{d.date}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--gray-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: "var(--gray-8)", background: "rgba(0,0,0,0.05)", padding: "0 4px", borderRadius: 3 }}>{d.type}</span>
                  <span style={{ fontSize: 10, color: uc(d.daysLeft), fontWeight: d.daysLeft <= 5 ? 600 : 400 }}>{d.daysLeft === 0 ? "今天" : `${d.daysLeft} 天後`}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        <ViewAllBtn url="/app/emails?status=pending" label="查看待確認信件" onNavigate={onNavigate} />
      </div>
    );
  }

  if (card.type === "stats") return (
    <div style={{ padding: "12px 14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { label: "處理封數", value: `${MOCK_STATS.this_week} 封` },
          { label: "準確率",   value: `${(MOCK_STATS.accuracy_rate * 100).toFixed(1)}%` },
          { label: "省下工時", value: `${MOCK_STATS.hours_saved.toFixed(1)} hr` },
          { label: "API 成本", value: `$${MOCK_STATS.api_cost_usd.toFixed(2)}` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "rgba(0,0,0,0.04)", borderRadius: 7, padding: "8px 10px" }}>
            <Text size="1" style={{ color: "var(--gray-8)", display: "block", marginBottom: 2 }}>{label}</Text>
            <Text style={{ fontSize: 16, fontWeight: 700, color: "var(--gray-12)", letterSpacing: "-0.02em" }}>{value}</Text>
          </div>
        ))}
      </div>
      <Text size="1" style={{ color: "var(--gray-8)", display: "block", marginBottom: 6 }}>每日處理封數</Text>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 40 }}>
        {MOCK_BENEFITS.map(b => {
          const max = Math.max(...MOCK_BENEFITS.map(x => x.emails_processed));
          return (
            <div key={b.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ width: "100%", height: Math.round((b.emails_processed / max) * 36), background: "var(--green-7)", borderRadius: 2 }} />
              <span style={{ fontSize: 9, color: "var(--gray-8)" }}>{b.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onNavigate("/app/stats"); }}
        style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, fontSize: 11, color: "var(--gray-9)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <ExternalLink size={10} /> 查看完整統計
      </button>
    </div>
  );

  return null;
}

function EmailRow({ e, codeColor, statusLabel, fmt, isLast, onClick }: {
  e: any; codeColor: Record<string, string>; statusLabel: Record<string, string>;
  fmt: (s: string) => string; isLast: boolean; onClick: () => void;
}) {
  const sc = e.status === "confirmed" ? "var(--green-9)" : e.status === "failed" ? "var(--red-9)" : "var(--amber-9)";
  return (
    <div onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ padding: "9px 13px", borderBottom: isLast ? "none" : "1px solid var(--gray-6)", cursor: "pointer", transition: "background 0.1s" }}
      onMouseEnter={el => (el.currentTarget.style.background = "rgba(0,0,0,0.03)")}
      onMouseLeave={el => (el.currentTarget.style.background = "transparent")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: codeColor[e.direction_code ?? ""] ?? "var(--gray-8)", background: "rgba(0,0,0,0.05)", padding: "0 4px", borderRadius: 3, flexShrink: 0 }}>{e.direction_code ?? "?"}</span>
        <span style={{ fontSize: 12, color: "var(--gray-12)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{e.subject}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, color: "var(--gray-8)", flex: 1 }}>{e.sender_name}</span>
        {e.status && <span style={{ fontSize: 9, fontWeight: 600, color: sc, background: "rgba(0,0,0,0.05)", padding: "1px 5px", borderRadius: 3 }}>{statusLabel[e.status] ?? ""}</span>}
        <span style={{ fontSize: 10, color: "var(--gray-8)" }}>{fmt(e.received_at)}</span>
      </div>
    </div>
  );
}

// -- Floating chat --------------------------------------------

function FloatingChat({ msgs, input, loading, bottomRef, onInput, onSend, onClose, onPin, onNavigate }: {
  msgs: ChatMsg[]; input: string; loading: boolean; bottomRef: React.RefObject<HTMLDivElement | null>;
  onInput: (v: string) => void; onSend: (text?: string) => void;
  onClose: () => void; onPin: (msg: ChatMsg) => void; onNavigate: (url: string) => void;
}) {
  return (
    <div data-ui onMouseDown={(e) => e.stopPropagation()} style={{
      position: "absolute", left: 16, top: 16,
      width: 308, height: 480,
      background: "var(--color-background)", border: "1px solid var(--gray-6)",
      borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.13)",
      zIndex: 100, display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <Flex align="center" justify="between" style={{ padding: "10px 12px", borderBottom: "1px solid var(--gray-6)", background: "var(--gray-3)", flexShrink: 0 }}>
        <Flex align="center" gap="2">
          <div style={{ width: 20, height: 20, borderRadius: 5, background: "var(--gray-12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare size={11} color="var(--color-background)" />
          </div>
          <Text size="2" weight="bold" style={{ color: "var(--gray-12)" }}>AI 助理</Text>
          <Badge variant="soft" color="gray" size="1">畫布</Badge>
        </Flex>
        <IconButton variant="ghost" size="1" onClick={onClose}><X size={13} /></IconButton>
      </Flex>
      <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {msgs.map(msg => (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div className={msg.role === "user" ? "agent-msg-user" : "agent-msg-ai"} style={{ whiteSpace: "pre-wrap", fontSize: 12 }}
              dangerouslySetInnerHTML={{ __html: msg.role === "ai"
                ? msg.content.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/`(.+?)`/g,"<code style='background:rgba(0,0,0,0.07);padding:1px 3px;border-radius:3px;font-size:10px'>$1</code>")
                : msg.content }}
            />
            {msg.role === "ai" && (
              <Flex gap="1" mt="1" wrap="wrap">
                <Button variant="ghost" size="1" onClick={() => onPin(msg)} style={{ gap: 3, fontSize: 10 }}>
                  <Pin size={9} /> 固定到畫布
                </Button>
                {msg.action && (
                  <Button variant="solid" size="1" onClick={() => onNavigate(msg.action!.url)} style={{ gap: 3, fontSize: 10 }}>
                    <Navigation size={9} /> {msg.action.label}
                  </Button>
                )}
              </Flex>
            )}
          </div>
        ))}
        {loading && <div className="agent-msg-ai" style={{ color: "var(--gray-8)", fontSize: 12 }}><span style={{ letterSpacing: 2 }}>...</span></div>}
        <div ref={bottomRef} />
      </div>
      <Flex gap="2" align="center" style={{ padding: "8px 10px", borderTop: "1px solid var(--gray-6)", flexShrink: 0 }}>
        <input value={input} onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSend(); } }}
          placeholder="問問 AI，或說「帶我去...」"
          style={{ flex: 1, border: "1px solid var(--gray-6)", borderRadius: 6, padding: "6px 9px", fontSize: 12, outline: "none", background: "var(--color-background)", color: "var(--gray-12)" }}
        />
        <Button variant="solid" color="green" size="1" onClick={() => onSend()} disabled={loading || !input.trim()}
          style={{ height: 30, width: 30, padding: 0, justifyContent: "center", flexShrink: 0 }}>
          <Send size={11} />
        </Button>
      </Flex>
    </div>
  );
}

// -- Helpers --------------------------------------------------

function Sep() { return <div style={{ width: 1, height: 18, background: "var(--gray-6)", margin: "0 3px" }} />; }

function ToolBtn({ icon, label, onClick, active }: { icon: React.ReactNode; label?: string; onClick: () => void; active?: boolean; }) {
  return (
    <Button data-ui variant={active ? "solid" : "ghost"} color={active ? "green" : "gray"} size="1" onClick={onClick} style={{ padding: label ? "4px 8px" : "4px 6px", gap: 4 }}>
      {icon}
      {label && <span style={{ fontSize: 12 }}>{label}</span>}
    </Button>
  );
}
