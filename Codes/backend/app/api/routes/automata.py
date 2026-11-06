from fastapi import APIRouter, HTTPException

from ...core.automata.dfa import nfa_to_dfa
from ...core.automata.regex_parser import RegexSyntaxError
from ...core.automata.simulation import simulate
from ...core.automata.thompson import regex_to_nfa
from ...schemas.models import AutomataRequest, SimulateRequest

router = APIRouter()


def _nfa(pattern: str):
    try:
        return regex_to_nfa(pattern)
    except RegexSyntaxError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.post("/nfa")
def generate_nfa(request: AutomataRequest) -> dict:
    nfa = _nfa(request.pattern)
    return {"pattern": request.pattern, "nfa": nfa.as_dict()}


@router.post("/dfa")
def generate_dfa(request: AutomataRequest) -> dict:
    nfa = _nfa(request.pattern)
    return {"pattern": request.pattern, "nfa": nfa.as_dict(), "dfa": nfa_to_dfa(nfa)}


@router.post("/simulate")
def simulate_lexeme(request: SimulateRequest) -> dict:
    nfa = _nfa(request.pattern)
    dfa = nfa_to_dfa(nfa)
    return {
        "pattern": request.pattern,
        "lexeme": request.lexeme,
        **simulate(dfa, request.lexeme),
    }
