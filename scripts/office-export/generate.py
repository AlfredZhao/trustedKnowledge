#!/usr/bin/env python3
"""Offline proof CLI; production and proof now share one template engine."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
from app.services.office.engine import (  # noqa: F401
    ROOT, HERE, Metrics, Planner, text_of, safe_asset, slice_runs,
    write_pptx, write_docx, write_preview, load_template_profile, main,
)
if __name__ == "__main__":
    main()
