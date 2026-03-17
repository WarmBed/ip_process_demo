"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Clock, Mail, AlertCircle, CheckSquare, Bot, X, ChevronRight, ChevronDown,
  Check, FileText, User, Edit2, AlertTriangle, Folder,
} from "lucide-react";
import {
  MOCK_DEADLINES, MOCK_STAFF, MOCK_CASES,
  DEADLINE_TYPE_LABELS, STATUS_LABELS, TYPE_LABELS, JURISDICTION_LABELS,
} from "@/lib/mock-cases";
import { MOCK_TODOS, DIRECTION_CONFIG } from "@/lib/mock-todo";

// ── Types ──────────────────────────────────────────────────────

type IncomingMail = {
  id: string; case_number: string; case_id: string; client_name: string;
  received_at: string; office: string; doc_title: string;
  ai_category: string; ai_deadline: string; ai_confidence: number;
  ai_suggestion: string; attachments: number;
  needs_review?: boolean; ai_code?: string;
};

type EmailMsg = {
  id: string; subject: string; from_name: string; from_addr: string;
  date: string; direction: "in" | "out"; snippet: string;
  attachments?: string[];
};

type DriveItem = {
  name: string; type: "folder" | "pdf" | "doc" | "sheet" | "img";
  modified: string; size?: string; provider: "gdrive" | "dropbox" | "onedrive";
};

type SelectedKind = "deadline" | "annuity" | "incoming" | "todo";
type SelectedItem = { id: string; kind: SelectedKind };

// ── Direction codes (收發碼) ───────────────────────────────────

const DIR_CODES: Record<string, { label: string; desc: string; color: string; bg: string; border: string }> = {
  FA: { label: "FA", desc: "我方 → 客戶",   color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  FC: { label: "FC", desc: "客戶 → 我方",   color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  TA: { label: "TA", desc: "我方 → 代理人", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  TC: { label: "TC", desc: "代理人 → 我方", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  FG: { label: "FG", desc: "官方 → 我方",   color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  TG: { label: "TG", desc: "我方 → 官方",   color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  FX: { label: "FX", desc: "其他 / 不明",   color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
};

const DEADLINE_BADGE: Record<string, { fg: string; bg: string }> = {
  oa_response:    { fg: "#92400e", bg: "#fffbeb" },
  annuity:        { fg: "#5b21b6", bg: "#f5f3ff" },
  filing:         { fg: "#1e40af", bg: "#eff6ff" },
  grant_deadline: { fg: "#065f46", bg: "#ecfdf5" },
  renewal:        { fg: "#9a3412", bg: "#fff7ed" },
  appeal:         { fg: "#991b1b", bg: "#fef2f2" },
  other:          { fg: "#374151", bg: "#f9fafb" },
};

const MAIL_CAT_COLOR: Record<string, { fg: string; bg: string }> = {
  "OA答辯": { fg: "#92400e", bg: "#fffbeb" },
  "領證費":  { fg: "#065f46", bg: "#ecfdf5" },
  "領證":    { fg: "#065f46", bg: "#ecfdf5" },
  "年費":    { fg: "#5b21b6", bg: "#f5f3ff" },
  "待確認":  { fg: "#92400e", bg: "#fff7ed" },
  "其他":    { fg: "#374151", bg: "#f9fafb" },
};

// ── Mock incoming official mail ────────────────────────────────

const MOCK_INCOMING: IncomingMail[] = [
  {
    id: "mi001", case_number: "TSMC23014PUS", case_id: "c002", client_name: "台積電",
    received_at: "2026-03-18T09:23:00", office: "USPTO",
    doc_title: "Non-Final Office Action",
    ai_category: "OA答辯", ai_code: "FG", ai_deadline: "2026-06-18", ai_confidence: 0.97,
    ai_suggestion: "建議指派陳建志處理（半導體專長）。Non-Final OA，可申請 3 個月延期。建議先與台積電工程師確認 Claim 1 的 §102 核駁理由後再草擬答辯，預計需要 3–4 週。",
    attachments: 3,
  },
  {
    id: "mi002", case_number: "EPPA23801EP", case_id: "c013", client_name: "European Client C",
    received_at: "2026-03-18T08:15:00", office: "EPO",
    doc_title: "Rule 71(3) Communication",
    ai_category: "領證費", ai_code: "FG", ai_deadline: "2026-04-30", ai_confidence: 0.99,
    ai_suggestion: "EPO 核准通知，需在 4/30 前回覆並繳納規費。建議林雅婷盡快聯繫 European Client C 確認繳費意願及是否需要翻譯聲明。",
    attachments: 2,
  },
  {
    id: "mi003", case_number: "MTKE24011PKR", case_id: "c020", client_name: "聯發科技",
    received_at: "2026-03-17T14:40:00", office: "KIPO",
    doc_title: "심사의견통지서",
    ai_category: "OA答辯", ai_code: "FG", ai_deadline: "2026-06-17", ai_confidence: 0.93,
    ai_suggestion: "韓國 KIPO 審查意見。建議陳建志評估答辯策略後，委託韓國代理所處理。注意韓文 OA 需翻譯評估，建議預留 2 週翻譯時間。",
    attachments: 1,
  },
  {
    id: "mi004", case_number: "ADTA24001TTW", case_id: "c008", client_name: "威剛科技",
    received_at: "2026-03-17T11:05:00", office: "TIPO",
    doc_title: "商標核准處分書",
    ai_category: "領證", ai_code: "FG", ai_deadline: "2026-04-10", ai_confidence: 0.99,
    ai_suggestion: "台灣商標核准！需在 4/10 前繳納核准費。建議黃怡君處理行政程序，並立即通知威剛科技客戶準備領取商標證書。",
    attachments: 1,
  },
  {
    id: "mi005", case_number: "FOXC24003PCN", case_id: "c010", client_name: "鴻海精密",
    received_at: "2026-03-18T10:30:00", office: "CNIPA",
    doc_title: "第一次審查意見通知書",
    ai_category: "待確認", ai_code: "FG", ai_deadline: "2026-06-18", ai_confidence: 0.68,
    ai_suggestion: "中國 CNIPA 第一次審查意見，AI 分類信心不足（68%）。可能是 OA答辯 或 補充說明，文件語言為中文，建議人工確認後再分配處理人員。",
    attachments: 2, needs_review: true,
  },
];

// ── Mock email threads ─────────────────────────────────────────

const MOCK_THREADS: Record<string, EmailMsg[]> = {
  "TSMC23014PUS": [
    {
      id: "t001", subject: "Non-Final Office Action – 18/234,701",
      from_name: "USPTO Examiner", from_addr: "eoa@uspto.gov",
      date: "2026-03-18", direction: "in",
      snippet: "Claims 1–15 rejected under 35 USC §102(a)(1) and §103. Applicant is required to respond within three months...",
      attachments: ["OA_20260318.pdf", "Search_Report.pdf", "Drawings_Cited.pdf"],
    },
    {
      id: "t002", subject: "RE: TSMC23014PUS – IDS Submission",
      from_name: "陳建志", from_addr: "james.chen@ipwinner.tw",
      date: "2026-03-15", direction: "out",
      snippet: "Please find attached the Information Disclosure Statement (Form PTO/SB/08) for application 18/234,701, listing 12 references.",
      attachments: ["IDS_Form1449_20260315.pdf"],
    },
    {
      id: "t003", subject: "Filing Receipt – Application 18/234,701",
      from_name: "USPTO", from_addr: "efiling@uspto.gov",
      date: "2023-06-22", direction: "in",
      snippet: "Your patent application has been received and assigned application number 18/234,701. Filing date confirmed: 2023-06-20.",
      attachments: ["Filing_Receipt_20230622.pdf"],
    },
  ],
  "EPPA23801EP": [
    {
      id: "t004", subject: "Rule 71(3) Communication – 23702381.4",
      from_name: "EPO Examining Division", from_addr: "examiners@epo.org",
      date: "2026-03-18", direction: "in",
      snippet: "The examining division intends to grant a European patent with the text as last filed. Please find enclosed the communication under Rule 71(3) EPC.",
      attachments: ["EPO_Rule71_3_20260318.pdf", "Amended_Claims_Final.pdf"],
    },
    {
      id: "t005", subject: "Response to Rule 71(3) – Filed",
      from_name: "林雅婷", from_addr: "ya.lin@ipwinner.tw",
      date: "2026-01-15", direction: "out",
      snippet: "We hereby submit our response and approval of the text intended for grant under Rule 71(3). Translation declaration enclosed.",
      attachments: ["Response_Rule71_3.pdf", "Translation_Declaration.docx"],
    },
    {
      id: "t006", subject: "Examination Report – 23702381.4",
      from_name: "EPO", from_addr: "examiners@epo.org",
      date: "2025-09-10", direction: "in",
      snippet: "Please find enclosed the Examination Report for European patent application 23702381.4, Medical Implants (biodegradable polymer).",
      attachments: ["Exam_Report_20250910.pdf"],
    },
  ],
  "MTKE24011PKR": [
    {
      id: "t007", subject: "심사의견통지서 – 10-2024-0087654",
      from_name: "KIPO 審查員", from_addr: "kipo@kipo.go.kr",
      date: "2026-03-17", direction: "in",
      snippet: "귀하의 특허출원에 대한 심사의견을 다음과 같이 통지합니다. 독립항 1항은 선행기술에 의해 진보성이 없습니다.",
      attachments: ["KIPO_OA_20260317.pdf"],
    },
    {
      id: "t008", subject: "KR Filing Confirmation – 10-2024-0087654",
      from_name: "Korean Associate (Kim & Chang)", from_addr: "agent@kimnchang.kr",
      date: "2024-09-16", direction: "in",
      snippet: "We confirm the filing of the KR patent application. Appl. No. 10-2024-0087654, Title: Multiband 5G Antenna Array.",
      attachments: ["KR_Filing_Receipt.pdf", "Korean_Claims_Translation.pdf"],
    },
    {
      id: "t009", subject: "MTKE24011PKR – Instruction Letter",
      from_name: "吳柏翰", from_addr: "bo.wu@ipwinner.tw",
      date: "2024-09-14", direction: "out",
      snippet: "Please find attached the instruction letter and power of attorney for the Korean filing of Multiband 5G Antenna Array.",
      attachments: ["Instruction_Letter_KR.pdf", "POA_KR.pdf"],
    },
  ],
  "ADTA24001TTW": [
    {
      id: "t010", subject: "商標核准處分書 – 113012345",
      from_name: "智慧財產局", from_addr: "tipo@tipo.gov.tw",
      date: "2026-03-17", direction: "in",
      snippet: "本局審查商標申請案，認定申請之商標應予核准，依商標法第31條規定准予申請，申請人應自本處分送達日起三個月內繳納核准費。",
      attachments: ["商標核准處分書_20260317.pdf"],
    },
    {
      id: "t011", subject: "客戶通知 – ADATA PRO 商標核准",
      from_name: "黃怡君", from_addr: "yi.huang@ipwinner.tw",
      date: "2026-03-17", direction: "out",
      snippet: "敬啟者，貴公司申請之 ADATA PRO 商標（案號 113012345）已於今日獲智慧財產局核准，請確認是否繳納核准費以完成領證程序。",
    },
    {
      id: "t012", subject: "商標申請受理通知 – 113012345",
      from_name: "智慧財產局", from_addr: "tipo@tipo.gov.tw",
      date: "2024-01-12", direction: "in",
      snippet: "本局已收到商標申請，申請案號：113012345，申請人：威剛科技股份有限公司，商標名稱：ADATA PRO。",
      attachments: ["申請受理通知_20240112.pdf"],
    },
  ],
  "FOXC24003PCN": [
    {
      id: "t013", subject: "第一次審查意見通知書 – 202410456789",
      from_name: "中國國家知識產權局", from_addr: "cnipa@cnipa.gov.cn",
      date: "2026-03-18", direction: "in",
      snippet: "申請號：202410456789，本局對上述申請進行審查，認為存在以下缺陷：獨立權利要求1不具有創造性，引用CN202012345678A。",
      attachments: ["審查意見通知書_20260318.pdf", "CNIPA_檢索報告.pdf"],
    },
    {
      id: "t014", subject: "CN 申請受理通知",
      from_name: "中國代理人 (永新專利)", from_addr: "agent@yongxin.cn",
      date: "2024-07-18", direction: "in",
      snippet: "已確認中國專利申請遞交，申請號 202410456789，申請日 2024-07-15，申請人：鴻海精密工業。",
      attachments: ["CN_Filing_Receipt_20240718.pdf"],
    },
  ],
  "MTKE23005PUS": [
    {
      id: "t015", subject: "Non-Final Office Action – 18/445,002",
      from_name: "USPTO Examiner", from_addr: "eoa@uspto.gov",
      date: "2025-12-31", direction: "in",
      snippet: "Claims 1–20 rejected. §103 obviousness over Chen et al. (US 10,523,410) in view of Kim (WO 2021/123456). Response due March 31, 2026.",
      attachments: ["OA_20251231.pdf", "Prior_Art_Search_Results.pdf"],
    },
    {
      id: "t016", subject: "MTKE23005PUS – Strategy Discussion",
      from_name: "聯發科技 IP 部門", from_addr: "ip@mediatek.com",
      date: "2026-01-10", direction: "in",
      snippet: "Hi, we reviewed the office action and believe the §103 rejection can be overcome by amending Claim 1 to add the specific beamforming parameter.",
    },
  ],
  "BRIT25710PUS1": [
    {
      id: "t017", subject: "RE: BRIT25710PUS1 – OA Response Draft v1",
      from_name: "John Smith (BSKB LLP)", from_addr: "jsmith@bskb.com",
      date: "2026-03-17", direction: "in",
      snippet: "Hi, please find attached our OA response draft v1. We believe the §103 rejection can be overcome. Please review Claims 6–10 first.",
      attachments: ["OA_Response_Draft_v1.pdf", "Claims_Amended_v1.pdf", "Experimental_Data.xlsx"],
    },
    {
      id: "t018", subject: "USPTO Office Action – 17/213,445",
      from_name: "USPTO", from_addr: "eoa@uspto.gov",
      date: "2025-09-30", direction: "in",
      snippet: "Claims 1–12 rejected under §103 over Chen (US 11,234,567) in view of Smith (US 10,876,543).",
      attachments: ["OA_20250930.pdf"],
    },
  ],
  "KOIT20004TUS7": [
    {
      id: "t019", subject: "KOIT20004TUS7 – TA 委託 Office Action Draft",
      from_name: "Korean IP Client (KOIT)", from_addr: "ip@koit.co.kr",
      date: "2026-03-17", direction: "in",
      snippet: "Please review the attached OA2 draft from our Korean associate. We need your confirmation on the direction code before proceeding.",
      attachments: ["OA2_Draft_20260317.pdf"],
    },
  ],
};

// ── Mock Google Drive / Dropbox / OneDrive files ───────────────

const MOCK_DRIVE: Record<string, DriveItem[]> = {
  "TSMC23014PUS": [
    { name: "TSMC23014PUS 案件資料夾", type: "folder", modified: "2026-03-18", provider: "gdrive" },
    { name: "USPTO_OA_NonFinal_20260318.pdf", type: "pdf", modified: "2026-03-18", size: "2.4 MB", provider: "gdrive" },
    { name: "Prior_Art_Search_Report.pdf",    type: "pdf", modified: "2026-03-18", size: "3.8 MB", provider: "gdrive" },
    { name: "Claims_v3_Draft.docx",           type: "doc", modified: "2026-03-15", size: "89 KB",  provider: "gdrive" },
    { name: "Drawings_Sheet1-8.pdf",          type: "pdf", modified: "2023-06-20", size: "5.1 MB", provider: "gdrive" },
    { name: "Timeline_OA_Tracker.xlsx",       type: "sheet", modified: "2026-03-10", size: "45 KB", provider: "gdrive" },
  ],
  "EPPA23801EP": [
    { name: "EPPA23801EP 案件資料夾",          type: "folder", modified: "2026-03-18", provider: "dropbox" },
    { name: "EPO_Rule71_3_20260318.pdf",       type: "pdf",    modified: "2026-03-18", size: "1.2 MB", provider: "dropbox" },
    { name: "Amended_Claims_Final.pdf",        type: "pdf",    modified: "2026-01-14", size: "678 KB", provider: "dropbox" },
    { name: "Response_EPO_20260115.pdf",       type: "pdf",    modified: "2026-01-15", size: "890 KB", provider: "dropbox" },
    { name: "Translation_Declaration.docx",   type: "doc",    modified: "2026-01-14", size: "32 KB",  provider: "dropbox" },
  ],
  "MTKE24011PKR": [
    { name: "MTKE24011PKR 案件資料夾",         type: "folder", modified: "2026-03-17", provider: "onedrive" },
    { name: "KIPO_OA_20260317.pdf",            type: "pdf",    modified: "2026-03-17", size: "3.2 MB", provider: "onedrive" },
    { name: "KR_Filing_Receipt.pdf",           type: "pdf",    modified: "2024-09-16", size: "567 KB", provider: "onedrive" },
    { name: "Korean_Claims_Translation.pdf",   type: "pdf",    modified: "2024-09-14", size: "234 KB", provider: "onedrive" },
    { name: "Instruction_Letter_KR.pdf",       type: "pdf",    modified: "2024-09-14", size: "89 KB",  provider: "onedrive" },
  ],
  "ADTA24001TTW": [
    { name: "ADTA24001TTW 商標資料夾",         type: "folder", modified: "2026-03-17", provider: "gdrive" },
    { name: "商標核准處分書_20260317.pdf",     type: "pdf",    modified: "2026-03-17", size: "456 KB", provider: "gdrive" },
    { name: "商標圖樣_ADATA_PRO.png",          type: "img",    modified: "2024-01-08", size: "120 KB", provider: "gdrive" },
    { name: "申請受理通知_20240112.pdf",       type: "pdf",    modified: "2024-01-12", size: "234 KB", provider: "gdrive" },
  ],
  "FOXC24003PCN": [
    { name: "FOXC24003PCN 案件資料夾",         type: "folder", modified: "2026-03-18", provider: "gdrive" },
    { name: "CNIPA_審查意見通知書.pdf",        type: "pdf",    modified: "2026-03-18", size: "2.8 MB", provider: "gdrive" },
    { name: "CNIPA_檢索報告.pdf",              type: "pdf",    modified: "2026-03-18", size: "1.4 MB", provider: "gdrive" },
    { name: "CN申請書_202410456789.pdf",       type: "pdf",    modified: "2024-07-15", size: "3.1 MB", provider: "gdrive" },
    { name: "鴻海_說明書_中文版.docx",        type: "doc",    modified: "2024-06-20", size: "1.2 MB", provider: "gdrive" },
  ],
  "MTKE23005PUS": [
    { name: "MTKE23005PUS 案件資料夾",         type: "folder", modified: "2026-01-10", provider: "dropbox" },
    { name: "OA_NonFinal_20251231.pdf",        type: "pdf",    modified: "2025-12-31", size: "1.8 MB", provider: "dropbox" },
    { name: "Prior_Art_Search_Results.pdf",    type: "pdf",    modified: "2025-12-31", size: "4.2 MB", provider: "dropbox" },
    { name: "Response_Draft_v1.docx",          type: "doc",    modified: "2026-01-15", size: "156 KB", provider: "dropbox" },
    { name: "Claims_Amendment_v1.docx",        type: "doc",    modified: "2026-01-15", size: "78 KB",  provider: "dropbox" },
    { name: "Strategy_Notes.xlsx",             type: "sheet",  modified: "2026-01-10", size: "34 KB",  provider: "dropbox" },
  ],
  "BRIT25710PUS1": [
    { name: "BRIT25710PUS 案件資料夾",         type: "folder", modified: "2026-03-17", provider: "gdrive" },
    { name: "OA_Response_Draft_v1.pdf",        type: "pdf",    modified: "2026-03-17", size: "2.1 MB", provider: "gdrive" },
    { name: "Claims_Amended_v1.pdf",           type: "pdf",    modified: "2026-03-17", size: "890 KB", provider: "gdrive" },
    { name: "Experimental_Data.xlsx",          type: "sheet",  modified: "2026-03-17", size: "210 KB", provider: "gdrive" },
  ],
  "KOIT20004TUS7": [
    { name: "KOIT20004TUS 案件資料夾",         type: "folder", modified: "2026-03-17", provider: "onedrive" },
    { name: "OA2_Draft_20260317.pdf",          type: "pdf",    modified: "2026-03-17", size: "1.5 MB", provider: "onedrive" },
    { name: "Prior_History_KOIT.pdf",          type: "pdf",    modified: "2024-04-10", size: "3.4 MB", provider: "onedrive" },
  ],
};

// ── AI suggestions for deadlines ──────────────────────────────

const AI_SUGGESTIONS: Record<string, string> = {
  d001: "建議陳建志優先處理。此為 Non-Final OA，可申請延期。建議先確認 Claim 主要技術特徵，與聯發科工程師討論後再草擬答辯。",
  d002: "FinFET 相關案件，陳建志有充分背景。建議提前 2 週完成答辯稿，避免最後壓縮審閱時間。",
  d003: "Rule 71(3) 核准通知，林雅婷主責。建議立即聯繫 European Client C 確認繳費，以免錯過核准期限。",
  d004: "第 4 年年費繳納，金額約 NT$8,000。建議黃怡君透過智財局線上系統繳納，並通知聯發科確認。",
  d005: "商標核准費由黃怡君處理。同時請通知威剛科技準備領取商標證書，安排後續維護計畫。",
  d006: "US 3.5 年維護費（Maintenance Fee），需在期限前繳至 USPTO。建議陳建志確認鴻海繳費意願後委由美國事務所處理。",
  d007: "Final OA，策略需謹慎。建議陳建志評估申請 RCE 或 Appeal，並諮詢韓國代理人意見後決策。",
  d008: "EPO 審查請求期限，吳柏翰主責。需繳審查費並確認 Claims 是否需修正，建議提前完成。",
};

// ── Helpers ────────────────────────────────────────────────────

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}
function urgencyColor(d: number) { return d <= 7 ? "#dc2626" : d <= 30 ? "#d97706" : "var(--fg-muted)"; }
function urgencyBorder(d: number) { return d <= 7 ? "#dc2626" : d <= 30 ? "#d97706" : "var(--border)"; }
function urgencyBg(d: number, sel: boolean) {
  if (sel) return "#eef2ff";
  return d <= 7 ? "#fef2f2" : "var(--bg)";
}

// ── Storage provider icons ─────────────────────────────────────

function StorageIcon({ provider }: { provider: "gdrive" | "dropbox" | "onedrive" }) {
  if (provider === "gdrive") return (
    <svg width="11" height="11" viewBox="0 0 87.3 78" fill="none">
      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5L6.6 66.85z" fill="#0066da"/>
      <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9 9 0 000 53h27.5l16.15-28z" fill="#00ac47"/>
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8L73.55 76.8z" fill="#ea4335"/>
      <path d="M43.65 25L57.4 0c-1.55-.55-3.2-.85-4.95-.85H34.9c-1.75 0-3.4.3-4.95.85L43.65 25z" fill="#00832d"/>
      <path d="M59.8 53H27.5L13.75 76.8c1.55.55 3.2.85 4.95.85h47.6c1.75 0 3.4-.3 4.95-.85L59.8 53z" fill="#2684fc"/>
      <path d="M73.4 26.5l-12.75-22.2c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#ffba00"/>
    </svg>
  );
  if (provider === "dropbox") return (
    <svg width="11" height="11" viewBox="0 0 43.1 40" fill="none">
      <path d="M12.8 0L0 8.2l12.8 8.2 12.8-8.2zm17.5 0L17.5 8.2l12.8 8.2 12.8-8.2zM0 24.5l12.8 8.2 12.8-8.2-12.8-8.2zm30.3-8.2l-12.8 8.2 12.8 8.2 12.8-8.2zM12.8 34.6l12.8 8.2 12.8-8.2-12.8-8.2z" fill="#0061ff"/>
    </svg>
  );
  return (
    <svg width="11" height="11" viewBox="0 0 22 28" fill="none">
      <rect width="22" height="28" rx="2" fill="#0078d4"/>
      <rect x="4" y="4" width="14" height="2" rx="1" fill="white"/>
      <rect x="4" y="9" width="14" height="2" rx="1" fill="white"/>
      <rect x="4" y="14" width="10" height="2" rx="1" fill="white"/>
    </svg>
  );
}

function DriveFileIcon({ type }: { type: DriveItem["type"] }) {
  const c = { folder: "#f59e0b", pdf: "#ef4444", doc: "#3b82f6", sheet: "#22c55e", img: "#a855f7" }[type];
  const I = type === "folder" ? Folder : FileText;
  return <I size={12} color={c} />;
}

// ── Small UI components ────────────────────────────────────────

function StatCell({ label, value, sub, last = false }: {
  label: string; value: React.ReactNode; sub?: string; last?: boolean;
}) {
  return (
    <div style={{ flex: 1, padding: "14px 20px", borderRight: last ? "none" : "1px solid var(--border)" }}>
      <div style={{ fontSize: 11, color: "var(--fg-subtle)", fontWeight: 500, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function BlockHead({ icon, title, badge, badgeColor, linkHref, count }: {
  icon: React.ReactNode; title: string; badge?: string; badgeColor?: string;
  linkHref?: string; count?: number;
}) {
  return (
    <div style={{
      padding: "9px 14px", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "var(--sl2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>{title}</span>
        {badge && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
            color: badgeColor ?? "#dc2626",
            background: `${badgeColor ?? "#dc2626"}18`,
            border: `1px solid ${badgeColor ?? "#dc2626"}40`,
          }}>{badge}</span>
        )}
      </div>
      {linkHref && count !== undefined && (
        <Link href={linkHref} style={{ fontSize: 11, color: "var(--fg-muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
          全部 {count} <ChevronRight size={10} />
        </Link>
      )}
    </div>
  );
}

function SectionHead({ title, collapsed, onToggle }: { title: string; collapsed: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      width: "100%", padding: "8px 0 6px", border: "none", background: "none",
      cursor: "pointer", borderBottom: "1px solid var(--border)", marginBottom: collapsed ? 0 : 10,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</span>
      <ChevronDown size={10} color="var(--fg-subtle)" style={{ transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }} />
    </button>
  );
}

// ── Detail Panel ───────────────────────────────────────────────

function DetailPanel({
  selected, assignees, onAssign,
  aiAdopted, onAdopt, feedbackInput, setFeedbackInput, feedbackDone, onFeedback,
  confirmedCodes, onConfirmCode,
  reviewCode, setReviewCode, reviewReason, setReviewReason, reviewDone, onReviewConfirm,
  onClose,
}: {
  selected: SelectedItem;
  assignees: Record<string, string>; onAssign: (id: string, sid: string) => void;
  aiAdopted: Record<string, boolean>; onAdopt: (id: string, v: boolean) => void;
  feedbackInput: string; setFeedbackInput: (v: string) => void;
  feedbackDone: Set<string>; onFeedback: (id: string) => void;
  confirmedCodes: Record<string, string>; onConfirmCode: (id: string, code: string) => void;
  reviewCode: Record<string, string>; setReviewCode: (id: string, v: string) => void;
  reviewReason: Record<string, string>; setReviewReason: (id: string, v: string) => void;
  reviewDone: Set<string>; onReviewConfirm: (id: string) => void;
  onClose: () => void;
}) {
  const { id, kind } = selected;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [editCode, setEditCode] = useState(false);
  const [tempCode, setTempCode] = useState("FG");

  const toggleSection = (s: string) =>
    setCollapsed(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const toggleEmail = (eid: string) =>
    setExpandedEmails(prev => { const n = new Set(prev); n.has(eid) ? n.delete(eid) : n.add(eid); return n; });

  const deadline = (kind === "deadline" || kind === "annuity")
    ? MOCK_DEADLINES.find(d => d.id === id) : null;
  const incoming = kind === "incoming" ? MOCK_INCOMING.find(m => m.id === id) : null;
  const todo     = kind === "todo"     ? MOCK_TODOS.find(t => t.id === id)    : null;

  const caseNumber  = deadline?.case_number ?? incoming?.case_number ?? todo?.case_number ?? "";
  const clientName  = deadline?.client_name ?? incoming?.client_name ?? todo?.client ?? "";
  const title       = deadline?.description ?? incoming?.doc_title ?? todo?.action ?? "";
  const aiSuggestion = incoming?.ai_suggestion ?? todo?.ai_suggestion ?? AI_SUGGESTIONS[id];
  const dueDateStr  = deadline?.due_date ?? incoming?.ai_deadline ?? todo?.deadline;
  const days        = dueDateStr ? daysUntil(dueDateStr) : null;
  const needsReview = incoming?.needs_review ?? false;

  const patentCase    = MOCK_CASES.find(c => c.case_number === caseNumber || caseNumber.startsWith(c.case_number));
  const threads       = MOCK_THREADS[caseNumber] ?? [];
  const driveFiles    = MOCK_DRIVE[caseNumber] ?? [];
  const relatedCases  = patentCase
    ? MOCK_CASES.filter(c => c.client_id === patentCase.client_id && c.id !== patentCase.id).slice(0, 3)
    : [];

  const currentCode   = confirmedCodes[id] ?? incoming?.ai_code ?? "FG";
  const codeInfo      = DIR_CODES[currentCode] ?? DIR_CODES["FX"];
  const adopted       = aiAdopted[id];
  const hasFeedback   = feedbackDone.has(id);
  const isReviewed    = reviewDone.has(id);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid var(--border)",
        background: "var(--sl2)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{
                fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: 700,
                color: "var(--fg)", background: "var(--sl3)", border: "1px solid var(--border)",
                padding: "2px 7px", borderRadius: 3,
              }}>{caseNumber}</span>
              {patentCase && (
                <>
                  <span style={{ fontSize: 10, color: "var(--fg-subtle)", background: "var(--sl3)", padding: "2px 6px", borderRadius: 3, border: "1px solid var(--border)" }}>
                    {JURISDICTION_LABELS[patentCase.jurisdiction as keyof typeof JURISDICTION_LABELS]}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--fg-subtle)", background: "var(--sl3)", padding: "2px 6px", borderRadius: 3, border: "1px solid var(--border)" }}>
                    {TYPE_LABELS[patentCase.case_type]}
                  </span>
                </>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", lineHeight: 1.4, marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{clientName}</div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 4, flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>

        {/* Deadline alert */}
        {days !== null && (
          <div style={{
            marginBottom: 14, padding: "9px 12px", borderRadius: 4,
            border: `1px solid ${days <= 7 ? "#fecaca" : days <= 30 ? "#fde68a" : "var(--border)"}`,
            background: days <= 7 ? "#fef2f2" : days <= 30 ? "#fffbeb" : "var(--sl1)",
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <Clock size={12} color={urgencyColor(days)} />
            <span style={{ fontSize: 12, fontWeight: 600, color: urgencyColor(days) }}>
              {dueDateStr} · {days <= 0 ? `逾期 ${Math.abs(days)} 天` : `剩 ${days} 天`}
            </span>
          </div>
        )}

        {/* ── 收發碼 / AI無法辨識 ── */}
        <div style={{ marginBottom: 16 }}>
          <SectionHead title="收發碼 / 分類" collapsed={collapsed.has("code")} onToggle={() => toggleSection("code")} />
          {!collapsed.has("code") && (
            needsReview && !isReviewed ? (
              <div>
                <div style={{
                  padding: "10px 12px", background: "#fff7ed", borderLeft: "3px solid #f59e0b",
                  borderRadius: "0 4px 4px 0", display: "flex", gap: 8, marginBottom: 10,
                }}>
                  <AlertTriangle size={13} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#92400e", margin: "0 0 3px" }}>
                      AI 無法確定分類（信心度 {Math.round((incoming?.ai_confidence ?? 0) * 100)}%）
                    </p>
                    <p style={{ fontSize: 11, color: "#b45309", margin: 0 }}>
                      AI 推測：{incoming?.ai_category} · 需人工確認後方可分配處理
                    </p>
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginBottom: 5 }}>確認收發碼</div>
                  <select
                    value={reviewCode[id] ?? "FG"}
                    onChange={e => setReviewCode(id, e.target.value)}
                    style={{ width: "100%", padding: "6px 10px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 4, background: "var(--bg)", color: "var(--fg)", outline: "none" }}
                  >
                    {Object.entries(DIR_CODES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label} — {v.desc}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginBottom: 5 }}>確認原因（選填，幫助 AI 學習）</div>
                  <textarea
                    value={reviewReason[id] ?? ""}
                    onChange={e => setReviewReason(id, e.target.value)}
                    placeholder="例：此類中國 OA 固定為 FG 來文..."
                    rows={2}
                    style={{ width: "100%", padding: "6px 8px", fontSize: 11, border: "1px solid var(--border)", borderRadius: 4, background: "var(--bg)", color: "var(--fg)", outline: "none", resize: "none", boxSizing: "border-box" }}
                  />
                </div>
                <button
                  onClick={() => onReviewConfirm(id)}
                  style={{ width: "100%", padding: "7px", fontSize: 12, fontWeight: 600, borderRadius: 4, border: "none", background: "#166534", color: "#fff", cursor: "pointer" }}
                >
                  <Check size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                  確認分類
                </button>
              </div>
            ) : (
              <div>
                {isReviewed && (
                  <div style={{ marginBottom: 8, fontSize: 11, color: "#059669", display: "flex", alignItems: "center", gap: 4 }}>
                    <Check size={11} /> 人工已確認 · AI 將更新學習模型
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                    color: codeInfo.color, background: codeInfo.bg, border: `1px solid ${codeInfo.border}`,
                  }}>
                    {codeInfo.label}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{codeInfo.desc}</span>
                  {!editCode ? (
                    <button onClick={() => { setEditCode(true); setTempCode(currentCode); }}
                      className="btn-ghost" style={{ padding: "3px 6px", marginLeft: "auto", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                      <Edit2 size={10} /> 編輯
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 5, marginLeft: "auto", alignItems: "center" }}>
                      <select value={tempCode} onChange={e => setTempCode(e.target.value)}
                        style={{ fontSize: 11, padding: "3px 6px", border: "1px solid var(--border)", borderRadius: 3, background: "var(--bg)", color: "var(--fg)", outline: "none" }}>
                        {Object.entries(DIR_CODES).map(([k, v]) => (
                          <option key={k} value={k}>{v.label} {v.desc}</option>
                        ))}
                      </select>
                      <button onClick={() => { onConfirmCode(id, tempCode); setEditCode(false); }}
                        style={{ padding: "3px 8px", fontSize: 11, fontWeight: 600, borderRadius: 3, border: "none", background: "var(--fg)", color: "var(--bg)", cursor: "pointer" }}>
                        確認
                      </button>
                      <button onClick={() => setEditCode(false)}
                        style={{ padding: "3px 6px", fontSize: 11, borderRadius: 3, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg-muted)", cursor: "pointer" }}>
                        取消
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {/* ── AI suggestion ── */}
        {aiSuggestion && (
          <div style={{ marginBottom: 16 }}>
            <SectionHead title="AI 建議" collapsed={collapsed.has("ai")} onToggle={() => toggleSection("ai")} />
            {!collapsed.has("ai") && (
              <div>
                <div style={{
                  padding: "10px 12px", background: "#eef2ff",
                  borderLeft: "3px solid #6366f1", borderRadius: "0 4px 4px 0",
                  display: "flex", gap: 8, marginBottom: 8,
                }}>
                  <Bot size={13} color="#6366f1" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: "#3730a3", margin: 0, lineHeight: 1.6 }}>{aiSuggestion}</p>
                </div>
                {adopted === undefined && !hasFeedback && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => onAdopt(id, true)} style={{
                      flex: 1, padding: "6px 10px", fontSize: 11, fontWeight: 600, borderRadius: 4,
                      border: "1px solid #a5b4fc", background: "#eef2ff", color: "#3730a3", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    }}>
                      <Check size={11} /> 採納建議
                    </button>
                    <button onClick={() => onAdopt(id, false)} style={{
                      flex: 1, padding: "6px 10px", fontSize: 11, borderRadius: 4,
                      border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg-muted)", cursor: "pointer",
                    }}>
                      不採納
                    </button>
                  </div>
                )}
                {adopted === true && (
                  <div style={{ fontSize: 11, color: "#059669", display: "flex", alignItems: "center", gap: 4 }}>
                    <Check size={11} /> 已採納 · AI 將記錄此決策
                  </div>
                )}
                {adopted === false && !hasFeedback && (
                  <div>
                    <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginBottom: 5 }}>說明原因（幫助 AI 學習）</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={feedbackInput} onChange={e => setFeedbackInput(e.target.value)}
                        placeholder="例：此案由林律師主責..."
                        style={{ flex: 1, fontSize: 11, padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 4, background: "var(--bg)", color: "var(--fg)", outline: "none" }} />
                      <button onClick={() => onFeedback(id)} style={{
                        padding: "5px 12px", fontSize: 11, fontWeight: 600, borderRadius: 4,
                        border: "none", background: "var(--fg)", color: "var(--bg)", cursor: "pointer",
                      }}>送出</button>
                    </div>
                  </div>
                )}
                {hasFeedback && (
                  <div style={{ fontSize: 11, color: "var(--fg-subtle)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Check size={11} color="#059669" /> 感謝回饋 · AI 將持續優化
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 負責人員 ── */}
        <div style={{ marginBottom: 16 }}>
          <SectionHead title="負責人員" collapsed={collapsed.has("staff")} onToggle={() => toggleSection("staff")} />
          {!collapsed.has("staff") && (
            <div>
              <select value={assignees[id] ?? ""} onChange={e => onAssign(id, e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 4, background: "var(--bg)", color: "var(--fg)", cursor: "pointer", outline: "none" }}>
                <option value="">— 未分配 —</option>
                {MOCK_STAFF.map(s => (
                  <option key={s.id} value={s.id}>{s.name} · {s.title}</option>
                ))}
              </select>
              {assignees[id] && (() => {
                const s = MOCK_STAFF.find(x => x.id === assignees[id]);
                return s ? (
                  <div style={{ marginTop: 6, padding: "7px 10px", background: "var(--sl2)", borderRadius: 4, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--fg)", fontWeight: 500, marginBottom: 3 }}>{s.name} <span style={{ color: "var(--fg-subtle)", fontWeight: 400 }}>· {s.title}</span></div>
                    <div style={{ fontSize: 10, color: "var(--fg-subtle)" }}>
                      專長：{s.specialties.join("、")} · 現有 {s.active_cases} 件
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* ── 案件資訊 ── */}
        {patentCase && (
          <div style={{ marginBottom: 16 }}>
            <SectionHead title="案件資訊" collapsed={collapsed.has("caseinfo")} onToggle={() => toggleSection("caseinfo")} />
            {!collapsed.has("caseinfo") && (
              <div style={{ padding: "10px 12px", background: "var(--sl1)", border: "1px solid var(--border)", borderRadius: 4 }}>
                {[
                  { label: "申請號",  value: patentCase.app_number ?? "—",   mono: true },
                  { label: "狀態",    value: STATUS_LABELS[patentCase.status] },
                  { label: "申請日",  value: patentCase.filing_date ?? "—" },
                  { label: "負責人",  value: patentCase.assignee_name },
                  ...(patentCase.patent_number ? [{ label: "專利號", value: patentCase.patent_number, mono: true }] : []),
                  ...(patentCase.next_action   ? [{ label: "下一步", value: patentCase.next_action }] : []),
                ].map(({ label, value, mono }) => (
                  <div key={label} style={{ display: "flex", gap: 10, fontSize: 11, marginBottom: 5 }}>
                    <span style={{ color: "var(--fg-subtle)", minWidth: 48, flexShrink: 0 }}>{label}</span>
                    <span style={{ color: "var(--fg)", fontFamily: mono ? "ui-monospace, monospace" : "inherit" }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 相關信件 ── */}
        {threads.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionHead title={`相關信件 (${threads.length})`} collapsed={collapsed.has("threads")} onToggle={() => toggleSection("threads")} />
            {!collapsed.has("threads") && (
              <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
                {threads.map((msg, i) => {
                  const isExp = expandedEmails.has(msg.id);
                  const isOut = msg.direction === "out";
                  return (
                    <div key={msg.id} style={{ borderBottom: i < threads.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <button onClick={() => toggleEmail(msg.id)} style={{
                        display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 12px",
                        width: "100%", border: "none", background: "var(--bg)", cursor: "pointer", textAlign: "left",
                      }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 4,
                          background: isOut ? "#3b82f6" : "#6b7280",
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.subject}</div>
                          <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 1 }}>
                            {isOut ? "↑ " : "↓ "}{msg.from_name} · {msg.date}
                          </div>
                        </div>
                        <ChevronDown size={10} color="var(--fg-subtle)" style={{ flexShrink: 0, marginTop: 3, transform: isExp ? "none" : "rotate(-90deg)" }} />
                      </button>
                      {isExp && (
                        <div style={{ padding: "0 12px 10px 26px" }}>
                          <p style={{ fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.6, margin: "0 0 8px" }}>{msg.snippet}</p>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {msg.attachments.map(a => (
                                <span key={a} style={{
                                  fontSize: 10, padding: "2px 6px", borderRadius: 3,
                                  border: "1px solid var(--border)", background: "var(--sl2)",
                                  color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 3,
                                }}>
                                  <FileText size={9} /> {a}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 相關專利 ── */}
        {relatedCases.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionHead title={`相關案件 (${relatedCases.length})`} collapsed={collapsed.has("related")} onToggle={() => toggleSection("related")} />
            {!collapsed.has("related") && (
              <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
                {relatedCases.map((c, i) => {
                  const s = STATUS_LABELS[c.status];
                  return (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                      borderBottom: i < relatedCases.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, color: "var(--fg-muted)", marginRight: 5 }}>{c.case_number}</span>
                        <div style={{ fontSize: 11, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                        <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 1 }}>
                          {JURISDICTION_LABELS[c.jurisdiction as keyof typeof JURISDICTION_LABELS]} · {TYPE_LABELS[c.case_type]}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "var(--sl3)", color: "var(--fg-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>{s}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 雲端文件 ── */}
        <div style={{ marginBottom: 8 }}>
          <SectionHead title="雲端文件" collapsed={collapsed.has("drive")} onToggle={() => toggleSection("drive")} />
          {!collapsed.has("drive") && (
            driveFiles.length > 0 ? (
              <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
                {driveFiles.map((f, i) => (
                  <div key={f.name} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
                    borderBottom: i < driveFiles.length - 1 ? "1px solid var(--border)" : "none",
                    cursor: "pointer", background: "var(--bg)",
                  }}
                    onMouseEnter={el => { el.currentTarget.style.background = "var(--sl2)"; }}
                    onMouseLeave={el => { el.currentTarget.style.background = "var(--bg)"; }}
                  >
                    <DriveFileIcon type={f.type} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                      <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 1, display: "flex", gap: 6 }}>
                        <span>{f.modified}</span>
                        {f.size && <span>{f.size}</span>}
                      </div>
                    </div>
                    <StorageIcon provider={f.provider} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "var(--fg-subtle)", padding: "8px 0" }}>尚無雲端文件</div>
            )
          )}
        </div>

      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function PatentDashboardPage() {
  const [selected, setSelected]           = useState<SelectedItem | null>(null);
  const [panelWidth, setPanelWidth]       = useState(400);
  const [assignees, setAssignees]         = useState<Record<string, string>>({});
  const [aiAdopted, setAiAdopted]         = useState<Record<string, boolean>>({});
  const [feedbackInput, setFeedbackInput] = useState("");
  const [feedbackDone, setFeedbackDone]   = useState<Set<string>>(new Set());
  const [confirmedCodes, setConfirmedCodes] = useState<Record<string, string>>({});
  const [reviewCode, setReviewCode]       = useState<Record<string, string>>({});
  const [reviewReason, setReviewReason]   = useState<Record<string, string>>({});
  const [reviewDone, setReviewDone]       = useState<Set<string>>(new Set());

  const panelOpen     = selected !== null;
  const panelResizing = useRef(false);
  const resizeStart   = useRef({ mx: 0, pw: 400 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panelResizing.current) return;
      const w = Math.min(620, Math.max(320, resizeStart.current.pw - (e.clientX - resizeStart.current.mx)));
      setPanelWidth(w);
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

  const onResizeDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    panelResizing.current = true;
    resizeStart.current = { mx: e.clientX, pw: panelWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [panelWidth]);

  const select = (id: string, kind: SelectedKind) =>
    setSelected(prev => prev?.id === id ? null : { id, kind });

  const onAdopt = (id: string, v: boolean) => {
    setAiAdopted(prev => ({ ...prev, [id]: v }));
    if (v) setFeedbackInput("");
  };

  const onFeedback = (id: string) => {
    if (!feedbackInput.trim()) return;
    setFeedbackDone(prev => new Set(prev).add(id));
    setFeedbackInput("");
  };

  const onReviewConfirm = (id: string) => {
    const code = reviewCode[id] ?? "FG";
    setConfirmedCodes(prev => ({ ...prev, [id]: code }));
    setReviewDone(prev => new Set(prev).add(id));
  };

  // ── Computed ──────────────────────────────────────────────────

  const today      = "2026-03-18";
  const pendingDls = MOCK_DEADLINES
    .filter(d => d.status !== "completed" && d.type !== "annuity")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const annuityDls = MOCK_DEADLINES
    .filter(d => d.status !== "completed" && d.type === "annuity")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const pendingTodos  = MOCK_TODOS.filter(t => t.status !== "done");
  const urgentTodos   = pendingTodos.filter(t => t.priority === "urgent");

  const urgent7 = [
    ...pendingDls.filter(d => daysUntil(d.due_date) <= 7),
    ...pendingTodos.filter(t => t.deadline && daysUntil(t.deadline) <= 7),
  ];
  const urgent30 = [
    ...pendingDls.filter(d => daysUntil(d.due_date) <= 30),
    ...pendingTodos.filter(t => t.deadline && daysUntil(t.deadline) <= 30),
  ];
  const oaCases    = MOCK_CASES.filter(c => c.status === "oa_issued");
  const active     = MOCK_CASES.filter(c => !["granted", "abandoned", "rejected"].includes(c.status));
  const todayIn    = MOCK_INCOMING.filter(m => m.received_at.startsWith(today));
  const annuity90  = annuityDls.filter(d => daysUntil(d.due_date) <= 90);
  const needsReview   = MOCK_INCOMING.filter(m => m.needs_review);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", minWidth: 0 }}>

        {/* Stat strip */}
        <div style={{
          display: "flex", border: "1px solid var(--border)", borderRadius: 4,
          marginBottom: 20, overflow: "hidden", background: "var(--bg)",
        }}>
          <StatCell label="進行中案件" value={<span style={{ color: "#1d4ed8" }}>{active.length}</span>} sub={`共 ${MOCK_CASES.length} 件`} />
          <StatCell
            label="今日新收來文"
            value={<span style={{ color: todayIn.length > 0 ? "#d97706" : "var(--fg)" }}>{todayIn.length}</span>}
            sub={needsReview.length > 0 ? `${needsReview.length} 件待人工確認` : `AI 已分類 ${MOCK_INCOMING.length} 件`}
          />
          <StatCell
            label="7 天內截止"
            value={<span style={{ color: urgent7.length > 0 ? "#dc2626" : "#16a34a" }}>{urgent7.length}</span>}
            sub={urgent7.length > 0 ? "需立即處理" : "暫無緊急"}
          />
          <StatCell
            label="OA 待答辯"
            value={<span style={{ color: oaCases.length > 0 ? "#d97706" : "#16a34a" }}>{oaCases.length}</span>}
            sub="件案件"
          />
          <StatCell
            label="年費 90 天預警"
            value={<span style={{ color: annuity90.length > 0 ? "#7c3aed" : "#16a34a" }}>{annuity90.length}</span>}
            sub="件需注意" last
          />
        </div>

        {/* 2-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>

          {/* ── Left column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Block 1: 截止期限 */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <BlockHead
                icon={<Clock size={12} color="#dc2626" />}
                title="截止期限"
                badge={urgent7.length > 0 ? `${urgent7.length} 緊急` : undefined}
                badgeColor="#dc2626"
                linkHref="/app/deadlines"
                count={urgent30.length}
              />
              {pendingDls.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--fg-subtle)" }}>目前無待處理期限</div>
              ) : (
                pendingDls.slice(0, 7).map((d, i, arr) => {
                  const days  = daysUntil(d.due_date);
                  const isSel = selected?.id === d.id;
                  const badge = DEADLINE_BADGE[d.type] ?? DEADLINE_BADGE["other"];
                  return (
                    <div key={d.id}
                      onClick={() => select(d.id, "deadline")}
                      style={{
                        display: "grid", gridTemplateColumns: "120px 1fr 68px 46px",
                        alignItems: "center", gap: 10, padding: "9px 14px",
                        borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                        borderLeft: `3px solid ${isSel ? "#6366f1" : urgencyBorder(days)}`,
                        background: urgencyBg(days, isSel), cursor: "pointer",
                      }}
                      onMouseEnter={el => { if (!isSel) el.currentTarget.style.background = "var(--sl2)"; }}
                      onMouseLeave={el => { if (!isSel) el.currentTarget.style.background = urgencyBg(days, false); }}
                    >
                      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {d.case_number}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.description}</div>
                        <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 1 }}>{d.client_name} · {d.assignee_name}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, color: badge.fg, background: badge.bg, textAlign: "center", whiteSpace: "nowrap", fontWeight: 600 }}>
                        {DEADLINE_TYPE_LABELS[d.type] ?? d.type}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: urgencyColor(days), textAlign: "right" }}>
                        {days <= 0 ? `逾${Math.abs(days)}d` : `${days}d`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Block 3: 事務所待辦 */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <BlockHead
                icon={<CheckSquare size={12} color="var(--fg-muted)" />}
                title="事務所待辦"
                badge={urgentTodos.length > 0 ? `${urgentTodos.length} 急` : undefined}
                badgeColor="#d97706"
                linkHref="/app/todo"
                count={pendingTodos.length}
              />
              {pendingTodos.slice(0, 5).map((t, i, arr) => {
                const days  = t.deadline ? daysUntil(t.deadline) : null;
                const dir   = DIRECTION_CONFIG[t.direction];
                const isSel = selected?.id === t.id;
                return (
                  <div key={t.id}
                    onClick={() => select(t.id, "todo")}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 14px",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                      borderLeft: `3px solid ${isSel ? "#6366f1" : t.priority === "urgent" ? "#dc2626" : "#d97706"}`,
                      background: isSel ? "#eef2ff" : "var(--bg)", cursor: "pointer",
                    }}
                    onMouseEnter={el => { if (!isSel) el.currentTarget.style.background = "var(--sl2)"; }}
                    onMouseLeave={el => { if (!isSel) el.currentTarget.style.background = "var(--bg)"; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, color: "var(--fg-muted)", background: "var(--sl3)", padding: "1px 4px", borderRadius: 2, border: "1px solid var(--border)" }}>
                          {t.case_number}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 600, color: dir.color, background: dir.bg, padding: "1px 4px", borderRadius: 2 }}>
                          {dir.label}
                        </span>
                        {t.priority === "urgent" && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#dc2626", background: "#fef2f2", padding: "1px 4px", borderRadius: 2 }}>急</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.action}</div>
                      <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 1 }}>{t.client}</div>
                    </div>
                    {days !== null && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: urgencyColor(days), flexShrink: 0, marginTop: 2 }}>
                        {days <= 0 ? `逾${Math.abs(days)}d` : `${days}d`}
                      </span>
                    )}
                  </div>
                );
              })}
              {pendingTodos.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--fg-subtle)" }}>目前無待辦事項</div>
              )}
            </div>
          </div>

          {/* ── Right column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Block 2: 新收官方來文 */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <BlockHead
                icon={<Mail size={12} color="#2563eb" />}
                title="新收官方來文"
                badge={todayIn.length > 0 ? `今日 ${todayIn.length}` : undefined}
                badgeColor="#2563eb"
              />
              {MOCK_INCOMING.map((m, i, arr) => {
                const mc      = MAIL_CAT_COLOR[m.ai_category] ?? MAIL_CAT_COLOR["其他"];
                const days    = daysUntil(m.ai_deadline);
                const isSel   = selected?.id === m.id;
                const isToday = m.received_at.startsWith(today);
                return (
                  <div key={m.id}
                    onClick={() => select(m.id, "incoming")}
                    style={{
                      padding: "9px 14px",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                      background: isSel ? "#eef2ff" : m.needs_review ? "#fffbeb" : "var(--bg)",
                      cursor: "pointer",
                      borderLeft: `3px solid ${isSel ? "#6366f1" : m.needs_review ? "#f59e0b" : "transparent"}`,
                    }}
                    onMouseEnter={el => { if (!isSel) el.currentTarget.style.background = "var(--sl2)"; }}
                    onMouseLeave={el => { if (!isSel) el.currentTarget.style.background = isSel ? "#eef2ff" : m.needs_review ? "#fffbeb" : "var(--bg)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, color: "var(--fg-muted)", background: "var(--sl3)", padding: "1px 4px", borderRadius: 2 }}>
                            {m.case_number}
                          </span>
                          {isToday && <span style={{ fontSize: 9, fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "0 4px", borderRadius: 2 }}>今日</span>}
                          {m.needs_review && !reviewDone.has(m.id) && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: "#92400e", background: "#fff7ed", padding: "0 4px", borderRadius: 2, display: "flex", alignItems: "center", gap: 2 }}>
                              <AlertTriangle size={8} /> 待確認
                            </span>
                          )}
                          {m.needs_review && reviewDone.has(m.id) && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "0 4px", borderRadius: 2 }}>已確認</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.doc_title}</div>
                        <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 1 }}>
                          {m.client_name} · {m.office}
                          {m.attachments > 0 && <span style={{ marginLeft: 6 }}>📎 {m.attachments}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                        <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3, color: mc.fg, background: mc.bg }}>
                          {m.ai_category}
                        </span>
                        <span style={{ fontSize: 10, color: urgencyColor(days) }}>{days}d</span>
                        <span style={{ fontSize: 9, color: m.ai_confidence < 0.9 ? "#d97706" : "var(--fg-subtle)" }}>
                          {Math.round(m.ai_confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Block 4: 年費 / 續展警示 */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <BlockHead
                icon={<AlertCircle size={12} color="#7c3aed" />}
                title="年費 / 續展警示"
                badge={annuity90.length > 0 ? `${annuity90.length} 件` : undefined}
                badgeColor="#7c3aed"
                linkHref="/app/deadlines"
                count={annuityDls.length}
              />
              {annuityDls.slice(0, 5).map((d, i, arr) => {
                const days  = daysUntil(d.due_date);
                const isSel = selected?.id === d.id;
                return (
                  <div key={d.id}
                    onClick={() => select(d.id, "annuity")}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                      background: isSel ? "#eef2ff" : "var(--bg)", cursor: "pointer",
                      borderLeft: `3px solid ${isSel ? "#6366f1" : days <= 90 ? "#7c3aed" : "transparent"}`,
                    }}
                    onMouseEnter={el => { if (!isSel) el.currentTarget.style.background = "var(--sl2)"; }}
                    onMouseLeave={el => { if (!isSel) el.currentTarget.style.background = "var(--bg)"; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 1 }}>
                        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, color: "var(--fg-muted)" }}>{d.case_number}</span>
                        <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 2, color: DEADLINE_BADGE["annuity"].fg, background: DEADLINE_BADGE["annuity"].bg, fontWeight: 600 }}>
                          {DEADLINE_TYPE_LABELS[d.type]}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.description}</div>
                      <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 1 }}>{d.client_name} · {d.assignee_name}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: days <= 90 ? "#7c3aed" : "var(--fg-muted)", flexShrink: 0 }}>
                      {days}d
                    </span>
                  </div>
                );
              })}
              {annuityDls.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--fg-subtle)" }}>90 天內無年費到期</div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Right detail panel ── */}
      <div style={{
        width: panelOpen ? panelWidth : 0,
        overflow: "hidden",
        borderLeft: panelOpen ? "1px solid var(--border)" : "none",
        background: "var(--bg)", flexShrink: 0,
        display: "flex", flexDirection: "column",
        position: "relative",
        transition: panelOpen ? "none" : "width 0.2s",
      }}>
        {panelOpen && (
          <>
            <div onMouseDown={onResizeDown} style={{
              position: "absolute", left: -3, top: 0, bottom: 0, width: 6,
              cursor: "col-resize", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 2, height: 32, borderRadius: 2, background: "var(--sl7)", opacity: 0.5 }} />
            </div>
            <DetailPanel
              selected={selected!}
              assignees={assignees}
              onAssign={(id, sid) => setAssignees(prev => ({ ...prev, [id]: sid }))}
              aiAdopted={aiAdopted}
              onAdopt={onAdopt}
              feedbackInput={feedbackInput}
              setFeedbackInput={setFeedbackInput}
              feedbackDone={feedbackDone}
              onFeedback={onFeedback}
              confirmedCodes={confirmedCodes}
              onConfirmCode={(id, code) => setConfirmedCodes(prev => ({ ...prev, [id]: code }))}
              reviewCode={reviewCode}
              setReviewCode={(id, v) => setReviewCode(prev => ({ ...prev, [id]: v }))}
              reviewReason={reviewReason}
              setReviewReason={(id, v) => setReviewReason(prev => ({ ...prev, [id]: v }))}
              reviewDone={reviewDone}
              onReviewConfirm={onReviewConfirm}
              onClose={() => setSelected(null)}
            />
          </>
        )}
      </div>

    </div>
  );
}
