"use client";

import { useState } from "react";
import { Clock, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";
import { Button, Badge, Select, Switch } from "@radix-ui/themes";
import {
  MOCK_DEADLINES,
  MOCK_CASES,
  DEADLINE_TYPE_LABELS,
  TYPE_LABELS,
  STATUS_LABELS,
  type DeadlineItem,
} from "@/lib/mock-cases";

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function urgencyLevel(days: number): "overdue" | "critical" | "warning" | "normal" {
  if (days < 0)   return "overdue";
  if (days <= 7)  return "critical";
  if (days <= 30) return "warning";
  return "normal";
}

const URGENCY_STYLES = {
  overdue:  { fg: "var(--red-11)", bg: "var(--red-2)",    border: "var(--red-6)",    labelFg: "var(--red-11)",   label: "逾期",   badgeColor: "red" as const },
  critical: { fg: "var(--red-11)", bg: "var(--orange-2)", border: "var(--orange-6)", labelFg: "var(--orange-11)", label: "緊急",   badgeColor: "orange" as const },
  warning:  { fg: "var(--orange-11)", bg: "var(--amber-2)", border: "var(--amber-6)", labelFg: "var(--orange-11)", label: "注意", badgeColor: "amber" as const },
  normal:   { fg: "var(--gray-11)", bg: "var(--color-background)", border: "transparent", labelFg: "var(--gray-11)", label: "", badgeColor: "gray" as const },
};

const DEADLINE_TYPE_COLORS: Record<string, "orange" | "blue" | "cyan" | "green" | "violet" | "amber" | "gray"> = {
  oa_response:    "orange",
  annuity:        "blue",
  filing:         "cyan",
  grant_deadline: "green",
  renewal:        "violet",
  appeal:         "amber",
  other:          "gray",
};

const AUTOMATION_RULES = [
  { id: "r1", name: "OA 答辯觸發", trigger: "收到 OA 通知", action: "自動建立答辯期限", jurisdiction: "ALL", deadline_days: 90, status: "active" },
  { id: "r2", name: "TW 年費提醒", trigger: "年金到期前 90 天", action: "自動建立繳費待辦 + 提醒郵件", jurisdiction: "TW", deadline_days: 90, status: "active" },
  { id: "r3", name: "US 年費提醒", trigger: "年金到期前 180 天", action: "自動建立繳費待辦 + 提醒郵件", jurisdiction: "US", deadline_days: 180, status: "active" },
  { id: "r4", name: "JP 年費提醒", trigger: "年金到期前 120 天", action: "自動建立繳費待辦", jurisdiction: "JP", deadline_days: 120, status: "active" },
  { id: "r5", name: "PCT 移行觸發", trigger: "國際出願日起 30 個月", action: "自動建立各國移行期限", jurisdiction: "ALL", deadline_days: 900, status: "active" },
  { id: "r6", name: "馬德里指定國", trigger: "馬德里出願後", action: "自動建立指定國審查期限", jurisdiction: "ALL", deadline_days: 365, status: "active" },
  { id: "r7", name: "審查意見回覆", trigger: "審查意見通知", action: "建立回覆期限 + 指派承辦人", jurisdiction: "ALL", deadline_days: 60, status: "paused" },
  { id: "r8", name: "商標更新提醒", trigger: "商標到期前 180 天", action: "自動建立更新待辦 + 通知客戶", jurisdiction: "TW", deadline_days: 180, status: "active" },
];

function AutomationRulesPanel({ show, rules, onToggleRule }: {
  show: boolean;
  rules: { id: string; name: string; trigger: string; action: string; jurisdiction: string; deadline_days: number; status: string }[];
  onToggleRule: (id: string) => void;
}) {
  if (!show) return null;
  return (
    <div style={{
      background: "var(--gray-2)", border: "1px solid var(--gray-6)", borderRadius: 6,
      marginBottom: 20, overflow: "hidden",
      animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid var(--gray-6)",
        fontSize: 13, fontWeight: 700, color: "var(--gray-12)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Zap size={14} color="var(--orange-11)" />
        自動化規則一覽
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--gray-11)", marginLeft: 4 }}>
          觸發條件達成時自動建立期限和待辦
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{
              background: "var(--gray-3)", fontSize: 11, fontWeight: 600,
              color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              <th style={{ padding: "8px 14px", textAlign: "left" }}>規則名稱</th>
              <th style={{ padding: "8px 14px", textAlign: "left" }}>觸發條件</th>
              <th style={{ padding: "8px 14px", textAlign: "left" }}>自動行動</th>
              <th style={{ padding: "8px 14px", textAlign: "center" }}>適用國家</th>
              <th style={{ padding: "8px 14px", textAlign: "center" }}>天數</th>
              <th style={{ padding: "8px 14px", textAlign: "center" }}>狀態</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, i) => {
              const isActive = rule.status === "active";
              return (
                <tr key={rule.id} style={{
                  borderBottom: i < rules.length - 1 ? "1px solid var(--gray-6)" : "none",
                  background: "var(--gray-2)",
                }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--gray-12)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                        background: isActive ? "var(--green-9)" : "var(--gray-8)",
                      }} />
                      {rule.name}
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--gray-11)" }}>{rule.trigger}</td>
                  <td style={{ padding: "10px 14px", color: "var(--gray-11)" }}>{rule.action}</td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <Badge variant="soft" color={rule.jurisdiction === "ALL" ? "gray" : "blue"} size="1">
                      {rule.jurisdiction}
                    </Badge>
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center", fontFamily: "ui-monospace, monospace", color: "var(--gray-12)" }}>
                    {rule.deadline_days}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => onToggleRule(rule.id)}
                      color="green"
                      size="1"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeadlineRow({ item, idx, total, expanded, onToggle }: {
  item: DeadlineItem; idx: number; total: number;
  expanded: boolean; onToggle: () => void;
}) {
  const days   = daysUntil(item.due_date);
  const level  = urgencyLevel(days);
  const urg    = URGENCY_STYLES[level];
  const tc     = DEADLINE_TYPE_COLORS[item.type] ?? "gray";
  const isLast = idx === total - 1;
  const matchedCase = MOCK_CASES.find(c => c.case_number === item.case_number);

  return (
    <>
      <div
        className="deadline-row"
        onClick={onToggle}
        style={{
          display: "grid",
          gridTemplateColumns: "140px 64px 1fr 100px 110px 90px 80px",
          padding: "12px 16px",
          borderBottom: (isLast && !expanded) ? "none" : "1px solid var(--gray-6)",
          borderLeft: `3px solid ${level === "normal" ? "transparent" : urg.fg}`,
          background: level === "normal" ? "var(--color-background)" : urg.bg,
          alignItems: "center", gap: 10, cursor: "pointer",
        }}
      >
        {/* Case number */}
        <div className="col-hide-m" style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 600, color: "var(--gray-12)" }}>
          {item.case_number}
        </div>

        {/* Type badge */}
        <div className="col-hide-m">
          <Badge variant="soft" color={tc} size="1">
            {DEADLINE_TYPE_LABELS[item.type]}
          </Badge>
        </div>

        {/* Description */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--gray-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.description}
          </div>
          <div style={{ fontSize: 11, color: "var(--gray-9)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.client_name} — {item.case_title}
          </div>
        </div>

        {/* Client */}
        <div className="col-hide-m" style={{ fontSize: 11, color: "var(--gray-11)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.assignee_name}
        </div>

        {/* Due date */}
        <div className="col-hide-m">
          <div style={{ fontSize: 12, color: urg.fg, fontWeight: level !== "normal" ? 600 : 400 }}>
            {new Date(item.due_date).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit", year: "numeric" })}
          </div>
        </div>

        {/* Days counter */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {level !== "normal" && <Clock size={11} color={urg.fg} />}
          <span style={{ fontSize: 12, fontWeight: 600, color: urg.fg }}>
            {days < 0 ? `逾期 ${Math.abs(days)} 天` : days === 0 ? "今天" : `${days} 天`}
          </span>
        </div>

        {/* Urgency badge */}
        <div>
          {level !== "normal" ? (
            <Badge variant="soft" color={urg.badgeColor} size="1" style={{ fontWeight: 700 }}>
              {urg.label}
            </Badge>
          ) : (
            <span style={{ fontSize: 11, color: "var(--gray-9)" }}>—</span>
          )}
        </div>
      </div>

      {/* Expansion panel */}
      {expanded && (
        <div style={{
          background: "var(--gray-2)",
          borderBottom: isLast ? "none" : "1px solid var(--gray-6)",
          padding: "14px 20px",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* 案件資訊 */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-12)", marginBottom: 8 }}>案件資訊</div>
              {matchedCase ? (
                <div style={{ fontSize: 12, color: "var(--gray-11)", lineHeight: 1.8 }}>
                  <div><span style={{ fontWeight: 600, color: "var(--gray-9)" }}>案名：</span>{matchedCase.title}</div>
                  <div><span style={{ fontWeight: 600, color: "var(--gray-9)" }}>類型：</span>{TYPE_LABELS[matchedCase.case_type]}</div>
                  <div><span style={{ fontWeight: 600, color: "var(--gray-9)" }}>管轄：</span>{matchedCase.jurisdiction}</div>
                  <div><span style={{ fontWeight: 600, color: "var(--gray-9)" }}>狀態：</span>{STATUS_LABELS[matchedCase.status]}</div>
                  <div><span style={{ fontWeight: 600, color: "var(--gray-9)" }}>客戶：</span>{matchedCase.client_name}</div>
                  <div><span style={{ fontWeight: 600, color: "var(--gray-9)" }}>承辦人：</span>{matchedCase.assignee_name}</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--gray-11)" }}>查無對應案件資料</div>
              )}
            </div>

            {/* 期限說明 + 所需行動 */}
            <div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-12)", marginBottom: 6 }}>期限說明</div>
                <div style={{ fontSize: 12, color: "var(--gray-11)", lineHeight: 1.7 }}>
                  {item.description}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-12)", marginBottom: 6 }}>所需行動</div>
                <div style={{ fontSize: 12, color: "var(--gray-11)", lineHeight: 1.7 }}>
                  {item.type === "oa_response" && "準備並提交 OA 答辯書，回覆審查意見。"}
                  {item.type === "annuity" && "繳納年費以維持專利權有效。"}
                  {item.type === "filing" && "完成申請文件並於期限前送件。"}
                  {item.type === "grant_deadline" && "繳納領證費並完成領證程序。"}
                  {item.type === "renewal" && "辦理續展申請以延續權利。"}
                  {item.type === "appeal" && "準備並提交申訴書狀。"}
                  {item.type === "other" && "依據期限說明完成所需處理事項。"}
                </div>
              </div>
              <Link href="/app/cases">
                <Button variant="outline" color="blue" size="1" style={{ cursor: "pointer" }}>
                  查看案件
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DeadlinesPage() {
  const [typeFilter, setType]       = useState("");
  const [assigneeFilter, setAssignee] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [ruleStatuses, setRuleStatuses] = useState<Record<string, string>>(
    () => Object.fromEntries(AUTOMATION_RULES.map(r => [r.id, r.status]))
  );

  const rulesWithState = AUTOMATION_RULES.map(r => ({ ...r, status: ruleStatuses[r.id] ?? r.status }));

  const sorted = [...MOCK_DEADLINES]
    .filter(d => d.status !== "completed")
    .filter(d => !typeFilter    || d.type          === typeFilter)
    .filter(d => !assigneeFilter || d.assignee_name === assigneeFilter)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const overdue  = sorted.filter(d => daysUntil(d.due_date) < 0).length;
  const critical = sorted.filter(d => { const x = daysUntil(d.due_date); return x >= 0 && x <= 7; }).length;
  const warning  = sorted.filter(d => { const x = daysUntil(d.due_date); return x > 7 && x <= 30; }).length;

  const assignees = Array.from(new Set(MOCK_DEADLINES.map(d => d.assignee_name)));

  return (
    <div className="page-pad" style={{ padding: "24px 28px", maxWidth: 1100 }}>

      {/* Page description + automation rules toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: "var(--gray-11)", lineHeight: 1.6 }}>
          期限一覽從所有進行中案件提取截止日期，以緊急程度排序。展開可查看案件詳情。
        </div>
        <Button
          variant={showRules ? "outline" : "ghost"}
          color={showRules ? "orange" : "gray"}
          onClick={() => setShowRules(!showRules)}
          style={{ gap: 6, flexShrink: 0, cursor: "pointer" }}
        >
          <Zap size={13} />
          自動化規則
          <Badge variant="soft" color={showRules ? "orange" : "gray"} size="1">
            {AUTOMATION_RULES.length} 條規則
          </Badge>
        </Button>
      </div>

      {/* Automation rules panel */}
      <AutomationRulesPanel
        show={showRules}
        rules={rulesWithState}
        onToggleRule={(id) => setRuleStatuses(prev => ({
          ...prev,
          [id]: prev[id] === "active" ? "paused" : "active",
        }))}
      />

      {/* Alert strip */}
      {(overdue > 0 || critical > 0) && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 16px", marginBottom: 20,
          background: "var(--red-2)", border: "1px solid var(--red-6)", borderRadius: 6,
        }}>
          <AlertTriangle size={14} color="var(--red-11)" />
          <span style={{ fontSize: 13, color: "var(--red-11)", fontWeight: 600 }}>
            {overdue > 0 && `${overdue} 個期限已逾期`}
            {overdue > 0 && critical > 0 && " · "}
            {critical > 0 && `${critical} 個 7 天內到期`}
          </span>
          <span style={{ fontSize: 12, color: "var(--red-11)", marginLeft: 4 }}>請立即處理</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="stat-row" style={{ display: "flex", gap: 0, marginBottom: 20, border: "1px solid var(--gray-6)", borderRadius: 6, overflow: "hidden", background: "var(--color-background)" }}>
        {[
          { label: "已逾期",   value: overdue,       color: "var(--red-11)",    bg: overdue  > 0 ? "var(--red-2)" : "transparent" },
          { label: "7 天內",   value: critical,      color: "var(--orange-11)", bg: critical > 0 ? "var(--orange-2)" : "transparent" },
          { label: "30 天內",  value: warning,       color: "var(--orange-11)", bg: "transparent" },
          { label: "全部待辦", value: sorted.length,  color: "var(--gray-12)",   bg: "transparent" },
        ].map(({ label, value, color, bg }, i, arr) => (
          <div key={label} style={{
            flex: 1, padding: "14px 20px",
            borderRight: i < arr.length - 1 ? "1px solid var(--gray-6)" : "none",
            background: bg,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <Select.Root value={typeFilter} onValueChange={setType}>
          <Select.Trigger placeholder="所有類型" variant="surface" />
          <Select.Content>
            <Select.Item value="">所有類型</Select.Item>
            <Select.Item value="oa_response">OA 答辯</Select.Item>
            <Select.Item value="annuity">年費</Select.Item>
            <Select.Item value="filing">申請期限</Select.Item>
            <Select.Item value="grant_deadline">領證期限</Select.Item>
            <Select.Item value="renewal">續展</Select.Item>
          </Select.Content>
        </Select.Root>
        <Select.Root value={assigneeFilter} onValueChange={setAssignee}>
          <Select.Trigger placeholder="所有承辦人" variant="surface" />
          <Select.Content>
            <Select.Item value="">所有承辦人</Select.Item>
            {assignees.map(a => <Select.Item key={a} value={a}>{a}</Select.Item>)}
          </Select.Content>
        </Select.Root>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid var(--gray-6)", borderRadius: 6, overflow: "hidden" }}>
        {/* Column header */}
        <div className="deadline-header" style={{
          display: "grid",
          gridTemplateColumns: "140px 64px 1fr 100px 110px 90px 80px",
          padding: "7px 16px", gap: 10,
          background: "var(--gray-2)", borderBottom: "1px solid var(--gray-6)",
          fontSize: 11, fontWeight: 600, color: "var(--gray-9)",
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          <div className="col-hide-m">案號</div>
          <div className="col-hide-m">類型</div>
          <div>說明</div>
          <div className="col-hide-m">承辦人</div>
          <div className="col-hide-m">截止日</div>
          <div>剩餘時間</div>
          <div>緊急度</div>
        </div>

        {sorted.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <CheckCircle2 size={24} color="var(--green-9)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: "var(--gray-9)" }}>目前無待處理期限</div>
          </div>
        ) : (
          sorted.map((item, i) => (
            <DeadlineRow
              key={item.id}
              item={item}
              idx={i}
              total={sorted.length}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
