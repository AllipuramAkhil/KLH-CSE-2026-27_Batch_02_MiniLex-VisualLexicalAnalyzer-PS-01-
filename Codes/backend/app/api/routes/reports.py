from fastapi import APIRouter, HTTPException

from ...services.store import analyses

router = APIRouter()


@router.get("/{report_id}")
def get_report(report_id: str) -> dict:
    report = analyses.get(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Analysis report not found.")
    return report
