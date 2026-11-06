from pydantic import BaseModel, Field


class TokenRuleInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    pattern: str = Field(min_length=1, max_length=500)
    priority: int = Field(ge=1, le=10000)
    description: str = Field(default="", max_length=500)
    skip: bool = False


class AnalyzeRequest(BaseModel):
    source: str = Field(max_length=1_000_000)


class AutomataRequest(BaseModel):
    pattern: str = Field(min_length=1, max_length=500)


class SimulateRequest(BaseModel):
    pattern: str = Field(min_length=1, max_length=500)
    lexeme: str = Field(max_length=10000)
