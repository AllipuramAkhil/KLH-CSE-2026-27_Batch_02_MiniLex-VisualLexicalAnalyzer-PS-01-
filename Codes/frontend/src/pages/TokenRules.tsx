import { FormEvent, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, TokenRule } from "../types";

type Props = { rules: TokenRule[]; onRulesChange: (rules: TokenRule[]) => void };
type Draft = Omit<TokenRule, "id">;
const blankRule: Draft = { name: "", pattern: "", priority: 20, description: "", skip: false };

export default function TokenRules({ rules, onRulesChange }: Props) {
  const [draft, setDraft] = useState<Draft>(blankRule);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit(rule: TokenRule) {
    setEditing(rule.id);
    setDraft({ name: rule.name, pattern: rule.pattern, priority: rule.priority, description: rule.description, skip: rule.skip });
    setMessage("");
  }
  function cancelEdit() {
    setEditing(null);
    setDraft(blankRule);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (editing) await api.updateRule(editing, draft);
      else await api.createRule(draft);
      onRulesChange(await api.rules());
      cancelEdit();
      setMessage(editing ? "Token rule updated." : "Token rule created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save token rule.");
    } finally {
      setBusy(false);
    }
  }
  async function removeRule(id: string) {
    if (!window.confirm("Delete this token rule?")) return;
    try {
      await api.deleteRule(id);
      onRulesChange(await api.rules());
      setMessage("Token rule deleted.");
      if (editing === id) cancelEdit();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete token rule.");
    }
  }

  return (
    <div className="page-stack">
      <header className="page-title"><div><p className="eyebrow">LEXER CONFIGURATION</p><h1>Token rules</h1><p>Define how the scanner recognizes each lexical unit. Lower priority numbers win ties.</p></div>
        <span className="count-pill">{rules.length} rules</span></header>
      <div className="rules-layout">
        <section className="panel rule-list-panel">
          <div className="panel-heading"><div><h2>Active rules</h2><p className="subtle-copy">Longest match is applied before priority.</p></div></div>
          <div className="table-wrap">
            <table><thead><tr><th>Priority</th><th>Name</th><th>Regular expression</th><th>Mode</th><th>Actions</th></tr></thead>
              <tbody>{rules.map((rule) => <tr key={rule.id}>
                <td>{rule.priority}</td><td><span className="token-type">{rule.name}</span><small className="rule-description">{rule.description}</small></td>
                <td><code className="pattern-code">{rule.pattern}</code></td><td>{rule.skip ? <span className="mode-skip">Ignored</span> : <span className="mode-token">Token</span>}</td>
                <td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${rule.name}`} onClick={() => startEdit(rule)}><Pencil size={15} /></button><button className="icon-button danger-icon" aria-label={`Delete ${rule.name}`} onClick={() => removeRule(rule.id)}><Trash2 size={15} /></button></div></td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
        <section className="panel rule-form-panel">
          <div className="panel-heading"><div><p className="eyebrow">{editing ? "EDIT RULE" : "CUSTOM TOKEN"}</p><h2>{editing ? "Update rule" : "Add a rule"}</h2></div>{editing && <button className="icon-button" onClick={cancelEdit} aria-label="Cancel edit"><X size={16} /></button>}</div>
          <form onSubmit={submit} className="stack-form">
            <label>Token name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. HEX_NUMBER" required /></label>
            <label>Regular expression<input value={draft.pattern} onChange={(event) => setDraft({ ...draft, pattern: event.target.value })} placeholder="e.g. 0[xX][0-9a-fA-F]+" required /></label>
            <label>Priority<input type="number" min="1" max="10000" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })} required /></label>
            <label>Description<input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What this rule recognizes" /></label>
            <label className="check-label"><input type="checkbox" checked={draft.skip} onChange={(event) => setDraft({ ...draft, skip: event.target.checked })} /> Skip matched lexemes (e.g. whitespace/comments)</label>
            <p className="form-hint">Rules use Python-compatible regular expressions. The first match is selected by longest lexeme, then lowest priority.</p>
            {message && <div className={`inline-message ${message.startsWith("Unable") || message.startsWith("Invalid") ? "inline-error" : ""}`}><Check size={14} />{message}</div>}
            <button type="submit" className="primary-button" disabled={busy}><Plus size={16} />{busy ? "Saving…" : editing ? "Save changes" : "Create token rule"}</button>
          </form>
        </section>
      </div>
    </div>
  );
}
