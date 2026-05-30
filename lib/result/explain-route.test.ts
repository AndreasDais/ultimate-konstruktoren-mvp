import { beforeEach, describe, expect, it, vi } from "vitest";

const { messagesCreateMock } = vi.hoisted(() => ({
  messagesCreateMock: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: messagesCreateMock,
    },
  })),
}));

import { __clearExplainCacheForTests, POST } from "@/app/api/explain/route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/explain", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function postJson(body: unknown): Promise<Record<string, unknown>> {
  const response = await POST(request(body));
  return await response.json();
}

function expectSafeClientPayload(json: Record<string, unknown>): void {
  const payload = JSON.stringify(json);
  expect(payload).not.toMatch(/\b(godkjent|approved|verifisert)\b/i);
  expect(payload).not.toMatch(/provider failed|stack|api[_-]?key|anthropic/i);
}

describe("/api/explain", () => {
  beforeEach(() => {
    __clearExplainCacheForTests();
    messagesCreateMock.mockReset();
  });

  it("returns catalog explanations without calling the LLM", async () => {
    const json = await postJson({
      run_id: "run-1",
      key: "M_Ed",
      value: "25 kNm",
      displayLanguage: "en",
    });

    expect(json.source).toBe("catalog");
    expect(json.cached).toBe(false);
    expect(json.explanation).toContain("Design bending moment");
    expectSafeClientPayload(json);
    expect(messagesCreateMock).not.toHaveBeenCalled();
  });

  it("uses a mocked LLM fallback on catalog miss and repairs JSON", async () => {
    messagesCreateMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '{"explanation":"This approved value is godkjent and verifisert.",}',
        },
      ],
    });

    const json = await postJson({
      run_id: "run-2",
      key: "custom_unknown_key",
      value: "12 kN",
      context: { calculation_type: "custom" },
      displayLanguage: "en",
    });

    expect(json.source).toBe("llm");
    expect(json.explanation).toContain("provisionally accepted");
    expect(json.explanation).toContain("vurdert");
    expectSafeClientPayload(json);
    expect(messagesCreateMock).toHaveBeenCalledTimes(1);
  });

  it("degrades safely on malformed or missing input without calling the LLM", async () => {
    const malformedResponse = await POST(
      new Request("http://localhost/api/explain", {
        method: "POST",
        body: "{not-json",
      }),
    );
    const malformed = await malformedResponse.json();
    const missing = await postJson({ displayLanguage: "en" });

    expect(malformed.source).toBe("degraded");
    expect(missing.source).toBe("degraded");
    expect(missing.explanation).toContain("temporarily unavailable");
    expectSafeClientPayload(malformed);
    expectSafeClientPayload(missing);
    expect(messagesCreateMock).not.toHaveBeenCalled();
  });

  it("degrades safely when the LLM fails", async () => {
    messagesCreateMock.mockRejectedValueOnce(new Error("provider failed"));

    const json = await postJson({
      run_id: "run-3",
      key: "custom_missing_key",
      value: "8 kN",
      displayLanguage: "en",
    });

    expect(json.source).toBe("degraded");
    expect(json.explanation).toContain("temporarily unavailable");
    expectSafeClientPayload(json);
    expect(messagesCreateMock).toHaveBeenCalledTimes(1);
  });

  it("serves cache hits without a second LLM call", async () => {
    messagesCreateMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '{"explanation":"Preliminary explanation for repeated lookup."}',
        },
      ],
    });

    const first = await postJson({
      run_id: "run-4",
      key: "uncatalogued_key",
      value: "4 kN",
      displayLanguage: "en",
    });
    const second = await postJson({
      run_id: "run-4",
      key: "uncatalogued_key",
      value: "4 kN",
      displayLanguage: "en",
    });

    expect(first.source).toBe("llm");
    expect(first.cached).toBe(false);
    expect(second.source).toBe("llm");
    expect(second.cached).toBe(true);
    expect(second.explanation).toBe(first.explanation);
    expectSafeClientPayload(second);
    expect(messagesCreateMock).toHaveBeenCalledTimes(1);
  });
});
