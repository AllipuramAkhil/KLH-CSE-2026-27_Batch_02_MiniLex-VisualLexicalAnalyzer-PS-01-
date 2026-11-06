from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter

from ...core.lexer.tokenizer import tokenize
from ...services.store import analyses, token_rules
from ...schemas.models import AnalyzeRequest

router = APIRouter()


@router.post("/analyze")
def analyze(request: AnalyzeRequest) -> dict:
    tokens, errors = tokenize(request.source, token_rules)
    distribution: dict[str, int] = {}
    for token in tokens:
        distribution[token.type] = distribution.get(token.type, 0) + 1
    result = {
        "id": str(uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": request.source,
        "tokens": [token.as_dict() for token in tokens],
        "errors": errors,
        "statistics": {
            "total_tokens": len(tokens),
            "valid_tokens": len(tokens),
            "lexical_errors": len(errors),
            "lines_analyzed": len(request.source.splitlines()) or 1,
            "distribution": distribution,
        },
    }
    analyses[result["id"]] = result
    return result
