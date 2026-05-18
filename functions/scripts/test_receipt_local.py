#!/usr/bin/env python3
"""
Prueba local del HTML/PDF sin desplegar (no requiere emuladores).

Uso (desde functions/):
  python scripts/test_receipt_local.py
  python scripts/test_receipt_local.py --open
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from receipt_generator import html_to_pdf_bytes, render_receipt_html  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--open",
        action="store_true",
        help="Abre el PDF generado con el visor predeterminado (Windows).",
    )
    args = parser.parse_args()

    context = {
        "clinic_name": "Parláre",
        "logo_data_uri": "",
        "receipt_id": "DEMO-2026-05-17",
        "issued_at": "17/05/2026 10:30",
        "session_date": "17 de mayo de 2026",
        "concept": "Tratamiento de Intervención Psicológica",
        "patient_name": "Paciente Demo",
        "tutor_name": "Tutor Demo",
        "amount_formatted": "$800.00 MXN",
        "therapist_name": "Lic. Diana López Carpió",
        "professional_license": "12345678",
        "graduation_institution": "Universidad Demo",
    }

    out_dir = ROOT / "scripts" / "output"
    out_dir.mkdir(parents=True, exist_ok=True)
    html_path = out_dir / "receipt_demo.html"
    pdf_path = out_dir / "receipt_demo.pdf"

    html = render_receipt_html(context)
    html_path.write_text(html, encoding="utf-8")
    pdf_path.write_bytes(html_to_pdf_bytes(html))

    print(f"HTML: {html_path}")
    print(f"PDF:  {pdf_path}")

    if args.open:
        import os

        os.startfile(pdf_path)  # type: ignore[attr-defined]


if __name__ == "__main__":
    main()
