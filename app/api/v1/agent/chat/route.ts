import { NextRequest, NextResponse } from "next/server";
import { MOCK_EMAILS, MOCK_SENDERS, MOCK_STATS, MOCK_BENEFITS, MOCK_ATTORNEYS, MOCK_IP_PORTFOLIO } from "@/lib/mock-data";
import { MOCK_CASES, MOCK_STAFF, MOCK_DEADLINES } from "@/lib/mock-cases";

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

  if (navIntent && match(q, ["截止", "到期", "期限", "deadline", "截止日"])) {
    return { reply: `好的，帶你去截止日管理！`, action: { type: "navigate", url: "/app/deadlines", label: "開啟截止日管理", auto: true } };
  }

  if (navIntent && match(q, ["人員", "staff", "專利師", "律師", "loading"])) {
    return { reply: `好的，帶你去人員管理！`, action: { type: "navigate", url: "/app/staff", label: "開啟人員管理", auto: true } };
  }

  // ── IP Portfolio 概況 ────────────────────────────────────────

  if (match(q, ["portfolio", "有效案件", "ip概況", "案件概況", "比例", "案件分布", "幾件案", "目前案件", "有幾件", "管理案件"])) {
    const { total_active_cases, patent_cases, trademark_cases, pending_oa, due_this_week, due_this_month, new_this_month, countries } = MOCK_IP_PORTFOLIO;
    return {
      reply: [
        `🗂️ **IP 案件概況**`,
        ``,
        `• 有效管理案件：**${total_active_cases} 件**`,
        `• 專利案件：**${patent_cases} 件**（${Math.round(patent_cases / total_active_cases * 100)}%）`,
        `• 商標案件：**${trademark_cases} 件**（${Math.round(trademark_cases / total_active_cases * 100)}%）`,
        ``,
        `⏰ **近期截止**`,
        `• 本週到期：**${due_this_week} 件**`,
        `• 本月到期：**${due_this_month} 件**`,
        `• 待答辯 OA：**${pending_oa} 件**`,
        ``,
        `📥 本月新案：**${new_this_month} 件**`,
        `🌏 管理國家：${countries.join("、")}`,
      ].join("\n"),
      action: { type: "navigate", url: "/app/stats", label: "查看詳細統計" },
    };
  }

  // ── 今日官方來文 ──────────────────────────────────────────────

  if (match(q, ["今日來文", "今天來文", "今天官方", "新收來文", "3/18來文", "今天收到什麼", "最新來文"])) {
    return {
      reply: [
        `📬 **今日新收官方來文（3/18）— 3 件**`,
        ``,
        `1. 🇺🇸 **TSMC23014PUS** — USPTO`,
        `   Non-Final Office Action  ·  **OA答辯**  ·  截止 06/18（92天後）`,
        `   AI 建議：指派陳建志（半導體專長）  ·  信心 97%`,
        ``,
        `2. 🇪🇺 **EPPA23801EP** — EPO`,
        `   Rule 71(3) Communication  ·  **領證費**  ·  截止 04/30（43天後）`,
        `   AI 建議：林雅婷聯繫 European Client C  ·  信心 99%`,
        ``,
        `3. 🇨🇳 **FOXC24003PCN** — CNIPA ⚠️ 待確認`,
        `   第一次審查意見通知書  ·  信心 68%，建議人工確認類別`,
      ].join("\n"),
      action: { type: "navigate", url: "/app/patent", label: "前往 IP概況查看來文" },
    };
  }

  // ── OA 待答辯 ────────────────────────────────────────────────

  if (match(q, ["待答辯", "oa待答辯", "oa 待", "幾件oa", "答辯截止", "office action"])) {
    const oaDl = MOCK_DEADLINES.filter((d) => d.type === "oa_response" && d.status === "pending");
    return {
      reply: [
        `📝 **OA 待答辯案件 — ${oaDl.length} 件**`,
        ``,
        ...oaDl.map((d) => {
          const days = Math.ceil((new Date(d.due_date).getTime() - Date.now()) / 86400000);
          const dot   = days <= 14 ? "🔴" : days <= 30 ? "🟡" : "🟢";
          return `${dot} **${d.case_number}** — ${d.client_name}\n   ${d.description}  ·  截止 ${d.due_date.slice(5)}  ·  **${days}d**  ·  負責：${d.assignee_name}`;
        }),
      ].join("\n"),
      action: { type: "navigate", url: "/app/deadlines", label: "前往截止期限管理" },
    };
  }

  // ── 年費 / 維護費 ────────────────────────────────────────────

  if (match(q, ["年費", "維護費", "maintenance", "renewal", "繳費", "annuity", "續費", "年繳"])) {
    const annuities = MOCK_DEADLINES.filter((d) => ["annuity", "renewal", "grant_deadline"].includes(d.type) && d.status === "pending");
    return {
      reply: [
        `💰 **年費 / 維護費提示 — ${annuities.length} 件**`,
        ``,
        ...annuities.map((d) => {
          const days = Math.ceil((new Date(d.due_date).getTime() - Date.now()) / 86400000);
          const dot   = days <= 30 ? "🔴" : days <= 90 ? "🟡" : "🟢";
          return `${dot} **${d.case_number}** — ${d.client_name}\n   ${d.description}  ·  截止 ${d.due_date.slice(5)}（${days} 天後）  ·  ${d.assignee_name}`;
        }),
        ``,
        `⚠️ 請確認各客戶已收到年費通知。`,
      ].join("\n"),
      action: { type: "navigate", url: "/app/deadlines", label: "查看年費截止清單" },
    };
  }

  // ── 今天 ─────────────────────────────────────────────────────
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

  // ── 人員 Loading ────────────────────────────────────────────

  for (const s of MOCK_STAFF) {
    if (q.includes(s.name)) {
      const myDl = MOCK_DEADLINES.filter((d) => d.assignee_name === s.name && d.status === "pending");
      const oaCnt = myDl.filter((d) => d.type === "oa_response").length;
      const loadBar = "█".repeat(Math.min(8, Math.floor(s.active_cases / 5))) + "░".repeat(Math.max(0, 8 - Math.floor(s.active_cases / 5)));
      return {
        reply: [
          `👤 **${s.name}（${s.title}）**`,
          ``,
          `• 負責案件：**${s.active_cases} 件**  ${loadBar}`,
          `• 專長：${s.specialties.join("、")}`,
          `• 待辦截止：**${myDl.length} 件**（OA答辯 ${oaCnt} 件）`,
          myDl.length > 0 ? `` : null,
          ...myDl.slice(0, 4).map((d) => {
            const days = Math.ceil((new Date(d.due_date).getTime() - Date.now()) / 86400000);
            const dot   = days <= 14 ? "🔴" : days <= 30 ? "🟡" : "🟢";
            return `  ${dot} **${d.case_number}** ${d.description.slice(0, 20)}  ·  ${days}d`;
          }),
        ].filter((x) => x !== null).join("\n"),
        action: { type: "navigate", url: "/app/staff", label: "查看人員管理" },
      };
    }
  }

  if (match(q, ["loading", "工作量", "人員分配", "各專利師", "誰負責最多", "誰oa最多", "人員loading", "負載"])) {
    const attorneys = MOCK_STAFF.filter((s) => s.role === "attorney" || s.role === "paralegal");
    return {
      reply: [
        `👥 **人員 Loading 概況**`,
        ``,
        ...attorneys.map((s) => {
          const myDl = MOCK_DEADLINES.filter((d) => d.assignee_name === s.name && d.status === "pending");
          const oaCnt = myDl.filter((d) => d.type === "oa_response").length;
          const bar   = "█".repeat(Math.min(8, Math.floor(s.active_cases / 5))) + "░".repeat(Math.max(0, 8 - Math.floor(s.active_cases / 5)));
          return `**${s.name}**（${s.title}）\n  案件 ${s.active_cases} 件  ·  待辦截止 ${myDl.length} 件（OA ${oaCnt}）\n  ${bar}`;
        }),
        ``,
        `⚠️ 負責最多截止件數：${attorneys.sort((a,b)=>MOCK_DEADLINES.filter(d=>d.assignee_name===b.name&&d.status==="pending").length-MOCK_DEADLINES.filter(d=>d.assignee_name===a.name&&d.status==="pending").length)[0].name}`,
      ].join("\n"),
      action: { type: "navigate", url: "/app/staff", label: "前往人員管理" },
    };
  }

  // ── 客戶查詢 ─────────────────────────────────────────────────

  const clientMap: Record<string, string> = {
    "台積電": "台積電", "tsmc": "台積電",
    "聯發科": "聯發科技", "mediatek": "聯發科技",
    "鴻海": "鴻海精密", "foxconn": "鴻海精密",
    "威剛": "威剛科技", "adata": "威剛科技",
  };
  for (const [kw, clientName] of Object.entries(clientMap)) {
    if (q.includes(kw)) {
      const cCases = MOCK_CASES.filter((c) => c.client_name === clientName);
      const cDl    = MOCK_DEADLINES.filter((d) => d.client_name === clientName && d.status === "pending");
      const oaCnt  = cCases.filter((c) => c.status === "oa_issued").length;
      return {
        reply: [
          `🏢 **${clientName} — IP 案件概況**`,
          ``,
          `• 管理案件：**${cCases.length} 件**（專利 ${cCases.filter(c=>c.case_type==="invention").length}、設計 ${cCases.filter(c=>c.case_type==="design").length}、商標 ${cCases.filter(c=>c.case_type==="trademark").length}）`,
          `• OA 待答辯：**${oaCnt} 件**`,
          `• 近期截止：**${cDl.length} 件**`,
          ``,
          ...cCases.slice(0, 5).map((c) => {
            const dl   = cDl.find((d) => d.case_number === c.case_number);
            const days = dl ? Math.ceil((new Date(dl.due_date).getTime() - Date.now()) / 86400000) : null;
            return `• **${c.case_number}** ${c.title.slice(0, 28)}\n  ${c.jurisdiction}  ·  ${c.assignee_name}${days !== null ? `  ·  截止 ${days}d` : ""}`;
          }),
          cCases.length > 5 ? `  …另有 ${cCases.length - 5} 件` : "",
        ].filter(Boolean).join("\n"),
        action: { type: "navigate", url: "/app/cases", label: `查看 ${clientName} 所有案件` },
      };
    }
  }

  // ── 案號查詢 ─────────────────────────────────────────────

  const caseMatch = q.match(/[a-z]{4}\d{5}[a-z]{1,3}\d*/i);
  if (caseMatch) {
    const caseNum = caseMatch[0].toUpperCase();

    // Also look up in MOCK_CASES for full case details
    const caseRecord = MOCK_CASES.find((c) => c.case_number === caseNum);
    const caseDeadline = MOCK_DEADLINES.find((d) => d.case_number === caseNum && d.status === "pending");

    if (caseRecord && !MOCK_EMAILS.some((e) => e.case_numbers.includes(caseNum))) {
      const daysUntil = caseDeadline ? Math.ceil((new Date(caseDeadline.due_date).getTime() - Date.now()) / 86400000) : null;
      return {
        reply: [
          `📁 **${caseRecord.case_number}**`,
          `${caseRecord.title}`,
          ``,
          `• 客戶：**${caseRecord.client_name}**`,
          `• 類型：${caseRecord.case_type}  ·  國家：${caseRecord.jurisdiction}`,
          `• 狀態：${caseRecord.status}`,
          `• 負責人：**${caseRecord.assignee_name}**`,
          caseDeadline ? `• 下個截止：**${caseDeadline.due_date.slice(5)}**（${daysUntil}天後）— ${caseDeadline.description}` : "",
          caseRecord.patent_number ? `• 專利號：${caseRecord.patent_number}` : "",
        ].filter(Boolean).join("\n"),
        action: { type: "navigate", url: "/app/patent", label: `查看 ${caseRecord.case_number} 詳情` },
      };
    }

    const related = MOCK_EMAILS.filter((e) => e.case_numbers.includes(caseNum));

    // If only 1 email, offer to open it directly
    if (related.length === 1) {
      return {
        reply: [
          `📁 **案號 ${caseNum} — 找到 1 封信件**`,
          "",
          `\`${related[0].direction_code}\` **${related[0].sender_name}**`,
          `主旨：${related[0].subject}`,
          `日期：${formatDate(related[0].received_at)}  ·  狀態：${({ pending:"⏳待確認", confirmed:"✅已確認", corrected:"🔵已修正", failed:"❌失敗" } as Record<string,string>)[related[0].status ?? ""] ?? "—"}`,
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
          `• \`${e.direction_code}\` ${formatDate(e.received_at)} — ${e.subject.slice(0, 35)}\n  ${e.sender_name}  ·  ${({ pending:"⏳待確認", confirmed:"✅已確認", corrected:"🔵已修正", failed:"❌失敗" } as Record<string,string>)[e.status ?? ""] ?? "—"}  ·  信心：${e.confidence ? Math.round(e.confidence * 100) + "%" : "—"}`
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

  if (match(q, ["期限", "deadline", "截止", "到期", "7天", "本月截止"])) {
    const allPending = MOCK_DEADLINES.filter((d) => d.status === "pending")
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    const soon = allPending.slice(0, 6);
    return {
      reply: [
        `⏰ **近期截止期限（最近 ${soon.length} 件）**`,
        ``,
        ...soon.map((d) => {
          const days = Math.ceil((new Date(d.due_date).getTime() - Date.now()) / 86400000);
          const dot   = days <= 14 ? "🔴" : days <= 30 ? "🟡" : "🟢";
          const typeLabel: Record<string, string> = { oa_response: "OA答辯", annuity: "年費", filing: "申請期限", grant_deadline: "領證費", renewal: "年繳", appeal: "上訴", other: "其他" };
          return `${dot} **${d.case_number}** (${typeLabel[d.type] ?? d.type}) ${d.due_date.slice(5)}  **${days}d**  ${d.assignee_name}`;
        }),
        ``,
        `共 ${allPending.length} 件待處理，其中 OA答辯 ${allPending.filter(d=>d.type==="oa_response").length} 件、年費 ${allPending.filter(d=>d.type==="annuity"||d.type==="renewal").length} 件。`,
      ].join("\n"),
      action: { type: "navigate", url: "/app/deadlines", label: "前往截止期限管理" },
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
          `${i + 1}. \`${e.direction_code ?? "?"}\` **${e.sender_name}**\n   ${e.subject.slice(0, 40)}\n   ${formatDate(e.received_at)}  ·  ${({ pending:"⏳待確認", confirmed:"✅已確認", corrected:"🔵已修正", failed:"❌失敗" } as Record<string,string>)[e.status ?? ""] ?? ""}`
        ),
      ].join("\n"),
      action: { type: "navigate", url: "/app/emails", label: "查看全部信件" },
    };
  }

  // ── 說明功能 ─────────────────────────────────────────────

  if (match(q, ["能做什麼", "功能", "help", "幫助", "怎麼用"])) {
    return {
      reply: [
        `🤖 **IP Winner AI 助理可以幫你：**`,
        "",
        `**📊 IP概況**      →  今日官方來文、目前有幾件OA待答辯`,
        `**📁 案號查詢**    →  TSMC23014PUS 進度、KOIT20004TUS7 狀態`,
        `**🏢 客戶查案**    →  台積電的案件、聯發科目前狀態`,
        `**👥 人員 Loading** →  陳建志目前負責幾件、各專利師工作量`,
        `**⏰ 截止管理**    →  近期截止、OA 待答辯、年費即將到期`,
        `**📬 信件查詢**    →  代理人來信、政府來文、有附件的信件`,
        "",
        `**🧭 頁面跳轉**    →  直接說「帶我去 xxx」`,
        `• 「帶我去截止期限」`,
        `• 「帶我去人員管理」`,
        `• 「前往統計頁面」`,
        `• 「帶我去信件列表」`,
        "",
        "也支援上傳圖片讓我協助分析！",
      ].join("\n"),
    };
  }

  // ── Fallback ─────────────────────────────────────────────

  const suggestions = [
    "「目前有幾件OA待答辯？」",
    "「台積電的案件」",
    "「陳建志目前loading」",
    "「今日官方來文」",
    "「帶我去截止期限」",
    "「年費即將到期」",
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
