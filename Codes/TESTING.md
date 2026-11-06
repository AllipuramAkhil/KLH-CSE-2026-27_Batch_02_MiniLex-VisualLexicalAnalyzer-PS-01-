# Testing

## Backend

From the project root:

```powershell
python -m pytest backend\tests
```

The suite covers keyword/identifier separation, numeric tokens, longest-match operators, ignored comments, exact line/column/offsets, malformed input, priority tie-breaks, Thompson construction, epsilon closure, DFA acceptance/rejection, syntax errors, and API integration.

## Frontend

```powershell
Set-Location frontend
npm test
npm run build
```

Vitest checks API request payloads and confirms API validation errors surface to the caller. The production build runs TypeScript project checks and Vite bundling.

## Manual end-to-end check

1. Start the API and frontend using the commands in [README.md](./README.md).
2. Open the workbench, load the sample source, and analyze it.
3. Confirm comments are absent from tokens, keywords differ from identifiers, and positions are shown.
4. Add an invalid character or unterminated literal and confirm a located diagnostic appears.
5. Generate automata for `[A-Za-z_][A-Za-z0-9_]*`; compare NFA, DFA, and transition table views.
6. Simulate `alpha_2` (accepted) and `2alpha` (rejected).
7. Download JSON, CSV, and TXT reports and inspect their contents.
