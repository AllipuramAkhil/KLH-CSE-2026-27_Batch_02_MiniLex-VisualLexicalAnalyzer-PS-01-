from fastapi import APIRouter, HTTPException, Response, status
import re

from ...core.lexer.rules import TokenRule, create_rule
from ...schemas.models import TokenRuleInput
from ...services.store import token_rules

router = APIRouter()


@router.get("")
def list_rules() -> list[dict]:
    return [rule.as_dict() for rule in sorted(token_rules, key=lambda rule: rule.priority)]


@router.post("", status_code=status.HTTP_201_CREATED)
def add_rule(request: TokenRuleInput) -> dict:
    try:
        rule = create_rule(request.name, request.pattern, request.priority, request.description, request.skip)
    except re.error as error:
        raise HTTPException(status_code=422, detail=f"Invalid regular expression: {error}") from error
    token_rules.append(rule)
    return rule.as_dict()


@router.put("/{rule_id}")
def update_rule(rule_id: str, request: TokenRuleInput) -> dict:
    index = next((index for index, rule in enumerate(token_rules) if rule.id == rule_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Token rule not found.")
    try:
        updated = TokenRule(rule_id, request.name, request.pattern, request.priority, request.description, request.skip)
        re.compile(updated.pattern)
    except re.error as error:
        raise HTTPException(status_code=422, detail=f"Invalid regular expression: {error}") from error
    token_rules[index] = updated
    return updated.as_dict()


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(rule_id: str) -> Response:
    index = next((index for index, rule in enumerate(token_rules) if rule.id == rule_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Token rule not found.")
    token_rules.pop(index)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
