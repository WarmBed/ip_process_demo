import { NextRequest, NextResponse } from "next/server";
import { MOCK_EMAILS, MOCK_SENDERS, MOCK_STATS, MOCK_BENEFITS } from "@/lib/mock-data";

// ── Types ─────────────────────────────────────────────────────

export interface AgentAction {
  type: "navigate";
  url: string;
  label: string;
  auto?: boolean; // true = panel auto-navigates after 600ms
}

export interface AgentResponse {
  reply: string;
  action?: AgentAction;
}

// ── Helpers ───────────────────────────────────────────────────

function match(q: string, keywords: string[]): boolean {
  return keywords.some((k) => q.includes(k));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" });
}

function codeDesc(code: string) {
  const m: Record<string, string> = {
    FA: "代理人來信", FC: "客戶來信", TA: "寄給代理人", TC: "寄給客戶",
    FG: "政府來文", TG: "寄給政府", FX: "未知來源", TX: "寄給未知",
  };
  return m[code] ?? code;
}

// Detect explicit "take me to / open / go to" intent
function isNavIntent(q: string): boolean {
  return match(q, ["帶我", "前往", "開啟", "跳到", "go to", "open", "帶我去", "到"]);
}

// ── Response builder ──────────────────────────────────────────

function buildResponse(message: string): AgentResponse {
  const q = message.toLowerCase()
    .replace(/[？?！!。，,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const navIntent = isNavIntent(q);

  // ── 明確頁面導航 ──────────────────────────────────────────

  if (navIntent && match(q, ["信件", "email", "郵件", "收件"])) {
    const url = match(q, ["待確認", "pending"]) ? "/app/emails?status=pending"
              : match(q, ["失敗", "failed"])     ? "/app/emails?status=failed"
              : match(q, ["已確認", "confirmed"]) ? "/app/emails?status=confirmed"
              : "/app/emails";
    return { reply: `好的，帶你去信件列表！`, action: { type: "navigate", url, label: "開啟信件列表", auto: true } };
  }

  if (navIntent && match(q, ["規則", "分類規則", "rule"])) {
    return { reply: `好的，帶你去分類規則頁面！`, action: { type: "navigate", url: "/app/rules", label: "開啟分類規則", auto: true } };
  }

  if (navIntent && match(q, ["統計", "stat", "圖表", "效益"])) {
    return { reply: `好的，帶你去統計頁面！`, action: { type: "navigate", url: "/app/stats", label: "開啟統計", auto: true } };
  }

  if (navIntent && match(q, ["sender", "寄件人", "名單"])) {
    return { reply: `好的，帶你去 Sender 名單！`, action: { type: "navigate", url: "/app/senders", label: "開啟 Sender 名單", auto: true } };
  }

  if (navIntent && match(q, ["設定", "setting", "儲存", "storage", "連接"])) {
    const url = match(q, ["儲存", "storage", "drive", "onedrive", "dropbox"]) ? "/app/settings/storage" : "/app/settings";
    return { reply: `好的，帶你去設定頁面！`, action: { type: "navigate", url, label: "開啟設定", auto: true } };
  }

  if (navIntent && match(q, ["總覽", "首頁", "overview", "home", "dashboard"])) {
    return { reply: `好的，帶你回總覽！`, action: { type: "navigate", url: "/app", label: "開啟總覽", auto: true } };
  }

  // ── 統計 / 概覽 ──────────────────────────────────────────

  if (match(q, ["今天", "today", "3/17", "3月17"])) {
    const today = MOCK_EMAILS.filter((e) => e.received_at.startsWith("2026-03-17"));
    const codes = [...new Set(today.map((e) => e.direction_code).filter(Boolean))];
    return {
      reply: [
        `📊 **今天（3/17）共收到 ${today.length} 封信件**`,
        "",
        today.map((e) =>
          `• \`${e.direction_code ?? "?"}\` ${e.sender_name} — ${e.subject.slice(0, 30)}...`
        ).join("\n"),
        "",
        `收發碼分布：${codes.map((c) => `${c}(${today.filter((e) => e.direction_code === c).length})`).join("、")}`,
        `AI 信心平均：${Math.round(today.filter(e=>e.confidence).reduce((s,e)=>s+(e.confidence??0),0)/today.filter(e=>e.confidence).length*100)}%`,
      ].join("\n"),
      action: { type: "navigate", url: "/app/emails?search=2026-03-17", label: "查看今天的信件" },
    };
  }

  if (match(q, ["本週", "這週", "this week"])) {
    return {
      reply: [
        `📊 **本週處理統計（3/13 ~ 3/17）**`,
        "",
        `• 總處理封數：**${MOCK_STATS.this_week} 封**`,
        `• 分類準確率：**${(MOCK_STATS.accuracy_rate * 100).toFixed(1)}%**`,
        `• 省下工時：**${MOCK_STATS.hours_saved.toFixed(1)} 小時**`,
        `• API 成本：**$${MOCK_STATS.api_cost_usd.toFixed(2)} USD**`,
        "",
        "每日明細：",
        ...MOCK_BENEFITS.map((b) =>
          `  ${b.date.slice(5)} — ${b.emails_processed} 封，省 ${b.hours_saved.toFixed(1)}hr，$${b.api_cost_usd.toFixed(3)}`
        ),
      ].join("\n"),
      action: { type: "navigate", url: "/app/stats", label: "查看完整統計圖表" },
    };
  }

  if (match(q, ["累計", "總計", "總共", "total"])) {
    return {
      reply: [
        `📈 **累計處理統計**`,
        "",
        `• 總封數：**${MOCK_STATS.total_processed} 封**`,
        `• 累計省時：**${MOCK_STATS.hours_saved.toFixed(1)} 小時**（每封約 5.5 分鐘）`,
        `• 累計 API 成本：**$${MOCK_STATS.api_cost_usd.toFixed(2)} USD**`,
        `• 整體準確率：**${(MOCK_STATS.accuracy_rate * 100).toFixed(1)}%**`,
        "",
        `以平均每小時薪資 NT$300 計算，累計節省約 **NT$${Math.round(MOCK_STATS.hours_saved * 300).toLocaleString()}**。`,
      ].join("\n"),
      action: { type: "navigate", url: "/app/stats", label: "查看效益統計" },
    };
  }

  // ── 待確認 / 失敗 ────────────────────────────────────────

  if (match(q, ["待確認", "pending", "未確認", "還沒確認", "要確認"])) {
    const pending = MOCK_EMAILS.filter((e) => e.status === "pending");
    return {
      reply: [
        `⏳ **目前有 ${pending.length} 封待確認信件**`,
        "",
        ...pending.map((e, i) =>
          `${i + 1}. \`${e.direction_code}\` **${e.case_numbers[0] ?? "無案號"}** — ${e.subject.slice(0, 35)}\n   ${e.sender_name}  ·  ${formatDate(e.received_at)}`
        ),
      ].join("\n"),
      action: { type: "navigate", url: "/app/emails?status=pending", label: "前往待確認信件" },
    };
  }

  if (match(q, ["失敗", "failed", "錯誤", "處理失敗"])) {
    const failed = MOCK_EMAILS.filter((e) => e.status === "failed");
    return failed.length === 0
      ? { reply: "✅ 目前沒有處理失敗的信件！" }
      : {
          reply: [
            `❌ **${failed.length} 封處理失敗**`,
            "",
            ...failed.map((e) =>
              `• ${e.subject.slice(0, 40)}\n  ${e.sender_email}  ·  ${formatDate(e.received_at)}`
            ),
            "",
            "建議點選該信件後點「重新處理」。",
          ].join("\n"),
          action: { type: "navigate", url: "/app/emails?status=failed", label: "前往失敗信件" },
        };
  }

  // ── 案號查詢 ─────────────────────────────────────────────

  const caseMatch = q.match(/[a-z]{4}\d{5}[pmdtabcw][a-z]{2}\d*/i);
  if (caseMatch) {
    const caseNum = caseMatch[0].toUpperCase();
    const related = MOCK_EMAILS.filter((e) => e.case_numbers.includes(caseNum));

    // If only 1 email, offer to open it directly
    if (related.length === 1) {
      return {
        reply: [
          `📁 **案號 ${caseNum} — 找到 1 封信件**`,
          "",
          `\`${related[0].direction_code}\` **${related[0].sender_name}**`,
          `主旨：${related[0].subject}`,
          `日期：${formatDate(related[0].received_at)}  ·  狀態：${{ pending:"⏳待確認", confirmed:"✅已確認", corrected:"🔵已修正", failed:"❌失敗" }[related[0].status ?? ""] ?? "—"}`,
          `信心：${related[0].confidence ? Math.round(related[0].confidence * 100) + "%" : "—"}`,
        ].join("\n"),
        action: { type: "navigate", url: `/app/emails/${related[0].id}`, label: "開啟這封信件", auto: true },
      };
    }

    if (related.length === 0) {
      return { reply: `找不到案號 **${caseNum}** 的相關信件。可能尚未處理，或案號格式不符。` };
    }

    return {
      reply: [
        `📁 **案號 ${caseNum} — 共 ${related.length} 封信件**`,
        "",
        ...related.map((e) =>
          `• \`${e.direction_code}\` ${formatDate(e.received_at)} — ${e.subject.slice(0, 35)}\n  ${e.sender_name}  ·  ${{ pending:"⏳待確認", confirmed:"✅已確認", corrected:"🔵已修正", failed:"❌失敗" }[e.status ?? ""] ?? "—"}  ·  信心：${e.confidence ? Math.round(e.confidence * 100) + "%" : "—"}`
        ),
        "",
        `最新語義名：「${related[0].semantic_name ?? "—"}」`,
      ].join("\n"),
      action: { type: "navigate", url: `/app/emails?search=${caseNum}`, label: `搜尋 ${caseNum} 的全部信件` },
    };
  }

  // ── Sender 查詢 ──────────────────────────────────────────

  if (match(q, ["sender", "寄件人", "誰寄", "哪家公司", "domain"])) {
    return {
      reply: [
        `👥 **Sender 名單（${MOCK_SENDERS.length} 筆）**`,
        "",
        ...MOCK_SENDERS.map((s) =>
          `• \`${s.key}\` — **${s.display_name}**  角色：${{ C:"客戶", A:"代理人", G:"政府", S:"垃圾", X:"未知" }[s.role]}  (${s.source === "ai_inferred" ? "AI推斷" : s.source === "feedback" ? "回授學習" : "手動"})`
        ),
      ].join("\n"),
      action: { type: "navigate", url: "/app/senders", label: "查看並編輯 Sender 名單" },
    };
  }

  // ── 代理人 / 客戶信件 ────────────────────────────────────

  if (match(q, ["代理人", "agent", "fa", "ta"])) {
    const items = MOCK_EMAILS.filter((e) => e.direction_code === "FA" || e.direction_code === "TA");
    return {
      reply: [
        `🤝 **代理人相關信件（${items.length} 封）**`,
        "",
        ...items.map((e) =>
          `• \`${e.direction_code}\` ${formatDate(e.received_at)} ${e.sender_name} — ${e.subject.slice(0, 30)}`
        ),
      ].join("\n"),
      action: { type: "navigate", url: "/app/emails?search=FA,TA", label: "查看代理人信件" },
    };
  }

  if (match(q, ["客戶", "client", "fc", "tc"])) {
    const items = MOCK_EMAILS.filter((e) => e.direction_code === "FC" || e.direction_code === "TC");
    return {
      reply: [
        `💼 **客戶相關信件（${items.length} 封）**`,
        "",
        ...items.map((e) =>
          `• \`${e.direction_code}\` ${formatDate(e.received_at)} ${e.sender_name} — ${e.subject.slice(0, 30)}`
        ),
      ].join("\n"),
      action: { type: "navigate", url: "/app/emails?search=FC,TC", label: "查看客戶信件" },
    };
  }

  if (match(q, ["政府", "官方", "uspto", "fg", "tg"])) {
    const items = MOCK_EMAILS.filter((e) => e.direction_code === "FG" || e.direction_code === "TG");
    return {
      reply: [
        `🏛️ **政府來文（${items.length} 封）**`,
        "",
        ...items.map((e) =>
          `• \`${e.direction_code}\` ${formatDate(e.received_at)} — ${e.subject.slice(0, 40)}`
        ),
        "",
        "⚠️ FG 信件通常含官方期限，請注意 deadline！",
      ].join("\n"),
      action: { type: "navigate", url: "/app/emails?search=FG,TG", label: "查看政府信件" },
    };
  }

  // ── 準確率 / 品質 ────────────────────────────────────────

  if (match(q, ["準確", "accuracy", "正確率", "品質", "信心", "confidence"])) {
    const withConf = MOCK_EMAILS.filter((e) => e.confidence !== null);
    const avgConf  = withConf.reduce((s, e) => s + (e.confidence ?? 0), 0) / withConf.length;
    const highConf = withConf.filter((e) => (e.confidence ?? 0) >= 0.9).length;
    return {
      reply: [
        `🎯 **分類品質報告**`,
        "",
        `• 整體分類準確率：**${(MOCK_STATS.accuracy_rate * 100).toFixed(1)}%**`,
        `• 收發碼正確率：**100%**（黃金測試集 9 筆全過）`,
        `• 語義名平均分：**0.82 / 1.0**`,
        `• 平均信心分數：**${Math.round(avgConf * 100)}%**`,
        `• 高信心（≥90%）：**${highConf} / ${withConf.length} 封**`,
        "",
        "📊 建議定期執行 runEvaluation 更新評估結果。",
      ].join("\n"),
      action: { type: "navigate", url: "/app/stats", label: "查看完整效益統計" },
    };
  }

  // ── 附件 / 檔案 ─────────────────────────────────────────

  if (match(q, ["附件", "attachment", "pdf", "檔案", "drive", "onedrive"])) {
    const withAtt = MOCK_EMAILS.filter((e) => e.has_attachments);
    return {
      reply: [
        `📎 **附件相關統計**`,
        "",
        `• 含附件信件：**${withAtt.length} 封**（共 ${MOCK_EMAILS.length} 封中）`,
        `• 儲存位置：Google Drive（已連接）、OneDrive（未連接）`,
        "",
        "含附件信件：",
        ...withAtt.map((e) =>
          `• ${e.subject.slice(0, 35)} — \`${e.direction_code}\` ${formatDate(e.received_at)}`
        ),
      ].join("\n"),
      action: { type: "navigate", url: "/app/settings/storage", label: "管理儲存空間設定" },
    };
  }

  // ── 費用 / 成本 ──────────────────────────────────────────

  if (match(q, ["費用", "成本", "cost", "多少錢", "token"])) {
    return {
      reply: [
        `💰 **API 成本分析**`,
        "",
        `• 累計成本：**$${MOCK_STATS.api_cost_usd.toFixed(2)} USD**`,
        `• 每封平均：**$${(MOCK_STATS.api_cost_usd / MOCK_STATS.total_processed * 1000).toFixed(2)} 毫美元**`,
        `• 使用模型：Gemini 3.0 Flash`,
        `• 輸入單價：$0.10 / 1M tokens`,
        `• 輸出單價：$0.40 / 1M tokens`,
        "",
        `ROI：每節省 1 小時成本約 $${(MOCK_STATS.api_cost_usd / MOCK_STATS.hours_saved).toFixed(4)} USD。`,
      ].join("\n"),
      action: { type: "navigate", url: "/app/stats", label: "查看完整效益統計" },
    };
  }

  // ── 期限 / deadline ──────────────────────────────────────

  if (match(q, ["期限", "deadline", "截止", "到期"])) {
    return {
      reply: [
        `⏰ **近期行動期限提醒**`,
        "",
        `• **3/17（今天）**：BRIT25710PUS1 OA 答辯草稿審閱（FA）`,
        `• **3/20（3天後）**：KOIT20004TUS7 TA 委託答辯草稿`,
        `• **4/15（29天後）**：BRIT25710PUS1 USPTO 官方 OA 期限`,
        `• **6/15（90天後）**：KOIT20004TUS7 USPTO 官方 OA2 期限`,
        "",
        "⚠️ 優先處理 3/20 前的 KOIT20004TUS7 委託。",
      ].join("\n"),
      action: { type: "navigate", url: "/app/emails?status=pending", label: "查看待確認信件" },
    };
  }

  // ── 分類規則 ─────────────────────────────────────────────

  if (match(q, ["規則", "分類規則", "rule", "學習規則", "llm規則"])) {
    return {
      reply: [
        `📋 **分類規則共 31 條**`,
        "",
        `• 案號格式（C01-C03）：正規表達式提取、邊界保護`,
        `• 專利/商標分類（R01-R04）：第10碼類型碼判斷`,
        `• 收發碼判定（S01-S05）：domain 比對 + Sender 名單角色`,
        `• 資料夾歸檔（F01-F05）：案號有無、多案號邏輯`,
        `• 檔名規則（N01-N04）：AI 語義名 + 期限 + EML/附件格式`,
        `• 附件處理（A01-A02）：T方向不存附件、小圖片跳過`,
        `• LLM 回饋學習（L01-L11）：方法A/B 回授、few-shot 注入`,
        "",
        "包含 1 條學習規則（L11：KOI 公司語義名統一）。",
      ].join("\n"),
      action: { type: "navigate", url: "/app/rules", label: "查看完整分類規則", auto: true },
    };
  }

  // ── 搜尋特定公司 ─────────────────────────────────────────

  if (match(q, ["bskb"])) {
    const items = MOCK_EMAILS.filter((e) => e.sender_email.includes("bskb"));
    return {
      reply: [
        `🔍 **BSKB LLP 相關信件（${items.length} 封）**`,
        "",
        ...items.map((e) =>
          `• ${formatDate(e.received_at)} \`${e.direction_code}\` — ${e.subject}`
        ),
        "",
        `Sender 角色：代理人（Agent）｜Domain：@bskb.com`,
      ].join("\n"),
      action: { type: "navigate", url: "/app/emails?search=bskb", label: "搜尋 BSKB 信件" },
    };
  }

  if (match(q, ["tilleke"])) {
    const items = MOCK_EMAILS.filter((e) => e.sender_email.includes("tilleke"));
    return {
      reply: [
        `🔍 **Tilleke & Gibbins 相關信件**`,
        "",
        ...items.map((e) => `• ${formatDate(e.received_at)} \`${e.direction_code}\` — ${e.subject}`),
        "",
        `Sender 角色：代理人（Agent）｜來源：AI 自動推斷後確認`,
      ].join("\n"),
      action: { type: "navigate", url: "/app/emails?search=tilleke", label: "搜尋 Tilleke 信件" },
    };
  }

  // ── 最新信件 ─────────────────────────────────────────────

  if (match(q, ["最新", "最近", "latest", "recent"])) {
    const recent = [...MOCK_EMAILS]
      .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
      .slice(0, 5);
    return {
      reply: [
        `📬 **最近 5 封信件**`,
        "",
        ...recent.map((e, i) =>
          `${i + 1}. \`${e.direction_code ?? "?"}\` **${e.sender_name}**\n   ${e.subject.slice(0, 40)}\n   ${formatDate(e.received_at)}  ·  ${{ pending:"⏳待確認", confirmed:"✅已確認", corrected:"🔵已修正", failed:"❌失敗" }[e.status ?? ""] ?? ""}`
        ),
      ].join("\n"),
      action: { type: "navigate", url: "/app/emails", label: "查看全部信件" },
    };
  }

  // ── 說明功能 ─────────────────────────────────────────────

  if (match(q, ["能做什麼", "功能", "help", "幫助", "怎麼用"])) {
    return {
      reply: [
        `🤖 **MailFlow AI 助理可以幫你：**`,
        "",
        `**📊 統計查詢**  →  今天/本週/累計統計`,
        `**📁 案號查詢**  →  BRIT25710PUS1 的信件`,
        `**⏰ 期限管理**  →  近期有哪些 deadline？`,
        `**👥 Sender**   →  代理人/客戶/政府信件`,
        `**📎 附件**     →  有附件的信件`,
        "",
        `**🧭 頁面跳轉**  →  直接說「帶我去 xxx」`,
        `• 「帶我去信件列表」`,
        `• 「帶我去分類規則」`,
        `• 「前往統計頁面」`,
        `• 「帶我去設定」`,
        "",
        "也支援上傳圖片讓我協助分析！",
      ].join("\n"),
    };
  }

  // ── Fallback ─────────────────────────────────────────────

  const suggestions = [
    "「今天處理了幾封？」",
    "「帶我去待確認信件」",
    "「BRIT25710PUS1 的信件」",
    "「近期有哪些 deadline？」",
    "「帶我去分類規則」",
  ];
  const random = suggestions[Math.floor(Math.random() * suggestions.length)];

  return {
    reply: [
      `我理解你的問題，但目前 demo 模式下資料有限。`,
      "",
      `你可以試試：`,
      random,
      "",
      `或說「功能」查看所有支援的查詢。`,
    ].join("\n"),
  };
}

// ── Route handler ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { message } = await req.json() as { message: string };

  if (!message?.trim()) {
    return NextResponse.json({ reply: "請輸入問題。" });
  }

  await new Promise((r) => setTimeout(r, 280));

  return NextResponse.json(buildResponse(message));
}
