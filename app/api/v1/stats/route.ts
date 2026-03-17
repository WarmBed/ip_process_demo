import { NextResponse } from "next/server";
import { MOCK_STATS, MOCK_BENEFITS } from "@/lib/mock-data";
import type { ApiResponse } from "@/lib/types";

export async function GET() {
  const response: ApiResponse<typeof MOCK_STATS & { benefits: typeof MOCK_BENEFITS }> = {
    data: { ...MOCK_STATS, benefits: MOCK_BENEFITS },
  };
  return NextResponse.json(response);
}
