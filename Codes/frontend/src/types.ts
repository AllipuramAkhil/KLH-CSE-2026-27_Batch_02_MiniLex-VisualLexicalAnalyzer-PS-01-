export type Token = {
  id: number;
  type: string;
  lexeme: string;
  line: number;
  column: number;
  start_position: number;
  end_position: number;
};

export type LexicalError = {
  type: string;
  line: number;
  column: number;
  lexeme: string;
  message: string;
  suggestion: string;
};

export type Analysis = {
  id: string;
  timestamp: string;
  source: string;
  tokens: Token[];
  errors: LexicalError[];
  statistics: {
    total_tokens: number;
    valid_tokens: number;
    lexical_errors: number;
    lines_analyzed: number;
    distribution: Record<string, number>;
  };
};

export type TokenRule = {
  id: string;
  name: string;
  pattern: string;
  priority: number;
  description: string;
  skip: boolean;
};

export type Automaton = {
  start_state: number;
  accept_states: number[];
  states: number[];
  transitions: { from: number; to: number; label: string }[];
};

export type DFA = Automaton & {
  transition_map: Record<string, number>;
  nfa_state_count: number;
  dfa_state_count: number;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  analyze: (source: string) =>
    request<Analysis>("/lexer/analyze", { method: "POST", body: JSON.stringify({ source }) }),
  rules: () => request<TokenRule[]>("/token-rules"),
  createRule: (rule: Omit<TokenRule, "id">) =>
    request<TokenRule>("/token-rules", { method: "POST", body: JSON.stringify(rule) }),
  updateRule: (id: string, rule: Omit<TokenRule, "id">) =>
    request<TokenRule>(`/token-rules/${id}`, { method: "PUT", body: JSON.stringify(rule) }),
  deleteRule: (id: string) => request<void>(`/token-rules/${id}`, { method: "DELETE" }),
  nfa: (pattern: string) =>
    request<{ pattern: string; nfa: Automaton }>("/automata/nfa", {
      method: "POST",
      body: JSON.stringify({ pattern }),
    }),
  dfa: (pattern: string) =>
    request<{ pattern: string; nfa: Automaton; dfa: DFA }>("/automata/dfa", {
      method: "POST",
      body: JSON.stringify({ pattern }),
    }),
  simulate: (pattern: string, lexeme: string) =>
    request<{ accepted: boolean; final_state: number; sequence: { state: number; input: string | null; next_state?: number; position?: number }[] }>(
      "/automata/simulate",
      { method: "POST", body: JSON.stringify({ pattern, lexeme }) },
    ),
  report: (id: string) => request<Analysis>(`/reports/${id}`),
};
