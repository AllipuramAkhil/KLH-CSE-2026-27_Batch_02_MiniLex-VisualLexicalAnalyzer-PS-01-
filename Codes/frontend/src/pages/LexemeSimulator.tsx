import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, CircleX, Pause, Play } from "lucide-react";
import { api, Automaton, DFA } from "../types";
import AutomataPanel from "../components/AutomataPanel";

type Result = Awaited<ReturnType<typeof api.simulate>>;
export default function LexemeSimulator() {
  const [pattern, setPattern] = useState("[A-Za-z_][A-Za-z0-9_]*");
  const [lexeme, setLexeme] = useState("variable_01");
  const [result, setResult] = useState<Result>();
  const [nfa, setNfa] = useState<Automaton>();
  const [dfa, setDfa] = useState<DFA>();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!playing || !result) return;
    if (step >= result.sequence.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStep(step + 1), 650);
    return () => window.clearTimeout(timer);
  }, [playing, result, step]);

  async function run(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const [machine, simulation] = await Promise.all([api.dfa(pattern), api.simulate(pattern, lexeme)]);
      setNfa(machine.nfa);
      setDfa(machine.dfa);
      setResult(simulation);
      setStep(0);
      setPlaying(false);
    } catch (issue) {
      setResult(undefined);
      setNfa(undefined);
      setDfa(undefined);
      setError(issue instanceof Error ? issue.message : "Simulation failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-stack">
      <header className="page-title"><div><p className="eyebrow">DFA TRANSITION TRACE</p><h1>Lexeme simulator</h1><p>Test an input against a regular expression and inspect every state transition.</p></div></header>
      <section className="panel simulator-panel">
        <form className="simulator-form" onSubmit={run}>
          <label>Regular expression<input value={pattern} onChange={(event) => setPattern(event.target.value)} required /></label>
          <label>Input lexeme<input value={lexeme} onChange={(event) => setLexeme(event.target.value)} required /></label>
          <button className="primary-button" disabled={busy}><Play size={16} />{busy ? "Simulating…" : "Run simulation"}</button>
        </form>
        {error && <div className="notice-error">{error}</div>}
        {result && <div className={`simulation-result ${result.accepted ? "accepted" : "rejected"}`}>
          {result.accepted ? <CheckCircle2 size={20} /> : <CircleX size={20} />}
          <div><strong>{result.accepted ? "Lexeme accepted" : "Lexeme rejected"}</strong><span>Input <code>{lexeme || "(empty)"}</code> finished in state q{result.final_state}.</span></div>
        </div>}
      </section>
      {result && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">STEP-BY-STEP</p><h2>Transition sequence</h2></div><span className="count-pill">{Math.max(0, result.sequence.length - 1)} steps</span></div>
        <div className="simulation-controls"><button className="secondary-button" onClick={() => { if (step >= result.sequence.length - 1) setStep(0); setPlaying(!playing); }}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? "Pause trace" : "Play trace"}</button><span>Step {step + 1} of {result.sequence.length}</span></div>
        <div className="trace-list">{result.sequence.map((transition, index) => <div className={`trace-step ${transition.next_state === undefined && index > 0 ? "trace-failed" : ""} ${index === step ? "trace-current" : ""}`} key={`${index}-${transition.state}`}>
          <span className="trace-index">{String(index).padStart(2, "0")}</span>
          {index === 0 ? <><b>Start</b><span>Initial state</span><code>q{transition.state}</code></> :
            <><b>q{transition.state}</b><span>read</span><code>{transition.input === " " ? "space" : transition.input === "\n" ? "\\n" : transition.input}</code><span>→</span><strong>{transition.next_state === undefined ? "No transition" : `q${transition.next_state}`}</strong></>}
        </div>)}</div>
        <div className="trace-final"><span>Final state</span><strong>q{result.final_state}</strong><span className={result.accepted ? "text-success" : "text-danger"}>{result.accepted ? "Accepting" : "Not accepting"}</span></div>
      </section>}
      {result && nfa && dfa && <AutomataPanel nfa={nfa} dfa={dfa} initialTab="dfa" activeState={result.sequence[step]?.next_state ?? result.sequence[step]?.state} />}
    </div>
  );
}
