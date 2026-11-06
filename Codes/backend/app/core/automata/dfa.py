from __future__ import annotations

from collections import defaultdict, deque

from .regex_parser import format_character_set
from .thompson import NFA


def _matches(symbol: str | frozenset[str] | None, char: str) -> bool:
    return symbol == char if isinstance(symbol, str) else symbol is not None and char in symbol


def epsilon_closure(states: set[int], nfa: NFA) -> frozenset[int]:
    closure = set(states)
    pending = list(states)
    epsilon = defaultdict(list)
    for edge in nfa.transitions:
        if edge.symbol is None:
            epsilon[edge.source].append(edge.target)
    while pending:
        state = pending.pop()
        for target in epsilon[state]:
            if target not in closure:
                closure.add(target)
                pending.append(target)
    return frozenset(closure)


def nfa_to_dfa(nfa: NFA) -> dict:
    alphabet = set(chr(value) for value in range(128))
    for edge in nfa.transitions:
        if isinstance(edge.symbol, str):
            alphabet.add(edge.symbol)
        elif edge.symbol is not None:
            alphabet.update(edge.symbol)

    start = epsilon_closure({nfa.start}, nfa)
    subsets = [start]
    subset_ids = {start: 0}
    pending = deque([start])
    transitions: dict[tuple[int, str], int] = {}
    accepting = []

    while pending:
        subset = pending.popleft()
        state_id = subset_ids[subset]
        if nfa.accept in subset:
            accepting.append(state_id)
        for char in sorted(alphabet):
            moved = {
                edge.target for edge in nfa.transitions
                if edge.source in subset and _matches(edge.symbol, char)
            }
            if not moved:
                continue
            target_subset = epsilon_closure(moved, nfa)
            if target_subset not in subset_ids:
                subset_ids[target_subset] = len(subsets)
                subsets.append(target_subset)
                pending.append(target_subset)
            transitions[(state_id, char)] = subset_ids[target_subset]

    edges = _group_edges(transitions)
    return {
        "start_state": 0,
        "accept_states": accepting,
        "states": list(range(len(subsets))),
        "transitions": edges,
        "transition_map": {f"{state}:{char}": target for (state, char), target in transitions.items()},
        "nfa_state_count": nfa.state_count,
        "dfa_state_count": len(subsets),
    }


def _group_edges(transitions: dict[tuple[int, str], int]) -> list[dict]:
    groups: dict[tuple[int, int], list[str]] = defaultdict(list)
    for (source, char), target in transitions.items():
        groups[(source, target)].append(char)
    return [
        {"from": source, "to": target, "label": _format_chars(chars)}
        for (source, target), chars in sorted(groups.items())
    ]


def _format_chars(chars: list[str]) -> str:
    if len(chars) == 1 and chars[0] not in "\n\r\t ":
        return chars[0]
    return format_character_set(set(chars))
