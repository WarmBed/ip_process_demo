import { NextRequest, NextResponse } from "next/server";
import { MOCK_DRIVE_FILES } from "@/lib/mock-data";
import type { ApiResponse } from "@/lib/types";
import type { DriveFile } from "@/lib/mock-data";

/**
 * GET /api/v1/drive/search
 * 在已連接的 storage 中搜尋與指定案號相關的所有檔案
 *
 * Query params:
 *   case_number  必填，可多個（逗號分隔）
 *   provider     可選，篩選特定 provider
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const caseParam  = searchParams.get("case_number") ?? "";
  const provider   = searchParams.get("provider");

  if (!caseParam) {
    return NextResponse.json(
      { data: [], error: { code: "MISSING_PARAM", message: "case_number is required" } },
      { status: 400 }
    );
  }

  const caseNumbers = caseParam.split(",").map((c) => c.trim()).filter(Boolean);

  let files = MOCK_DRIVE_FILES.filter((f) =>
    caseNumbers.some((c) => f.case_number === c)
  );

  if (provider) {
    files = files.filter((f) => f.provider === provider);
  }

  // Sort: newest first
  files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const response: ApiResponse<DriveFile[]> = {
    data: files,
    meta: { total: files.length, page: 1, limit: 100, total_pages: 1 },
  };

  return NextResponse.json(response);
}
