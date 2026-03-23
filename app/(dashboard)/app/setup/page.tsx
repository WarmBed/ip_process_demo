"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft, CheckCircle2,
  Upload, Plus, X, RefreshCw,
  Settings2, FileSpreadsheet,
} from "lucide-react";
import { Button, Text, Box, Flex, Badge, Switch } from "@radix-ui/themes";

/* --- Brand SVG icons ---------------------------------------- */

const IconGmail = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
    <path d="M6 14L24 26L42 14" stroke="#EA4335" strokeWidth="3"/>
    <rect x="6" y="12" width="36" height="24" rx="3" stroke="#EA4335" strokeWidth="2.5" fill="white"/>
    <path d="M6 14L24 26L42 14" stroke="#EA4335" strokeWidth="2.5" fill="none"/>
    <path d="M6 36L18 24" stroke="#EA4335" strokeWidth="2"/>
    <path d="M42 36L30 24" stroke="#EA4335" strokeWidth="2"/>
  </svg>
);

const IconOutlook = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
    <rect x="4" y="8" width="26" height="32" rx="3" fill="#0078D4"/>
    <rect x="18" y="14" width="26" height="22" rx="2" fill="#50AFED" stroke="#0078D4" strokeWidth="0.5"/>
    <path d="M18 14L31 23L44 14" stroke="#0078D4" strokeWidth="1.5" fill="none"/>
    <ellipse cx="15" cy="24" rx="5" ry="6" fill="white"/>
  </svg>
);

const IconGoogleDrive = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
    <path d="M4 36L12 22L20 36H4Z" fill="#0066DA"/>
    <path d="M20 36L28 22L44 36H20Z" fill="#FFBA00"/>
    <path d="M16 8L32 8L44 30H28L16 8Z" fill="#00AC47"/>
    <path d="M28 22L16 22L20 36L28 22Z" fill="#00832D"/>
    <path d="M28 22L44 22L44 30L28 22Z" fill="#EA4335"/>
  </svg>
);

const IconOneDrive = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
    <path d="M20 32H8C5.8 32 4 30.2 4 28C4 26 5.5 24.3 7.5 24C7.5 17.4 12.7 12 19 12C23.2 12 26.8 14.3 28.7 17.7C29.5 17.3 30.4 17 31.5 17C35.6 17 39 20.4 39 24.5C39 24.7 39 24.8 39 25H40.5C42.4 25 44 26.6 44 28.5C44 30.4 42.4 32 40.5 32H20Z" fill="#0078D4"/>
    <path d="M28.5 32H40.5C42.4 32 44 30.4 44 28.5C44 26.6 42.4 25 40.5 25H39C39 24.8 39 24.7 39 24.5C39 20.4 35.6 17 31.5 17C30.4 17 29.5 17.3 28.7 17.7C26.8 14.3 23.2 12 19 12C12.7 12 7.5 17.4 7.5 24C5.5 24.3 4 26 4 28C4 30.2 5.8 32 8 32" fill="#28A8E8"/>
  </svg>
);

const IconDropbox = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
    <path d="M14 8L24 14.5L14 21L4 14.5L14 8Z" fill="#0061FF"/>
    <path d="M34 8L44 14.5L34 21L24 14.5L34 8Z" fill="#0061FF"/>
    <path d="M4 27.5L14 21L24 27.5L14 34L4 27.5Z" fill="#0061FF"/>
    <path d="M44 27.5L34 21L24 27.5L34 34L44 27.5Z" fill="#0061FF"/>
    <path d="M14 36.5L24 30L34 36.5L24 43L14 36.5Z" fill="#0061FF"/>
  </svg>
);

/* --- types -------------------------------------------------- */

interface WizardState {
  emailProvider: "gmail" | "outlook" | "";
  emailAccount: string;
  storage: "google_drive" | "onedrive" | "dropbox" | "";
  storagePath: string;
  namingMode: "excel" | "manual" | "";
  namingRules: string[];
  archiveStructure: string;
  fileFilter: string[];
  includeAttachments: boolean;
}

const INIT: WizardState = {
  emailProvider: "",
  emailAccount: "",
  storage: "",
  storagePath: "",
  namingMode: "",
  namingRules: [],
  archiveStructure: "{案號}/{年月}/{收發碼}_{主旨}",
  fileFilter: ["pdf", "docx", "eml"],
  includeAttachments: true,
};

/* --- step config -------------------------------------------- */

const STEPS = [
  { id: 1, label: "信箱" },
  { id: 2, label: "儲存" },
  { id: 3, label: "命名" },
  { id: 4, label: "調整" },
  { id: 5, label: "部署" },
  { id: 6, label: "完成" },
];

const DEPLOY_STEPS = [
  { msg: "連接信箱帳號...",        pct: 15 },
  { msg: "驗證儲存空間權限...",     pct: 30 },
  { msg: "解析命名規則...",         pct: 48 },
  { msg: "建立資料夾結構...",       pct: 62 },
  { msg: "套用自訂設定...",         pct: 78 },
  { msg: "啟動信件處理管道...",     pct: 90 },
  { msg: "驗證端到端流程...",       pct: 97 },
  { msg: "部署完成",               pct: 100 },
];

/* --- shared styles ------------------------------------------ */

const card = (active: boolean): React.CSSProperties => ({
  padding: "16px 18px",
  borderRadius: 12,
  cursor: "pointer",
  border: `2px solid ${active ? "var(--green-9)" : "var(--gray-6)"}`,
  background: active ? "var(--green-2)" : "var(--color-background)",
  transition: "all 0.15s",
  display: "flex",
  alignItems: "center",
  gap: 14,
  userSelect: "none",
});

const label10: React.CSSProperties = {
  fontSize: 10, fontWeight: 700,
  color: "var(--gray-8)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 8,
};

/* --- main --------------------------------------------------- */

export default function SetupPage() {
  const router   = useRouter();
  const [step, setStep]   = useState(1);
  const [state, setState] = useState<WizardState>(INIT);
  const [deployIdx, setDeployIdx]         = useState(0);
  const [llmLoading, setLlmLoading]       = useState(false);
  const [llmSuggestions, setLlmSuggestions] = useState<string[]>([]);

  const patch = (val: Partial<WizardState>) => setState(s => ({ ...s, ...val }));

  useEffect(() => {
    if (step !== 5) return;
    setDeployIdx(0);
    const timers = DEPLOY_STEPS.map((_, i) =>
      setTimeout(() => {
        setDeployIdx(i);
        if (i === DEPLOY_STEPS.length - 1) setTimeout(() => setStep(6), 800);
      }, i * 900)
    );
    return () => timers.forEach(clearTimeout);
  }, [step]);

  const simulateLlm = () => {
    setLlmLoading(true);
    setLlmSuggestions([]);
    setTimeout(() => {
      setLlmSuggestions([
        "{案號}/{年度}/{收發碼}_{日期}_{主旨}",
        "{客戶名}/{案號}_{收發碼}_{日期}",
        "{年度}/{月份}/{案號}_{語義標籤}",
      ]);
      setLlmLoading(false);
    }, 1800);
  };

  return (
    <div style={{
      minHeight: "100%", padding: "40px 24px 80px",
      background: "var(--color-background)",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>

      {/* Progress bar */}
      {step < 6 && (
        <div style={{ width: "100%", maxWidth: 580, marginBottom: 40 }}>
          {/* Step dots */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {STEPS.filter(s => s.id < 6).map((s, i) => {
              const done   = s.id < step;
              const active = s.id === step;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < 4 ? 1 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: done ? "var(--green-9)" : active ? "var(--color-background)" : "var(--gray-4)",
                      border: `2px solid ${active ? "var(--green-9)" : done ? "var(--green-9)" : "var(--gray-6)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s",
                    }}>
                      {done
                        ? <CheckCircle2 size={15} color="#fff" />
                        : <span style={{ fontSize: 12, fontWeight: 700, color: active ? "var(--green-9)" : "var(--gray-9)" }}>{s.id}</span>
                      }
                    </div>
                    <Text size="1" weight={active ? "bold" : "medium"} style={{ color: active ? "var(--green-9)" : done ? "var(--green-9)" : "var(--gray-9)", whiteSpace: "nowrap" }}>
                      {s.label}
                    </Text>
                  </div>
                  {i < 4 && (
                    <div style={{ flex: 1, height: 2, background: done ? "var(--green-9)" : "var(--gray-5)", marginBottom: 18, transition: "background 0.3s" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card */}
      <Box style={{
        width: "100%", maxWidth: 580,
        border: "1px solid var(--gray-6)", borderRadius: 16,
        background: "var(--color-background)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}>
        {step === 1 && <Step1 state={state} patch={patch} />}
        {step === 2 && <Step2 state={state} patch={patch} />}
        {step === 3 && <Step3 state={state} patch={patch} simulateLlm={simulateLlm} llmLoading={llmLoading} llmSuggestions={llmSuggestions} />}
        {step === 4 && <Step4 state={state} patch={patch} />}
        {step === 5 && <Step5 deployIdx={deployIdx} />}
        {step === 6 && <Step6 state={state} onDone={() => router.push("/app")} />}

        {/* Footer nav */}
        {step < 5 && (
          <Flex align="center" justify="between" style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--gray-6)",
            background: "var(--gray-2)",
          }}>
            <Button
              variant="ghost"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              style={{ gap: 5, opacity: step === 1 ? 0.25 : 1 }}
            >
              <ChevronLeft size={14} /> 上一步
            </Button>
            <Text size="1" style={{ color: "var(--gray-8)" }}>{step} / 4</Text>
            <Button
              variant="solid"
              color="green"
              onClick={() => setStep(s => s + 1)}
              style={{ gap: 6 }}
            >
              {step === 4 ? "開始部署" : "下一步"} <ChevronRight size={14} />
            </Button>
          </Flex>
        )}
      </Box>
    </div>
  );
}

/* --- Step 1: Email ------------------------------------------ */

function Step1({ state, patch }: { state: WizardState; patch: (v: Partial<WizardState>) => void }) {
  const providers = [
    {
      id: "gmail" as const,
      name: "Gmail",
      desc: "Google Workspace · 個人帳號",
      icon: <IconGmail />,
    },
    {
      id: "outlook" as const,
      name: "Outlook",
      desc: "Microsoft 365 · Exchange",
      icon: <IconOutlook />,
    },
  ];

  return (
    <div style={{ padding: "32px 28px 28px" }}>
      <StepHeader step={1} title="連接信箱" desc="選擇你的信箱服務，系統將自動讀取並整理往來信件" />

      <Flex direction="column" gap="3" mb="5">
        {providers.map(p => (
          <button key={p.id} onClick={() => patch({ emailProvider: p.id })} style={card(state.emailProvider === p.id)}>
            <div style={{ flexShrink: 0 }}>{p.icon}</div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <Text size="2" weight="bold" style={{ color: state.emailProvider === p.id ? "var(--green-11)" : "var(--gray-12)" }}>{p.name}</Text>
              <Text size="1" style={{ color: "var(--gray-8)", display: "block", marginTop: 1 }}>{p.desc}</Text>
            </div>
            {state.emailProvider === p.id && <CheckCircle2 size={18} color="var(--green-9)" style={{ flexShrink: 0 }} />}
          </button>
        ))}
      </Flex>

      <div>
        <div style={label10}>帳號 Email</div>
        <input
          value={state.emailAccount}
          onChange={e => patch({ emailAccount: e.target.value })}
          placeholder={state.emailProvider === "outlook" ? "yourname@company.com" : "yourname@gmail.com"}
          style={{
            width: "100%", boxSizing: "border-box",
            border: "1px solid var(--gray-6)", borderRadius: 8,
            padding: "10px 14px", fontSize: 13,
            background: "var(--color-background)", color: "var(--gray-12)", outline: "none",
          }}
        />
        <Text size="1" style={{ color: "var(--gray-8)", display: "block", marginTop: 6 }}>
          使用 OAuth 授權連接，不儲存密碼
        </Text>
      </div>
    </div>
  );
}

/* --- Step 2: Storage ---------------------------------------- */

function Step2({ state, patch }: { state: WizardState; patch: (v: Partial<WizardState>) => void }) {
  const storages = [
    { id: "google_drive" as const, name: "Google Drive",  desc: "整合 Google Workspace，自動建立資料夾", icon: <IconGoogleDrive /> },
    { id: "onedrive"     as const, name: "OneDrive",      desc: "Microsoft 365 整合，支援 SharePoint",  icon: <IconOneDrive /> },
    { id: "dropbox"      as const, name: "Dropbox",       desc: "跨平台同步，支援共享資料夾",           icon: <IconDropbox /> },
  ];

  return (
    <div style={{ padding: "32px 28px 28px" }}>
      <StepHeader step={2} title="選擇儲存空間" desc="歸檔的信件與附件將存放在此雲端硬碟" />

      <Flex direction="column" gap="3" mb="5">
        {storages.map(s => (
          <button key={s.id} onClick={() => patch({ storage: s.id })} style={card(state.storage === s.id)}>
            <div style={{ flexShrink: 0 }}>{s.icon}</div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <Text size="2" weight="bold" style={{ color: state.storage === s.id ? "var(--green-11)" : "var(--gray-12)" }}>{s.name}</Text>
              <Text size="1" style={{ color: "var(--gray-8)", display: "block", marginTop: 1 }}>{s.desc}</Text>
            </div>
            {state.storage === s.id && <CheckCircle2 size={18} color="var(--green-9)" style={{ flexShrink: 0 }} />}
          </button>
        ))}
      </Flex>

      <div>
        <div style={label10}>根目錄路徑（選填）</div>
        <input
          value={state.storagePath}
          onChange={e => patch({ storagePath: e.target.value })}
          placeholder="/IPWinner/Emails  （留空使用預設）"
          style={{
            width: "100%", boxSizing: "border-box",
            border: "1px solid var(--gray-6)", borderRadius: 8,
            padding: "10px 14px", fontSize: 13,
            background: "var(--color-background)", color: "var(--gray-12)", outline: "none",
            fontFamily: "ui-monospace, monospace",
          }}
        />
      </div>
    </div>
  );
}

/* --- Step 3: Naming ----------------------------------------- */

function Step3({ state, patch, simulateLlm, llmLoading, llmSuggestions }: {
  state: WizardState; patch: (v: Partial<WizardState>) => void;
  simulateLlm: () => void; llmLoading: boolean; llmSuggestions: string[];
}) {
  const [newRule, setNewRule] = useState("");

  const addRule = (r: string) => {
    if (!r.trim() || state.namingRules.includes(r.trim())) return;
    patch({ namingRules: [...state.namingRules, r.trim()] });
    setNewRule("");
  };

  return (
    <div style={{ padding: "32px 28px 28px" }}>
      <StepHeader step={3} title="命名規則" desc="決定歸檔時的資料夾與檔名格式" />

      {/* Mode */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
        {[
          { id: "excel"  as const, icon: <FileSpreadsheet size={20} color={state.namingMode === "excel"  ? "var(--green-11)" : "var(--gray-9)"} />, name: "上傳 Excel", desc: "從現有檔案習慣自動分析" },
          { id: "manual" as const, icon: <Settings2 size={20} color={state.namingMode === "manual" ? "var(--green-11)" : "var(--gray-9)"} />, name: "手動輸入",   desc: "直接定義命名模板" },
        ].map(m => (
          <button key={m.id} onClick={() => patch({ namingMode: m.id })} style={{
            ...card(state.namingMode === m.id),
            flexDirection: "column", alignItems: "flex-start", gap: 8, padding: "16px",
          }}>
            {m.icon}
            <div>
              <Text size="2" weight="bold" style={{ color: state.namingMode === m.id ? "var(--green-11)" : "var(--gray-12)" }}>{m.name}</Text>
              <Text size="1" style={{ color: "var(--gray-8)", display: "block", marginTop: 2 }}>{m.desc}</Text>
            </div>
          </button>
        ))}
      </div>

      {/* Excel mode */}
      {state.namingMode === "excel" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            border: "2px dashed var(--gray-6)", borderRadius: 10,
            padding: "22px", textAlign: "center", background: "var(--gray-2)",
            marginBottom: 12, cursor: "pointer",
          }}>
            <Upload size={22} color="var(--gray-9)" style={{ margin: "0 auto 8px", display: "block" }} />
            <Text size="2" weight="bold" style={{ color: "var(--gray-12)" }}>拖曳 Excel 檔案到此</Text>
            <Text size="1" style={{ color: "var(--gray-8)", display: "block", marginTop: 3 }}>支援 .xlsx / .csv</Text>
          </div>
          <Button
            variant="solid" color="green"
            onClick={simulateLlm} disabled={llmLoading}
            style={{ width: "100%", justifyContent: "center", gap: 6 }}
          >
            {llmLoading
              ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> 分析中...</>
              : "自動歸納命名建議"
            }
          </Button>
          {llmSuggestions.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={label10}>建議規則（點選採用）</div>
              {llmSuggestions.map((s, i) => (
                <button key={i} onClick={() => addRule(s)} style={{
                  textAlign: "left", padding: "9px 12px", borderRadius: 7,
                  border: "1px solid var(--gray-6)", background: "var(--gray-2)",
                  fontSize: 12, color: "var(--gray-12)", cursor: "pointer",
                  fontFamily: "ui-monospace, monospace",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  {s}
                  <Plus size={12} color="var(--gray-8)" style={{ flexShrink: 0, marginLeft: 8 }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual mode */}
      {state.namingMode === "manual" && (
        <div style={{ marginBottom: 14 }}>
          <Text size="1" style={{ color: "var(--gray-9)", display: "block", marginBottom: 10, lineHeight: 1.7 }}>
            可用變數：{["{案號}", "{收發碼}", "{年月}", "{主旨}", "{客戶}"].map(v => (
              <code key={v} style={{ background: "var(--gray-4)", padding: "1px 5px", borderRadius: 3, marginRight: 4, fontFamily: "ui-monospace, monospace" }}>{v}</code>
            ))}
          </Text>
          <Flex gap="2">
            <input
              value={newRule}
              onChange={e => setNewRule(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addRule(newRule)}
              placeholder="{案號}/{年月}/{收發碼}_{主旨}"
              style={{
                flex: 1, border: "1px solid var(--gray-6)", borderRadius: 8,
                padding: "8px 12px", fontSize: 12,
                background: "var(--color-background)", color: "var(--gray-12)", outline: "none",
                fontFamily: "ui-monospace, monospace",
              }}
            />
            <Button variant="solid" color="green" onClick={() => addRule(newRule)} style={{ gap: 4 }}>
              <Plus size={13} /> 新增
            </Button>
          </Flex>
        </div>
      )}

      {/* Rules list */}
      {state.namingRules.length > 0 && (
        <Flex direction="column" gap="1">
          <div style={label10}>已設定規則</div>
          {state.namingRules.map((r, i) => (
            <Flex key={i} align="center" style={{
              padding: "8px 12px", borderRadius: 7,
              border: "1px solid var(--gray-6)", background: "var(--gray-3)",
            }}>
              <Text size="1" style={{ flex: 1, color: "var(--gray-12)", fontFamily: "ui-monospace, monospace" }}>{r}</Text>
              <button onClick={() => patch({ namingRules: state.namingRules.filter((_, j) => j !== i) })}
                style={{ border: "none", background: "none", cursor: "pointer", padding: "2px 4px", display: "flex" }}>
                <X size={12} color="var(--gray-9)" />
              </button>
            </Flex>
          ))}
        </Flex>
      )}
    </div>
  );
}

/* --- Step 4: Customize -------------------------------------- */

const FILE_TYPES = ["pdf", "docx", "xlsx", "eml", "png", "jpg", "txt", "zip"];

function Step4({ state, patch }: { state: WizardState; patch: (v: Partial<WizardState>) => void }) {
  const toggleType = (t: string) =>
    patch({ fileFilter: state.fileFilter.includes(t) ? state.fileFilter.filter(f => f !== t) : [...state.fileFilter, t] });

  return (
    <div style={{ padding: "32px 28px 28px" }}>
      <StepHeader step={4} title="客製化調整" desc="調整歸檔結構、命名格式與檔案篩選" />

      {/* Archive structure */}
      <div style={{ marginBottom: 22 }}>
        <div style={label10}>資料夾結構模板</div>
        <input
          value={state.archiveStructure}
          onChange={e => patch({ archiveStructure: e.target.value })}
          style={{
            width: "100%", boxSizing: "border-box",
            border: "1px solid var(--gray-6)", borderRadius: 8,
            padding: "10px 14px", fontSize: 12,
            background: "var(--color-background)", color: "var(--gray-12)", outline: "none",
            fontFamily: "ui-monospace, monospace",
          }}
        />
        <Text size="1" style={{ color: "var(--gray-8)", display: "block", marginTop: 6 }}>
          預覽：<span style={{ fontFamily: "ui-monospace, monospace", color: "var(--gray-9)" }}>
            KOIT20004TUS7/2024-03/FA_Office_Action_Draft
          </span>
        </Text>
      </div>

      {/* File types */}
      <div style={{ marginBottom: 22 }}>
        <div style={label10}>歸檔檔案類型</div>
        <Flex wrap="wrap" gap="2">
          {FILE_TYPES.map(t => {
            const on = state.fileFilter.includes(t);
            return (
              <Button
                key={t}
                variant={on ? "solid" : "ghost"}
                color={on ? "green" : "gray"}
                size="1"
                onClick={() => toggleType(t)}
              >
                .{t}
              </Button>
            );
          })}
        </Flex>
      </div>

      {/* Toggle */}
      <Flex align="center" justify="between" style={{
        padding: "14px 16px", border: "1px solid var(--gray-6)", borderRadius: 10,
        background: "var(--gray-2)",
      }}>
        <div>
          <Text size="2" weight="medium" style={{ color: "var(--gray-12)" }}>自動歸檔附件</Text>
          <Text size="1" style={{ color: "var(--gray-8)", display: "block", marginTop: 1 }}>信件附件也一併存入儲存空間</Text>
        </div>
        <Switch
          checked={state.includeAttachments}
          onCheckedChange={(checked) => patch({ includeAttachments: checked })}
          color="green"
        />
      </Flex>
    </div>
  );
}

/* --- Step 5: Deploy ----------------------------------------- */

function Step5({ deployIdx }: { deployIdx: number }) {
  const current = DEPLOY_STEPS[deployIdx];
  const pct     = current?.pct ?? 0;
  const done    = pct === 100;

  return (
    <div style={{ padding: "60px 48px 52px" }}>

      {/* Status label */}
      <Text size="1" weight="bold" style={{
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--gray-8)", display: "block", marginBottom: 16,
      }}>
        {done ? "Complete" : "Deploying"}
      </Text>

      {/* Current step -- large */}
      <Text style={{
        fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em",
        color: "var(--gray-12)", display: "block", marginBottom: 28, minHeight: 30,
        transition: "opacity 0.3s",
      }}>
        {done ? "設定完成" : current?.msg?.replace("...", "")}
      </Text>

      {/* Ruled progress line */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        {/* track */}
        <div style={{ height: 1, background: "var(--gray-6)", width: "100%" }} />
        {/* fill */}
        <div style={{
          position: "absolute", top: 0, left: 0, height: 1,
          background: "var(--gray-12)",
          width: `${pct}%`,
          transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
        }} />
        {/* cursor dot */}
        {!done && (
          <div style={{
            position: "absolute", top: -3, width: 7, height: 7,
            borderRadius: "50%", background: "var(--gray-12)",
            left: `calc(${pct}% - 3.5px)`,
            transition: "left 0.7s cubic-bezier(0.4,0,0.2,1)",
          }} />
        )}
      </div>

      {/* Percentage */}
      <Text style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: 11, fontWeight: 600,
        letterSpacing: "0.06em",
        color: "var(--gray-8)",
        display: "block", marginBottom: 36,
      }}>
        {String(pct).padStart(3, "\u2007")}%
      </Text>

      {/* Log -- minimal, no icons, just text */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, borderTop: "1px solid var(--gray-6)" }}>
        {DEPLOY_STEPS.slice(0, deployIdx + 1).map((s, i) => {
          const isCurrent = i === deployIdx;
          const isDone    = i < deployIdx;
          return (
            <Flex key={i} align="baseline" gap="3" style={{
              padding: "9px 0",
              borderBottom: "1px solid var(--gray-6)",
            }}>
              <Text style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 9, color: "var(--gray-7)",
                minWidth: 16, flexShrink: 0,
              }}>
                {isDone ? "done" : isCurrent ? ">" : "."}
              </Text>
              <Text size="1" style={{
                letterSpacing: "0.01em",
                color: isDone ? "var(--gray-8)" : "var(--gray-12)",
                fontWeight: isCurrent ? 600 : 400,
                transition: "color 0.3s",
              }}>
                {s.msg}
              </Text>
              {isDone && (
                <Text style={{
                  marginLeft: "auto", fontSize: 9,
                  fontFamily: "ui-monospace, monospace",
                  color: "var(--gray-7)", letterSpacing: "0.08em",
                }}>
                  {s.pct}%
                </Text>
              )}
            </Flex>
          );
        })}
      </div>
    </div>
  );
}

/* --- Step 6: Done ------------------------------------------- */

function Step6({ state, onDone }: { state: WizardState; onDone: () => void }) {
  const storageLabel = ({ google_drive: "Google Drive", onedrive: "OneDrive", dropbox: "Dropbox" } as Record<string, string>)[state.storage] ?? "未設定";

  return (
    <div style={{ padding: "52px 28px 48px", textAlign: "center" }}>
      <div style={{
        width: 76, height: 76, borderRadius: "50%",
        background: "var(--green-2)", border: "2px solid var(--green-6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px",
      }}>
        <CheckCircle2 size={38} color="var(--green-9)" />
      </div>

      <Text size="5" weight="bold" style={{ color: "var(--gray-12)", display: "block", marginBottom: 6 }}>設定完成！</Text>
      <Text size="2" style={{ color: "var(--gray-8)", display: "block", marginBottom: 28 }}>
        MailFlow 已開始監控 <strong>{state.emailAccount || "信箱"}</strong> 的來往信件
      </Text>

      {/* Summary */}
      <Flex direction="column" gap="2" mb="6" style={{ textAlign: "left" }}>
        {[
          { label: "信箱",  value: state.emailProvider === "gmail" ? "Gmail" : state.emailProvider === "outlook" ? "Outlook" : "未設定" },
          { label: "帳號",  value: state.emailAccount || "---" },
          { label: "儲存",  value: storageLabel },
          { label: "命名",  value: state.namingRules[0] ?? state.archiveStructure, mono: true },
          { label: "附件",  value: state.includeAttachments ? "自動歸檔" : "僅信件" },
        ].map(r => (
          <Flex key={r.label} align="baseline" gap="3" style={{
            padding: "9px 14px", border: "1px solid var(--gray-6)", borderRadius: 8,
            background: "var(--gray-2)",
          }}>
            <Text size="1" weight="bold" style={{ color: "var(--gray-8)", minWidth: 34, textTransform: "uppercase", letterSpacing: "0.05em" }}>{r.label}</Text>
            <Text size="1" style={{ color: "var(--gray-12)", fontFamily: r.mono ? "ui-monospace, monospace" : "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.value}</Text>
          </Flex>
        ))}
      </Flex>

      <Button variant="solid" color="green" size="3" onClick={onDone} style={{ gap: 8 }}>
        前往總覽 <ChevronRight size={16} />
      </Button>
    </div>
  );
}

/* --- StepHeader --------------------------------------------- */

function StepHeader({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <Text size="1" weight="bold" style={{ color: "var(--green-9)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>
        步驟 {step} / 4
      </Text>
      <Text size="5" weight="bold" style={{ color: "var(--gray-12)", display: "block", marginBottom: 4, letterSpacing: "-0.02em" }}>{title}</Text>
      <Text size="2" style={{ color: "var(--gray-8)" }}>{desc}</Text>
    </div>
  );
}
