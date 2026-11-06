from __future__ import annotations

import re
from dataclasses import dataclass

from .rules import TokenRule


@dataclass
class Token:
    id: int
    type: str
    lexeme: str
    line: int
    column: int
    start_position: int
    end_position: int

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "lexeme": self.lexeme,
            "line": self.line,
            "column": self.column,
            "start_position": self.start_position,
            "end_position": self.end_position,
        }


def _advance(source: str, line: int, column: int) -> tuple[int, int]:
    for char in source:
        if char == "\n":
            line, column = line + 1, 1
        else:
            column += 1
    return line, column


def tokenize(source: str, rules: list[TokenRule]) -> tuple[list[Token], list[dict]]:
    compiled = [(rule, re.compile(rule.pattern)) for rule in rules]
    tokens: list[Token] = []
    errors: list[dict] = []
    offset, line, column = 0, 1, 1

    while offset < len(source):
        char = source[offset]
        if char.isspace():
            line, column = _advance(char, line, column)
            offset += 1
            continue

        if source.startswith("/*", offset) and "*/" not in source[offset + 2:]:
            lexeme = source[offset:]
            errors.append(_error("UNTERMINATED_COMMENT", lexeme, line, column, "Multi-line comment is missing its closing */.", "Add */ to close the comment."))
            break
        if char == '"':
            end = offset + 1
            escaped = False
            while end < len(source) and source[end] != "\n":
                if source[end] == '"' and not escaped:
                    break
                if source[end] == "\\" and not escaped:
                    escaped = True
                else:
                    escaped = False
                end += 1
            if end >= len(source) or source[end] != '"':
                lexeme = source[offset:end]
                errors.append(_error("UNTERMINATED_STRING", lexeme, line, column, "String literal is not terminated before the end of the line.", 'Add a closing double quote (").'))
                line, column = _advance(lexeme, line, column)
                offset = end
                continue

        matches = []
        remainder = source[offset:]
        if char.isdigit() or (char == "." and offset + 1 < len(source) and source[offset + 1].isdigit()):
            numeric = re.match(r"(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d*)?", remainder)
            if numeric:
                candidate = numeric.group()
                suffix = remainder[len(candidate):]
                incomplete_exponent = re.search(r"[eE][+-]?$", candidate) is not None
                if incomplete_exponent or (suffix and re.match(r"[A-Za-z0-9_.]", suffix)):
                    malformed = re.match(r"(?:\d|\.)[\w.+-]*", remainder)
                    lexeme = malformed.group() if malformed else candidate
                    errors.append(_error("MALFORMED_NUMBER", lexeme, line, column, "Numeric constant has an invalid format.", "Use digits with at most one decimal point and a valid exponent."))
                    line, column = _advance(lexeme, line, column)
                    offset += len(lexeme)
                    continue
        for rule, pattern in compiled:
            match = pattern.match(remainder)
            if match and match.end() > 0:
                matches.append((match.end(), rule.priority, rule, match.group()))
        if matches:
            _, _, rule, lexeme = min(matches, key=lambda match: (-match[0], match[1]))
            start = offset
            if not rule.skip:
                tokens.append(Token(len(tokens) + 1, rule.name, lexeme, line, column, start, start + len(lexeme)))
            line, column = _advance(lexeme, line, column)
            offset += len(lexeme)
            continue

        malformed = re.match(r"\d[\w.]*", remainder)
        if malformed and (len(malformed.group()) > 1 or malformed.group()[-1].isdigit()):
            lexeme = malformed.group()
            errors.append(_error("MALFORMED_NUMBER", lexeme, line, column, "Numeric constant has an invalid format.", "Use digits with at most one decimal point and a valid exponent."))
        else:
            lexeme = char
            errors.append(_error("INVALID_CHARACTER", lexeme, line, column, f"Character {char!r} does not match any token rule.", "Remove it or define a token rule that accepts it."))
        line, column = _advance(lexeme, line, column)
        offset += len(lexeme)

    return tokens, errors


def _error(error_type: str, lexeme: str, line: int, column: int, message: str, suggestion: str) -> dict:
    return {
        "type": error_type,
        "line": line,
        "column": column,
        "lexeme": lexeme,
        "message": message,
        "suggestion": suggestion,
    }
