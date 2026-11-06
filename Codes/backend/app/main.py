from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import automata, lexer, reports, token_rules as rules

app = FastAPI(
    title="MiniLex API",
    version="1.0.0",
    description="Lexical analysis and finite automata workbench.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(lexer.router, prefix="/api/lexer", tags=["Lexer"])
app.include_router(rules.router, prefix="/api/token-rules", tags=["Token rules"])
app.include_router(automata.router, prefix="/api/automata", tags=["Automata"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "MiniLex"}
