# Algorithms

## Regular expressions

Token rules use Python's `re` syntax and are anchored at the current source position with `pattern.match`. The separate automata workbench parses a regular-expression subset: literal characters, grouping, alternation, implicit concatenation, `*`, `+`, `?`, character classes/ranges, common escapes, and dot (ASCII except newline).

## Thompson construction

The parser creates a syntax tree. Thompson's construction recursively creates a fragment with a start and accept state:

- A literal or character class has one labeled transition.
- Concatenation joins fragment boundaries using an epsilon edge.
- Alternation creates a new start and accept state with epsilon split/merge edges.
- Star adds an empty path and a loop.
- Plus adds a loop but no empty path.
- Optional adds an empty path but no loop.

This produces an NFA that accepts the same language as the expression.

## Epsilon closure and subset construction

The epsilon closure of a set of NFA states is the set reachable using only epsilon transitions. The DFA start state is the closure of the NFA start. For every DFA subset and input character, the construction follows matching NFA transitions and then takes the epsilon closure of the destination set. Each unique subset becomes one DFA state; subsets containing the NFA accept state are accepting.

The implementation enumerates ASCII characters plus any explicit characters in the regex to build the finite transition map used by the simulator.

## DFA simulation

Simulation starts at DFA state zero and looks up one deterministic transition per input character. A missing edge rejects immediately; after all input is consumed, acceptance is decided by membership in the DFA accepting-state set. The result preserves each visited state, input character, and next state for the UI's trace.

## Longest-match tokenization

At each source offset, the lexer tests every configured rule. It selects the match with greatest length (maximal munch), then the lowest numeric priority for ties. It consumes skipped rules without emitting tokens, preserves source coordinates through whitespace and comments, and reports unmatched characters rather than silently discarding them.

## Position tracking

Line and column are 1-based. Source offsets are Python string indices, 0-based, with an exclusive end offset. A newline advances the line and resets the column to one.
