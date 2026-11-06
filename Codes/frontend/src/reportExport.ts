import { Analysis } from "./types";

export type ReportFormat = "json" | "csv" | "txt";

export function serializeAnalysis(report: Analysis, format: ReportFormat): string {
  if (format === "json") return JSON.stringify(report, null, 2);
  if (format === "csv") {
    const rows: (string | number)[][] = [
      ["record_type", "key", "value", "token_id", "token_type", "lexeme", "line", "column", "start_position", "end_position"],
      ["summary", "report_id", report.id],
      ["summary", "timestamp", report.timestamp],
      ["summary", "total_tokens", report.statistics.total_tokens],
      ["summary", "valid_tokens", report.statistics.valid_tokens],
      ["summary", "lexical_errors", report.statistics.lexical_errors],
      ["summary", "lines_analyzed", report.statistics.lines_analyzed],
      ...Object.entries(report.statistics.distribution).map(([type, count]) => ["statistics", `token_count_${type}`, count]),
      ["source", "source_code", report.source],
      ...report.tokens.map((token) => ["token", "", "", token.id, token.type, token.lexeme, token.line, token.column, token.start_position, token.end_position]),
      ...report.errors.map((item) => ["error", `${item.type}: ${item.message} ${item.suggestion}`, item.lexeme, "", "", "", item.line, item.column]),
    ];
    return rows.map((row) => row.map((field) => `"${String(field).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  }
  return [
    "MINILEX ANALYSIS REPORT",
    `Created: ${report.timestamp}`,
    `Tokens: ${report.statistics.total_tokens}`,
    `Lexical errors: ${report.statistics.lexical_errors}`,
    "Token distribution:",
    ...Object.entries(report.statistics.distribution).map(([type, count]) => `  ${type}: ${count}`),
    "",
    "TOKEN STREAM",
    ...report.tokens.map((token) => `${token.line}:${token.column}  ${token.type.padEnd(22)} ${JSON.stringify(token.lexeme)}`),
    "",
    "LEXICAL ERRORS",
    ...report.errors.map((item) => `${item.line}:${item.column}  ${item.type}: ${item.message} Found ${JSON.stringify(item.lexeme)}. ${item.suggestion}`),
    "",
    "SOURCE CODE",
    report.source,
  ].join("\n");
}

export function reportMimeType(format: ReportFormat): string {
  if (format === "json") return "application/json";
  if (format === "csv") return "text/csv";
  return "text/plain";
}
