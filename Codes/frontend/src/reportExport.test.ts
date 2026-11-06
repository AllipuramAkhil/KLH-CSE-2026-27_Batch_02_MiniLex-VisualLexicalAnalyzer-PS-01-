import { describe, expect, it } from "vitest";
import { reportMimeType, serializeAnalysis } from "./reportExport";
import { Analysis } from "./types";

const report: Analysis = {
  id: "report-1",
  timestamp: "2026-10-30T00:00:00Z",
  source: 'int message = "hello";',
  tokens: [{ id: 1, type: "KEYWORD", lexeme: "int", line: 1, column: 1, start_position: 0, end_position: 3 }],
  errors: [{ type: "INVALID_CHARACTER", line: 1, column: 4, lexeme: "@", message: "Invalid character.", suggestion: "Remove it." }],
  statistics: { total_tokens: 1, valid_tokens: 1, lexical_errors: 1, lines_analyzed: 1, distribution: { KEYWORD: 1 } },
};

describe("analysis report exports", () => {
  it("includes the source, summary, statistics, tokens, errors, and timestamp in CSV", () => {
    const csv = serializeAnalysis(report, "csv");
    for (const value of ["report_id", report.id, report.timestamp, "total_tokens", "token_count_KEYWORD", '"int message = ""hello"";"', "KEYWORD", "INVALID_CHARACTER", "Remove it."]) {
      expect(csv).toContain(value);
    }
    expect(reportMimeType("csv")).toBe("text/csv");
  });

  it("serializes the complete structured report as JSON", () => {
    expect(JSON.parse(serializeAnalysis(report, "json"))).toEqual(report);
    expect(reportMimeType("json")).toBe("application/json");
  });

  it("writes token statistics and lexical errors to text reports", () => {
    const text = serializeAnalysis(report, "txt");
    expect(text).toContain("KEYWORD: 1");
    expect(text).toContain("INVALID_CHARACTER");
    expect(text).toContain(report.source);
    expect(reportMimeType("txt")).toBe("text/plain");
  });
});
