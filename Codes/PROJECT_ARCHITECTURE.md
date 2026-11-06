# Project architecture

## System overview

MiniLex separates the source scanner, automata implementation, HTTP API, and browser UI. The React client communicates with FastAPI over JSON. The frontend does not contain a second lexer: tokenization and automata generation are performed by the backend and returned as structured data used by the tables and SVG visualization.

```text
React + Vite
  ├─ Monaco editor / dashboard / rules / reports
  ├─ fetch API client
  └─ graph and transition-table renderers
          │ JSON / HTTP
          ▼
FastAPI
  ├─ lexer routes ── tokenizer ── ordered token rules
  ├─ automata routes ── regex parser ── Thompson NFA ── DFA
  ├─ simulator ── DFA transition map
  └─ reports and in-memory rule/analysis store
```

## Backend

- `backend/app/main.py` creates the FastAPI application, CORS policy, health route, and API routers.
- `backend/app/api/routes/lexer.py` invokes the scanner and assembles token counts, distribution, errors, and a report identifier.
- `backend/app/api/routes/token_rules.py` implements list/create/update/delete and validates Python regular expressions.
- `backend/app/api/routes/automata.py` turns a regex into NFA/DFA structures and supports lexeme simulation.
- `backend/app/api/routes/reports.py` retrieves a report created by analysis.
- `backend/app/core/lexer/rules.py` defines rule metadata and the predefined C-like language rules.
- `backend/app/core/lexer/tokenizer.py` maintains source offsets and line/column positions, selecting longest matches and then priority.
- `backend/app/core/automata/regex_parser.py`, `thompson.py`, `dfa.py`, and `simulation.py` implement parsing, NFA construction, subset construction, and deterministic simulation.
- `backend/app/schemas/models.py` validates HTTP request fields and bounds input sizes.
- `backend/app/services/store.py` contains the process-local rule and report stores.

## Frontend

- `frontend/src/App.tsx` provides navigation, dashboard, editor workbench, reporting, export, and documentation.
- `frontend/src/types.ts` contains API types and the JSON client.
- `frontend/src/components/` contains reusable output tables, diagnostics, and data-driven automata visualization.
- `frontend/src/pages/` contains token rule management, the automata generator, and lexeme simulation.
- `frontend/src/styles.css` defines the responsive dark developer-tool interface.

## Data flow

1. The source editor posts source text to `POST /api/lexer/analyze`.
2. The scanner applies current server rules at each non-whitespace position.
3. Tokens and lexical errors return with 1-based line/column positions and 0-based, end-exclusive source offsets.
4. The frontend renders the result and stores recent analysis summaries locally.
5. Automata views send the selected regex to the backend and render the returned states and transitions directly.
6. Exports are generated client-side from the returned report, while `GET /api/reports/{id}` retrieves the in-memory backend copy during that process lifetime.

## State and deployment

The initial implementation uses in-memory backend storage for rules and reports; it is intended for a single local development process, not multi-worker persistence. Browser history uses local storage. For deployment, configure a restricted CORS origin, use persistent storage and authentication as appropriate, and set `VITE_API_BASE_URL` to the API's public `/api` URL.
