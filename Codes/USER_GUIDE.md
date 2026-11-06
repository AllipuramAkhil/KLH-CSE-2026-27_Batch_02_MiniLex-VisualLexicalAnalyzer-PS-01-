# User guide

## Analyze source code

1. Open **Lexer workbench**.
2. Edit the source in the Monaco editor, select **Sample**, or upload a text/source file.
3. Select **Analyze source**. The output includes token type, lexeme, line, column, and source span; lexical diagnostics include their location, explanation, and suggested correction.
4. Use **Export** to download the current result as JSON, CSV, or TXT.

## Manage token rules

Open **Token rules** to inspect predefined patterns, priorities, and whether matches are skipped. Create, edit, or delete rules. A lower priority number wins only when matching lexemes have the same length. Patterns are validated by Python's regular-expression compiler when saved.

## Explore automata

Open **Automata lab**, edit the regular expression, and generate the NFA and DFA. Tabs display each state graph and the DFA transition table. Start states, accepting states, and simulation-active states have distinct styling. Zoom buttons help inspect larger graphs.

Automata-generation operators: `()` grouping, `|` alternation, concatenation, `*`, `+`, `?`, character classes and ranges, `\d`/`\w`/`\s`, and `.` wildcard (any ASCII character except newline).

## Simulate a lexeme

Open **Lexeme simulator**, provide a regex and input string, and run it. The page indicates acceptance/rejection and lists each DFA transition. The final state is accepting only if it belongs to the machine's accepting set.

## Reports and history

Dashboard and Reports show analyses made in the current browser. Choose a report to return to its source and results in the workbench. Export is available for each report.

## Known limits

- Token rules and API reports live in process memory; they reset when the backend restarts and are not shared across multiple workers.
- Browser analysis history is local to the browser profile.
- Automata generation supports the regular-expression subset listed above, not every Python regex feature (for example lookarounds and backreferences).
- The DFA builder enumerates ASCII plus regex-explicit characters. The lexer itself can scan Unicode when token rules match it, but DFA simulation currently targets that finite automata alphabet.
- The dashboard is designed as a local learning tool. Authentication, persistent multi-user storage, and production deployment hardening are not included.
