import { Token } from "../types";

export default function TokenTable({ tokens }: { tokens: Token[] }) {
  if (!tokens.length) return <div className="empty-state compact">No tokens in this analysis.</div>;
  return (
    <div className="table-wrap token-table-wrap">
      <table>
        <thead><tr><th>#</th><th>Token type</th><th>Lexeme</th><th>Line</th><th>Column</th><th>Span</th></tr></thead>
        <tbody>{tokens.map((token) => <tr key={token.id}>
          <td className="muted-cell">{String(token.id).padStart(2, "0")}</td>
          <td><span className="token-type">{token.type}</span></td>
          <td className="lexeme-cell">{token.lexeme}</td><td>{token.line}</td><td>{token.column}</td>
          <td className="muted-cell">{token.start_position}–{token.end_position}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}
