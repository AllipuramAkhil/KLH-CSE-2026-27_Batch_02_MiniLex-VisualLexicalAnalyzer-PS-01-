import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./types";

afterEach(() => vi.unstubAllGlobals());

describe("MiniLex API client", () => {
  it("posts source and returns the structured token analysis", async () => {
    const analysis = {
      id: "report-1",
      timestamp: "2026-10-30T00:00:00Z",
      source: "int n;",
      tokens: [{ id: 1, type: "KEYWORD", lexeme: "int", line: 1, column: 1, start_position: 0, end_position: 3 }],
      errors: [],
      statistics: { total_tokens: 1, valid_tokens: 1, lexical_errors: 0, lines_analyzed: 1, distribution: { KEYWORD: 1 } },
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(analysis), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.analyze("int n;")).resolves.toEqual(analysis);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/lexer/analyze",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ source: "int n;" }) }),
    );
  });

  it("surfaces API validation errors instead of returning a success-shaped fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Invalid expression" }), { status: 422 })));
    await expect(api.nfa("(")).rejects.toThrow("Invalid expression");
  });
});
