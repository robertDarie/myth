"""Validate source-bound QA evidence; this is not gameplay or source certification."""
import csv
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QA = ROOT / 'docs/qa'


def read_csv(path):
    with path.open(encoding='utf-8', newline='') as stream:
        return list(csv.DictReader(stream))


def main():
    contract = read_csv(ROOT / 'research/parity/ROK_COMPLETE_FEATURE_CONTRACT.csv')
    matrix = read_csv(QA / 'COMPLETE_FEATURE_VERIFICATION.csv')
    assert len(matrix) == len(contract), 'Omitted reference scopes'
    assert len({r['feature_id'] for r in matrix}) == len(matrix), 'Duplicate verification scopes'
    assert {r['feature_id'] for r in matrix} == {r['feature_id'] for r in contract}, 'Reference denominator differs'
    allowed = {'PASS', 'FAIL', 'PARTIAL', 'BLOCKED', 'UNTESTED', 'REFERENCE UNKNOWN'}
    axes = ['implemented', 'server_behavior', 'windows_native', 'normal_progression', 'numerical_values', 'mechanics_interactions', 'save_restart', 'multiplayer', 'reference_parity']
    for row in matrix:
        assert all(row.get(axis) in allowed for axis in axes), row['feature_id'] + ': missing independent verdict'
        assert row.get('uncertainty_blocker') and row.get('evidence') and row.get('source_commit'), 'Missing evidence/uncertainty'
    evidence = json.loads((QA / 'evidence/task11/executed-results.json').read_text(encoding='utf-8'))
    assert evidence['full_server'] == {'tests': 416, 'pass': 411, 'fail': 0, 'skipped': 5}
    assert len(evidence['http_checks']) == 22 and all(r['verdict'] == 'PASS' for r in evidence['http_checks'])
    assert len({r['id'] for r in evidence['http_checks']}) == 22
    assert evidence['global_parity_percentage'] is None and evidence['complete_reference_denominator'] == 'UNKNOWN'
    assert not any(row['reference_parity'] == 'PASS' for row in matrix), 'Unsupported whole-feature reference certification'
    assert evidence['native_updated_binary'] == 'NOT TESTED' and all(r['windows_native'] == 'UNTESTED' for r in matrix)
    assert 'NOT CERTIFIED' in (QA / 'FULL_ROK_PARITY_CERTIFICATION.md').read_text(encoding='utf-8')
    paths = subprocess.check_output(['git', 'ls-files'], cwd=ROOT, text=True).splitlines()
    paths = [p for p in paths if (p.startswith('server/') and p.endswith(('.mjs', '.json')) and not p.endswith('.test.mjs') and '/testing/' not in p) or (p.startswith('client/Assets/ThronesOfMyth/Scripts/') and p.endswith('.cs'))]
    digest = hashlib.sha256()
    for path in paths:
        content = (ROOT / path).read_bytes().replace(b'\r\n', b'\n')
        digest.update(path.encode() + b'\0' + content + b'\0')
    assert len(paths) == evidence['tracked_gameplay_file_count'] and digest.hexdigest() == evidence['tracked_gameplay_sha256'], 'Gameplay changed; refresh this dated source-bound assessment instead of reusing its verdicts'
    readiness = read_csv(QA / 'TASK7_10_READINESS.csv')
    assert {r['feature_id'] for r in readiness} == {r['feature_id'] for r in contract}
    for name in ['REAL_PROGRESSION_PLAYTHROUGH', 'ADVERSARIAL_GAMEPLAY_TESTS', 'NATIVE_CLIENT_VERIFICATION', 'MULTIPLAYER_CERTIFICATION', 'REMAINING_PARITY_GAPS', 'CHATGPT_DEVELOPMENT_HANDOFF']:
        assert len((QA / (name + '.md')).read_text(encoding='utf-8')) > 500, name + ': missing report'
    print(json.dumps({'verified_report_scopes': len(matrix), 'source_files': len(paths), 'full_reference_denominator': 'UNKNOWN', 'parity_verdict': 'NOT CERTIFIED', 'scope': 'Evidence consistency, not external facts or unexecuted gameplay'}))


if __name__ == '__main__': main()
