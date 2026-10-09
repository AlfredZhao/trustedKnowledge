"""Run real ASGI checks in isolation from repository tests' lightweight FastAPI stubs."""
from pathlib import Path
import subprocess
import sys
import unittest


class OfficeExportTests(unittest.TestCase):
    def test_isolated_api_schema_and_worker_checks(self):
        available = subprocess.run([sys.executable, '-c', 'import fastapi, httpx, pptx, docx'], capture_output=True)
        if available.returncode: self.skipTest('Install backend requirements and httpx to run Office API checks')
        result = subprocess.run([sys.executable, '-m', 'tests.office_export_checks'], cwd=Path(__file__).resolve().parents[1], capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__': unittest.main()
