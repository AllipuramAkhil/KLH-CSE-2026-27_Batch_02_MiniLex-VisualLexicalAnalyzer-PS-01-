import { useState } from "react";
import { Automaton, DFA } from "../types";
import AutomataGraph from "./AutomataGraph";

type Props = {
  nfa?: Automaton;
  dfa?: DFA;
  activeState?: number;
  initialTab?: "nfa" | "dfa" | "table";
};

export default function AutomataPanel({ nfa, dfa, activeState, initialTab = "nfa" }: Props) {
  const [tab, setTab] = useState<"nfa" | "dfa" | "table">(initialTab);
  const selected: Automaton | undefined = tab === "nfa" ? nfa : dfa;
  const characters = dfa ? [...new Set(Object.keys(dfa.transition_map).map((key) => key.slice(key.indexOf(":") + 1)))].sort() : [];
  return (
    <section className="panel automata-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">FINITE AUTOMATA</p><h2>State machine</h2></div>
        {dfa && <div className="state-counts"><span>NFA <b>{dfa.nfa_state_count}</b></span><span>DFA <b>{dfa.dfa_state_count}</b></span></div>}
      </div>
      <div className="tabs">
        <button className={tab === "nfa" ? "active" : ""} onClick={() => setTab("nfa")}>NFA visualization</button>
        <button className={tab === "dfa" ? "active" : ""} onClick={() => setTab("dfa")}>DFA visualization</button>
        <button className={tab === "table" ? "active" : ""} onClick={() => setTab("table")}>Transition table</button>
      </div>
      {tab === "table" && dfa ? (
        <div className="table-wrap">
          <table><thead><tr><th>State</th>{characters.map((char) => <th key={char}>{char === "\n" ? "\\n" : char === "\t" ? "\\t" : char}</th>)}</tr></thead>
            <tbody>{dfa.states.map((state) => <tr key={state}><td>{state === dfa.start_state ? "→ " : ""}{dfa.accept_states.includes(state) ? "*" : ""}q{state}</td>
              {characters.map((char) => <td key={char}>{dfa.transition_map[`${state}:${char}`] === undefined ? "—" : `q${dfa.transition_map[`${state}:${char}`]}`}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
      ) : selected ? <AutomataGraph automaton={selected} currentState={activeState} /> : <div className="graph-empty">Generate an automaton to inspect its states and transitions.</div>}
      <p className="subtle-copy">Click a state to inspect it. Use zoom controls to explore larger automata.</p>
    </section>
  );
}
