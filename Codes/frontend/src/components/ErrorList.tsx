import { AlertTriangle } from "lucide-react";
import { LexicalError } from "../types";

export default function ErrorList({ errors }: { errors: LexicalError[] }) {
  if (!errors.length) return <div className="empty-state compact success-empty">No lexical errors detected.</div>;
  return <div className="error-list">{errors.map((error, index) => (
    <article className="error-item" key={`${error.line}-${error.column}-${index}`}>
      <AlertTriangle size={16} />
      <div><div className="error-top"><strong>{error.type.replaceAll("_", " ")}</strong><span>Line {error.line}, column {error.column}</span></div>
        <p>{error.message}</p><small>Found <code>{error.lexeme || "∅"}</code> · {error.suggestion}</small></div>
    </article>
  ))}</div>;
}
