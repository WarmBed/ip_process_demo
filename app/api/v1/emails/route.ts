import { NextRequest, NextResponse } from "next/server";
import { MOCK_EMAILS } from "@/lib/mock-data";
import type { ApiResponse, EmailListItem, ClassificationStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const page    = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit   = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const status  = searchParams.get("status") as ClassificationStatus | null;
  const search  = searchParams.get("search") ?? "";
  const from    = searchParams.get("from");
  const to      = searchParams.get("to");

  let items = [...MOCK_EMAILS];

  // Filter: status
  if (status) {
    items = items.filter((e) => e.status === status);
  }

  // Filter: search (subject / sender / case number)
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (e) =>
        e.subject.toLowerCase().includes(q) ||
        e.sender_email.toLowerCase().includes(q) ||
        e.sender_name.toLowerCase().includes(q) ||
        e.case_numbers.some((c) => c.toLowerCase().includes(q))
    );
  }

  // Filter: date range
  if (from) {
    items = items.filter((e) => new Date(e.received_at) >= new Date(from));
  }
  if (to) {
    items = items.filter((e) => new Date(e.received_at) <= new Date(to));
  }

  // Sort: newest first
  items.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());

  const total       = items.length;
  const total_pages = Math.ceil(total / limit);
  const data        = items.slice((page - 1) * limit, page * limit);

  const response: ApiResponse<EmailListItem[]> = {
    data,
    meta: { total, page, limit, total_pages },
  };

  return NextResponse.json(response);
}
