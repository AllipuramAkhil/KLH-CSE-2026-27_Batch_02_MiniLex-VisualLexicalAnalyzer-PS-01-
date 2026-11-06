from __future__ import annotations

from dataclasses import dataclass


ASCII = set(chr(value) for value in range(128))


def format_character_set(characters: set[str] | frozenset[str]) -> str:
    ordered = sorted(characters, key=ord)
    ranges: list[tuple[str, str]] = []
    start = end = None
    for char in ordered:
        if start is None:
            start = end = char
        elif ord(char) == ord(end) + 1:
            end = char
        else:
            ranges.append((start, end))
            start = end = char
    if start is not None:
        ranges.append((start, end))

    def escaped(char: str) -> str:
        named = {"\n": r"\n", "\r": r"\r", "\t": r"\t", "\f": r"\f", "\v": r"\v"}
        if char in named:
            return named[char]
        if ord(char) < 32 or ord(char) == 127:
            return f"\\x{ord(char):02x}"
        if char in r"\]-^":
            return "\\" + char
        return char

    parts = []
    for first, last in ranges:
        if first == last:
            parts.append(escaped(first))
        elif ord(last) - ord(first) >= 2:
            parts.append(f"{escaped(first)}-{escaped(last)}")
        else:
            parts.extend((escaped(first), escaped(last)))
    return "[" + "".join(parts) + "]"


@dataclass(frozen=True)
class Node:
    kind: str
    value: object = None
    left: "Node | None" = None
    right: "Node | None" = None


class RegexSyntaxError(ValueError):
    pass


class RegexParser:
    def __init__(self, expression: str):
        self.expression = expression
        self.index = 0

    def parse(self) -> Node:
        if not self.expression:
            return Node("eps")
        node = self._alternation()
        if self.index != len(self.expression):
            raise RegexSyntaxError(f"Unexpected character {self.expression[self.index]!r} at position {self.index + 1}.")
        return node

    def _alternation(self) -> Node:
        node = self._concatenation()
        while self._peek() == "|":
            self.index += 1
            node = Node("alt", left=node, right=self._concatenation())
        return node

    def _concatenation(self) -> Node:
        nodes = []
        while self.index < len(self.expression) and self._peek() not in ")|":
            nodes.append(self._repetition())
        if not nodes:
            return Node("eps")
        node = nodes[0]
        for item in nodes[1:]:
            node = Node("concat", left=node, right=item)
        return node

    def _repetition(self) -> Node:
        node = self._atom()
        while self._peek() in ("*", "+", "?"):
            operator = self.expression[self.index]
            self.index += 1
            node = Node({"*": "star", "+": "plus", "?": "optional"}[operator], left=node)
            if self._peek() == "?":
                self.index += 1
        return node

    def _atom(self) -> Node:
        char = self._peek()
        if char is None:
            raise RegexSyntaxError("Expected an expression.")
        if char == "(":
            self.index += 1
            if self.expression[self.index:self.index + 2] == "?:":
                self.index += 2
            node = self._alternation()
            if self._peek() != ")":
                raise RegexSyntaxError("Unclosed group; add a closing ')'.")
            self.index += 1
            return node
        if char == ")":
            raise RegexSyntaxError(f"Unexpected ')' at position {self.index + 1}.")
        if char == "[":
            return Node("class", self._character_class())
        if char == ".":
            self.index += 1
            return Node("class", frozenset(ASCII - {"\n"}))
        if char == "\\":
            return self._escape()
        if char in "^$":
            raise RegexSyntaxError("Anchors are not supported by automata generation.")
        if char in "*+?":
            raise RegexSyntaxError(f"Quantifier {char!r} has no preceding expression.")
        self.index += 1
        return Node("literal", char)

    def _escape(self) -> Node:
        self.index += 1
        if self.index >= len(self.expression):
            raise RegexSyntaxError("A trailing backslash must escape a character.")
        escaped = self.expression[self.index]
        self.index += 1
        classes = {
            "d": frozenset("0123456789"),
            "w": frozenset("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"),
            "s": frozenset(" \t\n\r\f\v"),
        }
        inverse = {"D": ASCII - set("0123456789"), "W": ASCII - set(classes["w"]), "S": ASCII - set(classes["s"])}
        if escaped in classes:
            return Node("class", classes[escaped])
        if escaped in inverse:
            return Node("class", frozenset(inverse[escaped]))
        if escaped in "123456789":
            raise RegexSyntaxError("Backreferences are not supported by automata generation.")
        if escaped in "bBAZz":
            raise RegexSyntaxError(f"Regex assertion \\{escaped} is not supported by automata generation.")
        translations = {"a": "\a", "n": "\n", "r": "\r", "t": "\t", "f": "\f", "v": "\v"}
        if escaped == "x":
            escaped = self._hex_escape(2)
        elif escaped == "u":
            escaped = self._hex_escape(4)
        elif escaped == "U":
            escaped = self._hex_escape(8)
        elif escaped.isalpha() and escaped not in translations:
            raise RegexSyntaxError(f"Escape \\{escaped} is not supported by automata generation.")
        return Node("literal", translations.get(escaped, escaped))

    def _character_class(self) -> frozenset[str]:
        self.index += 1
        negate = self._peek() == "^"
        if negate:
            self.index += 1
        chars: set[str] = set()
        first = True
        while self.index < len(self.expression) and (self._peek() != "]" or first):
            first = False
            start_chars, start = self._class_atom()
            if self._peek() == "-" and self.index + 1 < len(self.expression) and self.expression[self.index + 1] != "]":
                if start is None:
                    raise RegexSyntaxError("Character-class range starts with an escape class; use a single character.")
                self.index += 1
                _, end = self._class_atom()
                if end is None:
                    raise RegexSyntaxError("Character-class range ends with an escape class; use a single character.")
                if ord(start) > ord(end):
                    raise RegexSyntaxError(f"Invalid descending range {start}-{end}.")
                chars.update(chr(value) for value in range(ord(start), ord(end) + 1))
            else:
                chars.update(start_chars)
        if self._peek() != "]":
            raise RegexSyntaxError("Unclosed character class; add a closing ']'.")
        self.index += 1
        if not chars:
            raise RegexSyntaxError("Character class cannot be empty.")
        return frozenset(ASCII - chars if negate else chars)

    def _class_atom(self) -> tuple[set[str], str | None]:
        if self.index >= len(self.expression):
            raise RegexSyntaxError("Unclosed character class.")
        if self._peek() != "\\":
            char = self.expression[self.index]
            self.index += 1
            return {char}, char
        self.index += 1
        if self.index >= len(self.expression):
            raise RegexSyntaxError("A trailing backslash must escape a character.")
        escaped = self.expression[self.index]
        self.index += 1
        shorthand = {
            "d": set("0123456789"),
            "w": set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"),
            "s": set(" \t\n\r\f\v"),
        }
        inverse = {"D": ASCII - shorthand["d"], "W": ASCII - shorthand["w"], "S": ASCII - shorthand["s"]}
        if escaped in shorthand:
            return shorthand[escaped], None
        if escaped in inverse:
            return inverse[escaped], None
        if escaped in "123456789":
            raise RegexSyntaxError("Backreferences are not supported by automata generation.")
        if escaped in "bBAZz":
            if escaped == "b":
                return {"\b"}, "\b"
            raise RegexSyntaxError(f"Regex assertion \\{escaped} is not supported by automata generation.")
        translations = {"a": "\a", "n": "\n", "r": "\r", "t": "\t", "f": "\f", "v": "\v"}
        char = translations.get(escaped, escaped)
        if escaped == "x":
            char = self._hex_escape(2)
        elif escaped == "u":
            char = self._hex_escape(4)
        elif escaped == "U":
            char = self._hex_escape(8)
        elif escaped.isalpha() and escaped not in translations:
            raise RegexSyntaxError(f"Escape \\{escaped} is not supported by automata generation.")
        elif escaped == "U":
            char = self._hex_escape(8)
        return {char}, char

    def _hex_escape(self, length: int) -> str:
        digits = self.expression[self.index:self.index + length]
        if len(digits) != length or any(char not in "0123456789abcdefABCDEF" for char in digits):
            raise RegexSyntaxError(f"Expected {length} hexadecimal digits after escape.")
        self.index += length
        value = int(digits, 16)
        try:
            return chr(value)
        except ValueError as error:
            raise RegexSyntaxError("Unicode escape is outside the valid code-point range.") from error

    def _peek(self) -> str | None:
        return self.expression[self.index] if self.index < len(self.expression) else None


def parse_regex(expression: str) -> Node:
    return RegexParser(expression).parse()
