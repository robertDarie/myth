"""Keep dated source-bound QA immutable; current-source checks are additional."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRE_INTEGRATION = 'ab033864a549ecb43b1eb92bd9d9fc7f2ac25c36'

def dated_source(path):
    return subprocess.check_output(['git', 'show', PRE_INTEGRATION + ':' + path], cwd=ROOT).decode('utf-8-sig').replace('\r\n', '\n')
