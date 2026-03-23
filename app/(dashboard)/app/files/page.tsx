"use client";

import { useState, useMemo } from "react";
import {
  Search, ChevronRight, Upload, Link,
  Download, Share2, History, FileText, Image, File,
} from "lucide-react";
import { Badge, Button, IconButton, Select } from "@radix-ui/themes";

/* ── Mock data ── */
const MOCK_FILES = [
  { id: "f1", case_number: "TSMC23014TW", file_name: "說明書_v3.docx", category: "specification", size: "2.4 MB", uploaded_by: "李美華", uploaded_at: "2026-03-18", version: 3 },
  { id: "f2", case_number: "TSMC23014TW", file_name: "請求項_v3.docx", category: "claims", size: "145 KB", uploaded_by: "李美華", uploaded_at: "2026-03-18", version: 3 },
  { id: "f3", case_number: "TSMC23014TW", file_name: "圖式_全套.pdf", category: "drawings", size: "8.7 MB", uploaded_by: "設計部", uploaded_at: "2026-03-15", version: 1 },
  { id: "f4", case_number: "KOIT20004TUS7", file_name: "OA_2026-02-28.pdf", category: "oa", size: "356 KB", uploaded_by: "USPTO", uploaded_at: "2026-02-28", version: 1 },
  { id: "f5", case_number: "KOIT20004TUS7", file_name: "OA答辯書_draft.docx", category: "response", size: "189 KB", uploaded_by: "王小明", uploaded_at: "2026-03-19", version: 2 },
  { id: "f6", case_number: "BRIT25710TW1", file_name: "年費繳費收據.pdf", category: "receipt", size: "67 KB", uploaded_by: "TIPO", uploaded_at: "2026-03-08", version: 1 },
  { id: "f7", case_number: "MTKP24001TW", file_name: "核准通知書.pdf", category: "grant", size: "234 KB", uploaded_by: "TIPO", uploaded_at: "2026-01-15", version: 1 },
  { id: "f8", case_number: "MTKP24001US", file_name: "PCT_國際檢索報告.pdf", category: "search_report", size: "1.2 MB", uploaded_by: "WIPO", uploaded_at: "2025-11-20", version: 1 },
  { id: "f9", case_number: "TSMC23014US", file_name: "翻譯_說明書_EN.docx", category: "translation", size: "3.1 MB", uploaded_by: "翻譯社", uploaded_at: "2026-03-10", version: 1 },
  { id: "f10", case_number: "ADTM25003TW1", file_name: "商標圖樣.png", category: "trademark_image", size: "456 KB", uploaded_by: "ADATA", uploaded_at: "2026-02-01", version: 1 },
  { id: "f11", case_number: "TSMC23014TW", file_name: "先前技術檢索報告.pdf", category: "search_report", size: "890 KB", uploaded_by: "王小明", uploaded_at: "2026-03-01", version: 1 },
  { id: "f12", case_number: "KOIT20004TUS7", file_name: "IDS_引用文獻.pdf", category: "ids", size: "567 KB", uploaded_by: "王小明", uploaded_at: "2026-03-05", version: 1 },
];

const FILE_CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  specification:   { label: "說明書",   color: "#1d4ed8", bg: "#eff6ff" },
  claims:          { label: "請求項",   color: "#7c3aed", bg: "#f5f3ff" },
  drawings:        { label: "圖式",     color: "#0e7490", bg: "#ecfeff" },
  oa:              { label: "OA通知",   color: "#dc2626", bg: "#fef2f2" },
  response:        { label: "答辯書",   color: "#d97706", bg: "#fffbeb" },
  receipt:         { label: "收據",     color: "#16a34a", bg: "#f0fdf4" },
  grant:           { label: "核准通知", color: "#16a34a", bg: "#f0fdf4" },
  search_report:   { label: "檢索報告", color: "#6b7280", bg: "#f9fafb" },
  translation:     { label: "翻譯文件", color: "#9a3412", bg: "#fff7ed" },
  trademark_image: { label: "商標圖樣", color: "#9a3412", bg: "#fff7ed" },
  ids:             { label: "IDS",     color: "#6b7280", bg: "#f9fafb" },
};

/* ── Mock version history ── */
function mockVersionHistory(file: typeof MOCK_FILES[number]) {
  const versions = [];
  for (let v = file.version; v >= 1; v--) {
    const d = new Date(file.uploaded_at);
    d.setDate(d.getDate() - (file.version - v) * 5);
    versions.push({
      version: v,
      date: d.toISOString().slice(0, 10),
      uploader: v === file.version ? file.uploaded_by : "自動備份",
    });
  }
  return versions;
}

/* ── Helpers ── */
function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext)) {
    return <Image size={15} color="var(--gray-10)" />;
  }
  if (ext === "pdf") {
    return <FileText size={15} color="var(--gray-10)" />;
  }
  return <File size={15} color="var(--gray-10)" />;
}

function CategoryBadge({ category }: { category: string }) {
  const c = FILE_CATEGORIES[category] ?? { label: category, color: "#6b7280", bg: "#f9fafb" };
  return (
    <Badge variant="soft" color="gray" size="1" style={{ fontWeight: 600 }}>
      {c.label}
    </Badge>
  );
}

function VersionBadge({ version }: { version: number }) {
  return (
    <Badge variant="soft" color={version > 1 ? "green" : "gray"} size="1" style={{ fontWeight: 600 }}>
      v{version}
    </Badge>
  );
}

function parseSizeMB(size: string): number {
  const num = parseFloat(size);
  if (size.includes("MB")) return num;
  if (size.includes("KB")) return num / 1024;
  return num;
}

function ActionIcons() {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[
        { icon: Download, title: "下載" },
        { icon: Share2, title: "分享" },
        { icon: History, title: "版本歷史" },
      ].map(({ icon: Icon, title }) => (
        <IconButton
          key={title}
          title={title}
          variant="ghost"
          color="gray"
          size="1"
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: "pointer" }}
        >
          <Icon size={12} />
        </IconButton>
      ))}
    </div>
  );
}

/* ── Main page ── */
export default function FilesPage() {
  const [viewMode, setViewMode] = useState<"by_case" | "flat">("by_case");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);

  /* Filter */
  const filtered = useMemo(() => {
    return MOCK_FILES.filter((f) => {
      if (categoryFilter && f.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          f.file_name.toLowerCase().includes(q) ||
          f.case_number.toLowerCase().includes(q) ||
          f.uploaded_by.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, categoryFilter]);

  /* Group by case */
  const groupedByCase = useMemo(() => {
    const map = new Map<string, typeof MOCK_FILES>();
    for (const f of filtered) {
      if (!map.has(f.case_number)) map.set(f.case_number, []);
      map.get(f.case_number)!.push(f);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  /* Stats */
  const thisMonth = MOCK_FILES.filter(f => f.uploaded_at >= "2026-03-01").length;
  const caseCount = new Set(MOCK_FILES.map(f => f.case_number)).size;

  function toggleCase(caseNum: string) {
    setExpandedCases((prev) => {
      const next = new Set(prev);
      if (next.has(caseNum)) next.delete(caseNum);
      else next.add(caseNum);
      return next;
    });
  }

  function totalSize(files: typeof MOCK_FILES) {
    const mb = files.reduce((sum, f) => sum + parseSizeMB(f.size), 0);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(mb * 1024).toFixed(0)} KB`;
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--gray-12)", margin: 0 }}>檔案管理</h1>
          <p style={{ fontSize: 13, color: "var(--gray-9)", margin: "4px 0 0 0" }}>案件包袋與文件版本管理</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" color="gray" size="2" style={{ cursor: "pointer" }}>
            <Link size={14} />
            建立共享連結
          </Button>
          <Button variant="solid" color="green" size="2" style={{ cursor: "pointer" }}>
            <Upload size={14} />
            上傳檔案
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden", background: "var(--color-background)" }}>
        {[
          { label: "文件總數",  value: MOCK_FILES.length, color: "var(--green-11)" },
          { label: "本月上傳",  value: thisMonth,          color: "var(--green-9)" },
          { label: "案件覆蓋",  value: caseCount,          color: "var(--green-12)" },
        ].map(({ label, value, color }, i, arr) => (
          <div key={label} style={{
            flex: 1, padding: "14px 20px",
            borderRight: i < arr.length - 1 ? "1px solid var(--gray-6)" : "none",
          }}>
            <div style={{ fontSize: 11, color: "var(--gray-9)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 14,
        padding: "10px 12px", background: "var(--gray-2)",
        border: "1px solid var(--gray-6)", borderRadius: 8,
        alignItems: "center", flexWrap: "wrap",
      }}>
        {/* Search */}
        <div style={{
          flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 7,
          border: "1px solid var(--gray-6)", borderRadius: 6,
          background: "var(--color-background)", padding: "0 10px", height: 32,
        }}>
          <Search size={13} color="var(--gray-9)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋檔名、案號、上傳者..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "var(--gray-12)" }}
          />
        </div>

        {/* Category filter — Radix Select */}
        <Select.Root value={categoryFilter} onValueChange={(v) => setCategoryFilter(v === "__all__" ? "" : v)}>
          <Select.Trigger
            variant="surface"
            color="gray"
            placeholder="所有分類"
            style={{ minWidth: 120 }}
          />
          <Select.Content>
            <Select.Item value="__all__">所有分類</Select.Item>
            {Object.entries(FILE_CATEGORIES).map(([k, v]) => (
              <Select.Item key={k} value={k}>{v.label}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        {/* View toggle */}
        <div style={{ display: "flex", gap: 2 }}>
          {([
            { key: "by_case" as const, label: "依案件" },
            { key: "flat" as const, label: "全部檔案" },
          ]).map(({ key, label }) => (
            <Button
              key={key}
              variant={viewMode === key ? "solid" : "ghost"}
              color={viewMode === key ? "green" : "gray"}
              size="1"
              onClick={() => setViewMode(key)}
              style={{ cursor: "pointer" }}
            >
              {label}
            </Button>
          ))}
        </div>

        <span style={{ fontSize: 12, color: "var(--gray-9)", marginLeft: "auto" }}>{filtered.length} 筆</span>
      </div>

      {/* Content */}
      {viewMode === "by_case" ? (
        /* ── By-case view ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groupedByCase.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--gray-9)", fontSize: 13 }}>
              沒有符合條件的檔案
            </div>
          ) : (
            groupedByCase.map(([caseNum, files]) => {
              const isOpen = expandedCases.has(caseNum);
              return (
                <div key={caseNum} style={{ border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden" }}>
                  {/* Case header */}
                  <div
                    onClick={() => toggleCase(caseNum)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "12px 16px", background: "var(--gray-2)", cursor: "pointer",
                    }}
                  >
                    <ChevronRight size={14} style={{
                      color: "var(--gray-9)",
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.15s",
                    }} />
                    <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, fontWeight: 700, color: "var(--gray-12)" }}>
                      {caseNum}
                    </span>
                    <Badge variant="soft" color="green" size="1">
                      {files.length} 個檔案
                    </Badge>
                    <span style={{ fontSize: 11, color: "var(--gray-9)", marginLeft: "auto" }}>
                      {totalSize(files)}
                    </span>
                  </div>

                  {/* Files list */}
                  {isOpen && (
                    <div>
                      {files.map((f, i) => {
                        const isFileExpanded = expandedFileId === f.id;
                        return (
                          <div key={f.id}>
                            <div
                              onClick={() => setExpandedFileId(isFileExpanded ? null : f.id)}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "20px 1fr 80px 70px 70px 90px 40px 110px",
                                padding: "10px 16px 10px 40px",
                                borderTop: "1px solid var(--gray-6)",
                                alignItems: "center", gap: 8,
                                background: "var(--color-background)", cursor: "pointer",
                              }}
                            >
                              <FileIcon name={f.file_name} />
                              <div style={{ fontSize: 13, color: "var(--gray-12)", fontWeight: 450, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {f.file_name}
                              </div>
                              <CategoryBadge category={f.category} />
                              <div style={{ fontSize: 12, color: "var(--gray-11)" }}>{f.size}</div>
                              <div style={{ fontSize: 12, color: "var(--gray-11)" }}>{f.uploaded_by}</div>
                              <div style={{ fontSize: 11, color: "var(--gray-9)" }}>{f.uploaded_at}</div>
                              <VersionBadge version={f.version} />
                              <ActionIcons />
                            </div>

                            {/* Version history expansion */}
                            {isFileExpanded && (
                              <div style={{
                                padding: "12px 16px 12px 64px",
                                background: "var(--gray-2)", borderTop: "1px solid var(--gray-6)",
                              }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-12)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                                  <History size={13} color="var(--gray-9)" />
                                  版本歷史
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {mockVersionHistory(f).map((v) => (
                                    <div key={v.version} style={{
                                      display: "flex", alignItems: "center", gap: 12,
                                      fontSize: 12, padding: "4px 0",
                                      borderBottom: "1px solid var(--gray-6)",
                                    }}>
                                      <VersionBadge version={v.version} />
                                      <span style={{ color: "var(--gray-11)", minWidth: 80 }}>{v.date}</span>
                                      <span style={{ color: "var(--gray-9)" }}>{v.uploader}</span>
                                      {v.version === f.version && (
                                        <Badge variant="soft" color="green" size="1">
                                          目前版本
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ── Flat table view ── */
        <div style={{ border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden" }}>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "20px 1fr 140px 80px 70px 70px 90px 40px 110px",
            padding: "7px 16px",
            background: "var(--gray-2)", borderBottom: "1px solid var(--gray-6)",
            fontSize: 11, fontWeight: 600, color: "var(--gray-9)",
            letterSpacing: "0.04em", textTransform: "uppercase", gap: 8,
          }}>
            <div></div>
            <div>檔名</div>
            <div>案號</div>
            <div>分類</div>
            <div>大小</div>
            <div>上傳者</div>
            <div>上傳日期</div>
            <div>版本</div>
            <div></div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--gray-9)", fontSize: 13 }}>
              沒有符合條件的檔案
            </div>
          ) : (
            filtered.map((f, i) => {
              const isFileExpanded = expandedFileId === f.id;
              return (
                <div key={f.id}>
                  <div
                    onClick={() => setExpandedFileId(isFileExpanded ? null : f.id)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "20px 1fr 140px 80px 70px 70px 90px 40px 110px",
                      padding: "10px 16px",
                      borderBottom: i < filtered.length - 1 ? "1px solid var(--gray-6)" : "none",
                      alignItems: "center", gap: 8,
                      background: "var(--color-background)", cursor: "pointer",
                    }}
                  >
                    <FileIcon name={f.file_name} />
                    <div style={{ fontSize: 13, color: "var(--gray-12)", fontWeight: 450, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.file_name}
                    </div>
                    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 600, color: "var(--gray-12)", letterSpacing: 0.3 }}>
                      {f.case_number}
                    </div>
                    <CategoryBadge category={f.category} />
                    <div style={{ fontSize: 12, color: "var(--gray-11)" }}>{f.size}</div>
                    <div style={{ fontSize: 12, color: "var(--gray-11)" }}>{f.uploaded_by}</div>
                    <div style={{ fontSize: 11, color: "var(--gray-9)" }}>{f.uploaded_at}</div>
                    <VersionBadge version={f.version} />
                    <ActionIcons />
                  </div>

                  {/* Version history expansion */}
                  {isFileExpanded && (
                    <div style={{
                      padding: "12px 16px 12px 40px",
                      background: "var(--gray-2)", borderBottom: i < filtered.length - 1 ? "1px solid var(--gray-6)" : "none",
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-12)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                        <History size={13} color="var(--gray-9)" />
                        版本歷史
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {mockVersionHistory(f).map((v) => (
                          <div key={v.version} style={{
                            display: "flex", alignItems: "center", gap: 12,
                            fontSize: 12, padding: "4px 0",
                            borderBottom: "1px solid var(--gray-6)",
                          }}>
                            <VersionBadge version={v.version} />
                            <span style={{ color: "var(--gray-11)", minWidth: 80 }}>{v.date}</span>
                            <span style={{ color: "var(--gray-9)" }}>{v.uploader}</span>
                            {v.version === f.version && (
                              <Badge variant="soft" color="green" size="1">
                                目前版本
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
