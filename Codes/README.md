# MiniLex — Visual Lexical Analyzer

MiniLex is an interactive compiler-design workbench with a FastAPI lexer/automata API and a React + TypeScript frontend. It performs maximal-munch tokenization, reports lexical errors with source locations, constructs NFAs using Thompson's algorithm, determinizes them with subset construction, and simulates lexemes against the resulting DFA.

## Requirements

- Python 3.12 or newer
- Node.js 20 or newer and npm
- Docker Desktop (or Docker Engine with Docker Compose v2) for the containerized setup

## Run locally

Open two terminals from the project root.

**Backend**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements-dev.txt
python -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

The API is available at `http://127.0.0.1:8000`; interactive API documentation is at `http://127.0.0.1:8000/docs`.

**Frontend**

```powershell
Set-Location frontend
npm install
npm run dev
```

Open `http://localhost:5173`. To point the frontend at a different API origin, set `VITE_API_BASE_URL` (including `/api`) before starting Vite.

## Tests and production build

```powershell
python -m pip install -r backend\requirements-dev.txt
python -m pytest backend\tests
Set-Location frontend
npm test
npm run build
npm run preview
```

## Docker Compose

The production deployment uses two containers on the dedicated `minilex-network` bridge network:

- **backend** — Python 3.12 slim, FastAPI/Uvicorn on port 8000, running as a non-root user.
- **frontend** — a multi-stage Node.js 22 build served by Nginx Alpine on port 80. Nginx proxies `/api/` requests to `http://backend:8000`; the browser uses the same-origin relative `/api` URL.

Docker and Docker Compose prerequisites: install and start Docker Desktop (Windows/macOS), or install Docker Engine and the Compose plugin (Linux). From the project root:

**Start and build**

```powershell
docker compose up --build -d
```

**Check container status**

```powershell
docker compose ps
```

Wait until both containers show `healthy`. The API health check is `http://localhost:8000/api/health`.

**Open the application**

- MiniLex: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- OpenAPI documentation: `http://localhost:8000/docs`

**View logs**

```powershell
docker compose logs -f
docker compose logs -f frontend
docker compose logs -f backend
```

**Restart containers**

```powershell
docker compose restart
```

**Rebuild images without using the build cache**

```powershell
docker compose build --no-cache
docker compose up -d
```

**Stop and remove containers and the Compose network**

```powershell
docker compose down
```

No database or persistent volume is configured. Token rules and analysis reports are held in backend process memory; restarting or recreating the backend resets them. Analysis history remains in browser local storage. This is intentional and avoids changing the existing storage architecture.

**Troubleshooting**

- If `docker info` cannot connect, start Docker Desktop (or the Docker Engine service), then retry.
- If a port is already in use, stop the conflicting service or change the corresponding host-side port in `docker-compose.yml`.
- Inspect startup failures with `docker compose logs backend` and `docker compose logs frontend`.
- The frontend waits for the backend health check before starting. Check `docker compose ps` and backend logs if it remains in `starting` or `unhealthy`.
- To rebuild after source or configuration changes, run `docker compose build --no-cache` followed by `docker compose up -d`.
- The frontend image compiles `VITE_API_BASE_URL=/api`; no host `localhost:8000` address is embedded in the production browser bundle.

## Features

- Monaco source editor, sample program, source upload, analysis history, and JSON/CSV/TXT exports.
- Editable in-memory token rules with regular-expression validation, skip rules, longest-match selection, and priority tie-breaking.
- Keyword and identifier separation, numeric and string scanning, comments, operators, line/column and absolute offsets.
- Invalid-character, malformed-number, unterminated-string, and unterminated-comment diagnostics.
- Thompson NFA, epsilon closure, DFA subset construction, transition table, SVG graph, and step-by-step DFA simulation.
- FastAPI endpoints documented in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

## Project map

```text
backend/
  app/
    api/routes/       FastAPI endpoints
    core/lexer/       Rules and maximal-munch tokenizer
    core/automata/    Regex parser, Thompson NFA, DFA, simulation
    schemas/          Pydantic request validation
    services/         In-memory rule and report store
  tests/              Pytest lexer, automata, and API tests
frontend/
  src/components/     Token tables, diagnostics, automata SVG
  src/pages/          Token rules, automata, simulator views
  src/App.tsx         Dashboard, workbench, reports, documentation
```

More detail: [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md), [ALGORITHMS.md](./ALGORITHMS.md), [TESTING.md](./TESTING.md), and [USER_GUIDE.md](./USER_GUIDE.md).

## Operational notes

The default rules and reports are held in backend process memory, so rule edits reset when the backend restarts. Analysis history is persisted in the browser's local storage. The automata engine intentionally supports a documented regular-expression subset; lexer token rules themselves use Python's regular-expression engine. See [Known limits](./USER_GUIDE.md#known-limits).
