from __future__ import annotations


def simulate(dfa: dict, lexeme: str) -> dict:
    state = dfa["start_state"]
    sequence = [{"state": state, "input": None}]
    mapping = dfa["transition_map"]
    for index, char in enumerate(lexeme):
        target = mapping.get(f"{state}:{char}")
        sequence.append({"state": state, "input": char, "next_state": target, "position": index + 1})
        if target is None:
            return {"accepted": False, "final_state": state, "sequence": sequence}
        state = target
    return {
        "accepted": state in dfa["accept_states"],
        "final_state": state,
        "sequence": sequence,
    }
