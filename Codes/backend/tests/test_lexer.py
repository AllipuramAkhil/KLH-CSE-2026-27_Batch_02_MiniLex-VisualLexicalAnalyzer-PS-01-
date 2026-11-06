from app.core.lexer.rules import TokenRule, default_rules
from app.core.lexer.tokenizer import tokenize


def scan(source: str):
    return tokenize(source, default_rules())


def test_keywords_are_not_identifiers_and_identifiers_are_recognized():
    tokens, errors = scan("int integer main")
    assert errors == []
    assert [(token.type, token.lexeme) for token in tokens] == [
        ("KEYWORD", "int"),
        ("IDENTIFIER", "integer"),
        ("IDENTIFIER", "main"),
    ]


def test_integer_float_and_scientific_notation():
    tokens, errors = scan("42 3.14 .5 1e3 1.")
    assert errors == []
    assert [token.type for token in tokens] == ["INTEGER", "FLOAT", "FLOAT", "FLOAT", "FLOAT"]
    assert [token.lexeme for token in tokens] == ["42", "3.14", ".5", "1e3", "1."]


def test_longest_match_recognizes_multichar_operators():
    tokens, errors = scan("a >= 10 && b != 0 || c++")
    assert errors == []
    assert [token.lexeme for token in tokens if "OPERATOR" in token.type] == [">=", "&&", "!=", "||", "++"]


def test_comments_are_ignored_and_positions_continue_across_lines():
    tokens, errors = scan("int a; // one\n/* two\nlines */ return a;")
    assert errors == []
    assert [token.lexeme for token in tokens] == ["int", "a", ";", "return", "a", ";"]
    assert tokens[3].line == 3
    assert tokens[3].column == 10


def test_token_offsets_and_line_column_are_exact():
    tokens, errors = scan("int x;\n  return x;")
    assert errors == []
    token = next(token for token in tokens if token.lexeme == "return")
    assert (token.line, token.column, token.start_position, token.end_position) == (2, 3, 9, 15)


def test_invalid_character_and_malformed_number_are_reported():
    tokens, errors = scan("int n = 12abc; @")
    assert [error["type"] for error in errors] == ["MALFORMED_NUMBER", "INVALID_CHARACTER"]
    assert errors[0]["lexeme"] == "12abc"
    assert errors[1]["line"] == 1
    assert errors[1]["column"] == 16


def test_incomplete_exponent_is_reported_as_one_malformed_number():
    tokens, errors = scan("float amount = 12e+;")
    assert [token.lexeme for token in tokens] == ["float", "amount", "=", ";"]
    assert errors[0]["type"] == "MALFORMED_NUMBER"
    assert errors[0]["lexeme"] == "12e+"


def test_multiple_decimal_points_are_one_malformed_number():
    tokens, errors = scan(".5.6")
    assert tokens == []
    assert errors[0]["type"] == "MALFORMED_NUMBER"
    assert errors[0]["lexeme"] == ".5.6"


def test_unterminated_strings_and_comments_are_reported():
    _, string_errors = scan('char* s = "broken\nint x;')
    _, comment_errors = scan("int x; /* never closed")
    assert string_errors[0]["type"] == "UNTERMINATED_STRING"
    assert string_errors[0]["line"] == 1
    assert comment_errors[0]["type"] == "UNTERMINATED_COMMENT"
    assert comment_errors[0]["column"] == 8


def test_priority_breaks_equal_length_ties_after_longest_match():
    rules = [
        TokenRule("late", "LATE", r"ab", 2),
        TokenRule("early", "EARLY", r"ab", 1),
        TokenRule("long", "LONG", r"abc", 9),
    ]
    tokens, errors = tokenize("abc ab", rules)
    assert errors == []
    assert [(token.type, token.lexeme) for token in tokens] == [("LONG", "abc"), ("EARLY", "ab")]
