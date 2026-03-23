import { describe, it, expect } from "vitest";
import { MOCK_EMAILS } from "@/lib/mock-data";

// Unit tests for email filtering logic (mirrors API route behavior)

function filterEmails(emails: typeof MOCK_EMAILS, opts: {
  status?: string;
  search?: string;
}) {
  let items = [...emails];
  if (opts.status) items = items.filter((e) => e.status === opts.status);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    items = items.filter(
      (e) =>
        e.subject.toLowerCase().includes(q) ||
        e.sender_email.toLowerCase().includes(q) ||
        e.case_numbers.some((c) => c.toLowerCase().includes(q))
    );
  }
  return items.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
}

describe("emails filter", () => {
  it("returns all emails with no filters", () => {
    const result = filterEmails(MOCK_EMAILS, {});
    expect(result).toHaveLength(MOCK_EMAILS.length);
  });

  it("filters by status=pending", () => {
    const result = filterEmails(MOCK_EMAILS, { status: "pending" });
    expect(result.every((e) => e.status === "pending")).toBe(true);
  });

  it("filters by case number search", () => {
    const result = filterEmails(MOCK_EMAILS, { search: "BRIT25710" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((e) => e.case_numbers.some((c) => c.includes("BRIT25710")))).toBe(true);
  });

  it("is sorted newest first", () => {
    const result = filterEmails(MOCK_EMAILS, {});
    for (let i = 1; i < result.length; i++) {
      expect(new Date(result[i - 1].received_at).getTime())
        .toBeGreaterThanOrEqual(new Date(result[i].received_at).getTime());
    }
  });

  it("returns empty array when no match", () => {
    const result = filterEmails(MOCK_EMAILS, { search: "zzznomatch" });
    expect(result).toHaveLength(0);
  });
});
