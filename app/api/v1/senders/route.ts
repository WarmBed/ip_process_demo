import { NextResponse } from "next/server";
import { MOCK_SENDERS } from "@/lib/mock-data";
import type { ApiResponse, Sender } from "@/lib/types";

export async function GET() {
  const response: ApiResponse<Sender[]> = {
    data: MOCK_SENDERS,
    meta: { total: MOCK_SENDERS.length, page: 1, limit: 100, total_pages: 1 },
  };
  return NextResponse.json(response);
}
