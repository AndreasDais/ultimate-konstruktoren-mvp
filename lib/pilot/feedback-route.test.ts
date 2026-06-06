import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkRateLimitMock, createClientMock, fromMock, insertMock, selectMock, singleMock } =
  vi.hoisted(() => ({
    checkRateLimitMock: vi.fn(),
    createClientMock: vi.fn(),
    fromMock: vi.fn(),
    insertMock: vi.fn(),
    selectMock: vi.fn(),
    singleMock: vi.fn(),
  }));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

import { POST } from "@/app/api/pilot/feedback/route";

type PilotFeedbackRequest = Parameters<typeof POST>[0];

function request(body: unknown): PilotFeedbackRequest {
  return new Request("http://localhost/api/pilot/feedback", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "test-agent" },
    body: JSON.stringify(body),
  }) as PilotFeedbackRequest;
}

describe("/api/pilot/feedback", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    checkRateLimitMock.mockReset();
    checkRateLimitMock.mockResolvedValue(null);
    singleMock.mockReset();
    singleMock.mockResolvedValue({ data: { id: "feedback-1" }, error: null });
    selectMock.mockReset();
    selectMock.mockReturnValue({ single: singleMock });
    insertMock.mockReset();
    insertMock.mockReturnValue({ select: selectMock });
    fromMock.mockReset();
    fromMock.mockReturnValue({ insert: insertMock });
    createClientMock.mockReset();
    createClientMock.mockReturnValue({ from: fromMock });
  });

  it("passes rate limits through before body parsing or storage", async () => {
    checkRateLimitMock.mockResolvedValueOnce(
      Response.json({ error: "rate_limited" }, { status: 429 }),
    );

    const response = await POST(
      new Request("http://localhost/api/pilot/feedback", {
        method: "POST",
        body: "{not-json",
      }) as PilotFeedbackRequest,
    );

    expect(response.status).toBe(429);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("stores bounded international feedback in pilot_feedback metadata", async () => {
    const response = await POST(
      request({
        rating: "partly",
        trustLevel: "not_sure",
        useCase: "international_support",
        source: "international_page",
        comment: "Region/country: United States\n\nWhat to implement/improve:\nAISC support",
        wantsFollowup: true,
        reportUrl: "/international",
        metadata: {
          region: "United States",
          standard: "AISC 360",
          requested_improvement: "AISC steel beam checks",
          followup_email: "pilot@example.com",
          current_path: "/international",
          ui_mode: "intl",
          locale: "en",
          selected_region: "US",
          selected_standard: "aisc_asce_aci_experimental",
          support_level: "experimental",
          raw_message: "must not persist",
          stack: "must not persist",
        },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true, id: "feedback-1" });
    expect(fromMock).toHaveBeenCalledWith("pilot_feedback");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rating: "partly",
        trust_level: "not_sure",
        use_case: "international_support",
        source: "international_page",
        wants_followup: true,
        report_url: "/international",
        metadata: expect.objectContaining({
          region: "United States",
          standard: "AISC 360",
          requested_improvement: "AISC steel beam checks",
          followup_email: "pilot@example.com",
          current_path: "/international",
        }),
      }),
    );
    const inserted = insertMock.mock.calls[0]?.[0] as { metadata: Record<string, unknown> };
    expect(inserted.metadata).not.toHaveProperty("raw_message");
    expect(inserted.metadata).not.toHaveProperty("stack");
  });

  it("rejects empty international feedback without storing", async () => {
    const response = await POST(
      request({
        rating: "partly",
        trustLevel: "not_sure",
        useCase: "international_support",
        source: "international_page",
        metadata: {},
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "Tell us what international support you need." });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns bounded storage errors without raw server details", async () => {
    singleMock.mockResolvedValueOnce({
      data: null,
      error: { message: "service_role secret exploded with stack trace" },
    });

    const response = await POST(
      request({
        rating: "partly",
        trustLevel: "not_sure",
        useCase: "international_support",
        source: "international_page",
        comment: "Need AISC support",
      }),
    );
    const json = await response.json();
    const payload = JSON.stringify(json);

    expect(response.status).toBe(500);
    expect(json).toEqual({ ok: false, error: "Could not save feedback." });
    expect(payload).not.toMatch(/service_role|stack trace|exploded/i);
  });
});
