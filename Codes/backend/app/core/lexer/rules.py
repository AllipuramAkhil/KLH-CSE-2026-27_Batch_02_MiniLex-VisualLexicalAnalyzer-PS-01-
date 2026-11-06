from __future__ import annotations

from dataclasses import dataclass
import re
from uuid import uuid4


@dataclass
class TokenRule:
    id: str
    name: str
    pattern: str
    priority: int
    description: str = ""
    skip: bool = False

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "pattern": self.pattern,
            "priority": self.priority,
            "description": self.description,
            "skip": self.skip,
        }


def create_rule(name: str, pattern: str, priority: int, description: str = "", skip: bool = False) -> TokenRule:
    re.compile(pattern)
    return TokenRule(str(uuid4()), name, pattern, priority, description, skip)


def default_rules() -> list[TokenRule]:
    definitions = [
        ("BLOCK_COMMENT", r"/\*[\s\S]*?\*/", 1, "Multi-line comment", True),
        ("LINE_COMMENT", r"//[^\r\n]*", 2, "Single-line comment", True),
        ("STRING", r'"(?:\\.|[^"\\])*"', 3, "Double-quoted string literal", False),
        ("FLOAT", r"(?:\d+\.\d*|\.\d+|\d+[eE][+-]?\d+)(?:[eE][+-]?\d+)?", 4, "Floating-point constant", False),
        ("INTEGER", r"\d+", 5, "Integer constant", False),
        ("KEYWORD", r"(?:int|float|char|void|if|else|while|for|return|break|continue|const|bool|true|false)", 6, "Reserved word", False),
        ("IDENTIFIER", r"[A-Za-z_][A-Za-z0-9_]*", 7, "Identifier", False),
        ("LOGICAL_OPERATOR", r"&&|\|\||!", 8, "Logical operator", False),
        ("RELATIONAL_OPERATOR", r"<=|>=|==|!=|<|>", 9, "Relational operator", False),
        ("ASSIGNMENT_OPERATOR", r"\+=|-=|\*=|/=|=", 10, "Assignment operator", False),
        ("ARITHMETIC_OPERATOR", r"\+\+|--|\+|-|\*|/|%", 11, "Arithmetic operator", False),
        ("DELIMITER", r"[;,]", 12, "Statement delimiter", False),
        ("PARENTHESIS", r"[(){}\[\]]", 13, "Grouping delimiter", False),
    ]
    return [
        TokenRule(str(uuid4()), name, pattern, priority, description, skip)
        for name, pattern, priority, description, skip in definitions
    ]
