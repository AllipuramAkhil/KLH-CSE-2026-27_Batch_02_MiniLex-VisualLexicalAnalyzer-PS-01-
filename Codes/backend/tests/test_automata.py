import pytest

from app.core.automata.dfa import epsilon_closure, nfa_to_dfa
from app.core.automata.regex_parser import RegexSyntaxError, parse_regex
from app.core.automata.simulation import simulate
from app.core.automata.thompson import regex_to_nfa
from app.core.lexer.rules import default_rules


def test_thompson_builds_nfa_with_epsilon_edges_for_union_and_star():
    nfa = regex_to_nfa("(a|b)*")
    assert nfa.state_count > 2
    assert nfa.start != nfa.accept
    assert any(edge.symbol is None for edge in nfa.transitions)


def test_automata_visualization_labels_preserve_exact_character_classes():
    nfa = regex_to_nfa("[A-Z]")
    dfa = nfa_to_dfa(nfa)
    assert any(edge["label"] == "[A-Z]" for edge in nfa.as_dict()["transitions"])
    assert any(edge["label"] == "[A-Z]" for edge in dfa["transitions"])
    identifier = regex_to_nfa("[A-Z_]")
    assert any(edge["label"] == "[A-Z_]" for edge in identifier.as_dict()["transitions"])


def test_epsilon_closure_reaches_all_epsilon_neighbors():
    nfa = regex_to_nfa("a?")
    closure = epsilon_closure({nfa.start}, nfa)
    assert nfa.accept in closure


@pytest.mark.parametrize("pattern,accepted,rejected", [
    ("a(b|c)*", ["a", "ab", "acbc"], ["", "b", "ad"]),
    ("[A-Za-z_][A-Za-z0-9_]*", ["x", "_a2"], ["2x", "a-"]),
    ("ab+c?", ["ab", "abb", "abbbc"], ["a", "ac", "bc"]),
])
def test_subset_construction_and_dfa_simulation(pattern, accepted, rejected):
    dfa = nfa_to_dfa(regex_to_nfa(pattern))
    for lexeme in accepted:
        assert simulate(dfa, lexeme)["accepted"] is True
    for lexeme in rejected:
        assert simulate(dfa, lexeme)["accepted"] is False
    assert dfa["dfa_state_count"] > 0


def test_parser_reports_unclosed_groups():
    with pytest.raises(RegexSyntaxError, match="Unclosed group"):
        parse_regex("(ab")


def test_dot_wildcard_does_not_match_newline():
    dfa = nfa_to_dfa(regex_to_nfa("."))
    assert simulate(dfa, "x")["accepted"] is True
    assert simulate(dfa, "\n")["accepted"] is False


def test_default_keyword_and_block_comment_rules_convert_to_equivalent_automata():
    rules = default_rules()
    keyword_pattern = next(rule.pattern for rule in rules if rule.name == "KEYWORD")
    comment_pattern = next(rule.pattern for rule in rules if rule.name == "BLOCK_COMMENT")
    keyword_dfa = nfa_to_dfa(regex_to_nfa(keyword_pattern))
    comment_dfa = nfa_to_dfa(regex_to_nfa(comment_pattern))
    assert simulate(keyword_dfa, "int")["accepted"] is True
    assert simulate(keyword_dfa, "integer")["accepted"] is False
    assert simulate(comment_dfa, "/* first\nsecond */")["accepted"] is True


def test_unsupported_regex_assertions_fail_instead_of_generating_misleading_automata():
    with pytest.raises(RegexSyntaxError, match="assertion"):
        parse_regex(r"\bword\b")
