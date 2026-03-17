import { NextRequest, NextResponse } from "next/server";
import { MOCK_EMAIL_DETAILS, MOCK_EMAILS } from "@/lib/mock-data";
import type { ApiResponse } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Try detailed mock first
  const detail = MOCK_EMAIL_DETAILS[id];
  if (detail) {
    return NextResponse.json({ data: detail } satisfies ApiResponse<typeof detail>);
  }

  // Fallback: build minimal detail from list mock
  const listItem = MOCK_EMAILS.find((e) => e.id === id);
  if (!listItem) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "Email not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      email: {
        id: listItem.id,
        tenant_id: "t001",
        account_id: "acc001",
        message_id: listItem.message_id,
        thread_id: `thread_${listItem.id}`,
        subject: listItem.subject,
        sender_email: listItem.sender_email,
        sender_name: listItem.sender_name,
        recipients: [{ email: "partner@ipwinner.com", name: "IP Winner", type: "to" as const }],
        received_at: listItem.received_at,
        body_html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1c2024"><p>（信件內容載入中...）</p></div>`,
        body_text: "",
        raw_size_bytes: 50000,
        has_attachments: listItem.has_attachments,
        fetched_at: listItem.received_at,
      },
      classification: listItem.direction_code ? {
        id: `cls_${id}`,
        tenant_id: "t001",
        email_id: id,
        case_numbers: listItem.case_numbers,
        body_case_numbers: listItem.case_numbers,
        direction_code: listItem.direction_code,
        case_type: listItem.case_type ?? "unknown",
        semantic_name: listItem.semantic_name ?? "",
        confidence: listItem.confidence ?? 0,
        dates_found: [],
        selected_deadline: null,
        sender_role: "X" as const,
        status: listItem.status ?? "pending",
        llm_model: "gemini-3-flash-preview",
        input_tokens: 0,
        output_tokens: 0,
        classified_at: listItem.received_at,
      } : null,
      attachments: [],
    },
  });
}
