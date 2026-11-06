import { useState } from "react";
import { Activity, Sparkles } from "lucide-react";
import { api, Automaton, DFA } from "../types";
import AutomataPanel from "../components/AutomataPanel";

export default function AutomataWorkbench() {
  const [pattern, setPattern] = useState("[A-Za-z_][A-Za-z0-9_]*");
  const [nfa, setNfa] = useState<Automaton>();
  const [dfa, setDfa] = useState<DFA>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const result = await api.dfa(pattern);
      setNfa(result.nfa);
      setDfa(result.dfa);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not generate automata.");
      setNfa(undefined);
      setDfa(undefined);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-stack">
      <header className="page-title"><div><p className="eyebrow">THOMPSON + SUBSET CONSTRUCTION</p><h1>Automata generator</h1><p>Build a real NFA from a regular expression, then determinize it with epsilon-closure subset construction.</p></div><div className="algorithm-badge"><Sparkles size={15} /> Algorithmic view</div></header>
      <section className="panel generator-form">
        <label>Regular expression
          <div className="pattern-input-row"><input value={pattern} onChange={(event) => setPattern(event.target.value)} onKeyDown={(event) => event.key === "Enter" && generate()} />
            <button className="primary-button" disabled={busy || !pattern} onClick={generate}><Activity size={16} />{busy ? "Building…" : "Generate NFA + DFA"}</button></div>
        </label>
        <p className="form-hint">Supported operators: grouping (), alternation |, concatenation, *, +, ?, character classes/ranges, escapes, and dot.</p>
        {error && <div className="notice-error">{error}</div>}
      </section>
      <AutomataPanel nfa={nfa} dfa={dfa} />
      {dfa && <section className="panel automata-summary"><h2>Construction summary</h2><div className="summary-grid"><div><span>NFA states</span><strong>{dfa.nfa_state_count}</strong></div><div><span>DFA states</span><strong>{dfa.dfa_state_count}</strong></div><div><span>DFA accepting states</span><strong>{dfa.accept_states.map((state) => `q${state}`).join(", ") || "None"}</strong></div></div></section>}
    </div>
  );
}
