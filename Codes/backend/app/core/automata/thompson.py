from __future__ import annotations

from dataclasses import dataclass

from .regex_parser import Node, format_character_set, parse_regex


@dataclass
class Transition:
    source: int
    target: int
    symbol: str | frozenset[str] | None


@dataclass
class NFA:
    start: int
    accept: int
    transitions: list[Transition]
    state_count: int

    def as_dict(self) -> dict:
        return {
            "start_state": self.start,
            "accept_states": [self.accept],
            "states": list(range(self.state_count)),
            "transitions": [
                {"from": edge.source, "to": edge.target, "label": _label(edge.symbol)}
                for edge in self.transitions
            ],
        }


def _label(symbol: str | frozenset[str] | None) -> str:
    if symbol is None:
        return "ε"
    if isinstance(symbol, str):
        return symbol
    return format_character_set(symbol)


class ThompsonBuilder:
    def __init__(self):
        self.transitions: list[Transition] = []
        self.next_state = 0

    def _state(self) -> int:
        state = self.next_state
        self.next_state += 1
        return state

    def build(self, node: Node) -> tuple[int, int]:
        if node.kind == "literal":
            start, end = self._state(), self._state()
            self.transitions.append(Transition(start, end, node.value))
            return start, end
        if node.kind == "class":
            start, end = self._state(), self._state()
            self.transitions.append(Transition(start, end, node.value))
            return start, end
        if node.kind == "eps":
            start, end = self._state(), self._state()
            self.transitions.append(Transition(start, end, None))
            return start, end
        if node.kind == "concat":
            left_start, left_end = self.build(node.left)
            right_start, right_end = self.build(node.right)
            self.transitions.append(Transition(left_end, right_start, None))
            return left_start, right_end
        if node.kind == "alt":
            start, end = self._state(), self._state()
            left_start, left_end = self.build(node.left)
            right_start, right_end = self.build(node.right)
            self.transitions.extend([
                Transition(start, left_start, None), Transition(start, right_start, None),
                Transition(left_end, end, None), Transition(right_end, end, None),
            ])
            return start, end
        if node.kind in ("star", "plus", "optional"):
            start, end = self._state(), self._state()
            inner_start, inner_end = self.build(node.left)
            self.transitions.extend([
                Transition(start, inner_start, None),
                Transition(inner_end, end, None),
            ])
            if node.kind in ("star", "optional"):
                self.transitions.append(Transition(start, end, None))
            if node.kind in ("star", "plus"):
                self.transitions.append(Transition(inner_end, inner_start, None))
            return start, end
        raise ValueError(f"Unsupported regular-expression operation: {node.kind}")


def regex_to_nfa(expression: str) -> NFA:
    builder = ThompsonBuilder()
    start, accept = builder.build(parse_regex(expression))
    return NFA(start, accept, builder.transitions, builder.next_state)
