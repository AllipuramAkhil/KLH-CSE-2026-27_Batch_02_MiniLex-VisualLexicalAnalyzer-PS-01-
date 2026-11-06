# API documentation

Base URL: `http://127.0.0.1:8000/api`. Requests and responses use JSON unless noted. Interactive OpenAPI documentation is available at `/docs`.

## Health

`GET /health`

Returns `{"status":"ok","service":"MiniLex"}`.

## Lexical analysis

`POST /lexer/analyze`

Request:

```json
{"source":"int answer = 42;"}
```

Response contains a report `id`, UTC `timestamp`, original `source`, `tokens`, `errors`, and `statistics`. Token records include `id`, `type`, `lexeme`, 1-based `line` and `column`, and 0-based, end-exclusive `start_position`/`end_position`. Errors contain `type`, `line`, `column`, `lexeme`, `message`, and `suggestion`.

## Token rules

- `GET /token-rules` — list rules ordered by ascending priority.
- `POST /token-rules` — create a rule; returns `201 Created`.
- `PUT /token-rules/{id}` — replace rule properties.
- `DELETE /token-rules/{id}` — delete a rule; returns `204 No Content`.

Create/update request:

```json
{
  "name":"HEX_NUMBER",
  "pattern":"0[xX][0-9a-fA-F]+",
  "priority":20,
  "description":"Hexadecimal integer",
  "skip":false
}
```

The API validates patterns using Python `re`. Invalid rules return `422`; unknown rule IDs return `404`.

## Automata

- `POST /automata/nfa` — body `{"pattern":"a(b|c)*"}`; returns the Thompson NFA.
- `POST /automata/dfa` — same request; returns both the NFA and subset-constructed DFA.
- `POST /automata/simulate` — body `{"pattern":"a(b|c)*","lexeme":"abcb"}`; returns acceptance, final state, and the transition sequence.

Automata errors return `422` with a syntax explanation. NFA transitions use `label:"ε"` for epsilon. DFA records include grouped display transitions, a character transition map, state counts, start state, and accepting state IDs.

## Reports

`GET /reports/{id}` returns the report produced by a successful analysis during the current backend process. Unknown IDs return `404`.

## Validation and errors

Pydantic request validation rejects missing, incorrectly typed, or oversized values with `422`. Normal FastAPI `404` and `422` response shapes include a `detail` field. Source input is limited to 1,000,000 characters; regex patterns to 500 characters; simulation inputs to 10,000 characters.
