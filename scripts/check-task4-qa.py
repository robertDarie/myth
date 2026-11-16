"""Validate the dated QA evidence, not external reference truth or current readiness."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QA = ROOT / 'docs/qa'
DATA = QA / 'evidence/task4'


def read(name):
    return json.loads((DATA / name).read_text(encoding='utf-8'))


def main():
    build = read('build-and-inputs.json')
    commit = build['commit']
    assert commit == 'f5c0cdf75af286c33a9c116f46139ee40c8fbce1'
    assert build['protocol'] == 17 and build['unity'] == '6000.3.0f1'
    assert build['buildExit'] == 0 and build['dirty'] is False
    assert build['payloadFiles'] == 145 and build['zipBytes'] == 87198472
    assert len(build['zipSha256']) == 64 and len(build['inputs']) == 3
    functional = read('functional-results.json')
    assert functional['testedCommit'] == commit
    checks = {r['id']: r['verdict'] for r in functional['checks']}
    assert len(checks) == len(functional['checks']) == 20
    assert set(checks.values()) == {'PASS'}
    for backend, count in [('json', 3), ('sqlite', 10)]:
        assert checks[backend + '.actual-process-restart-and-resume'] == 'PASS'
        assert checks[backend + '.army-authority-and-invalid-input'] == 'PASS'
        run = next(r for r in functional['backends'] if r['backend'] == backend)
        assert run['players'] == count and run['startupMs'] > 0
    soak = functional['backends'][1]['soak']
    assert soak['wallSeconds'] >= 120 and soak['cycles'] >= 1
    assert soak['authenticatedClients'] == soak['registeredAlphaPlayers'] == 10
    assert soak['simultaneousBattles'] == 0
    for case in read('large-world-results.json')['cases']:
        assert case['registeredCities'] in [32, 128, 256]
        assert case['concurrentHttpClients'] == 10
        assert not case['failures'] and case['persistenceHealthy']
    diagnostics = read('diagnostics.json')
    assert diagnostics['commit'] == commit
    assert {r['id'] for r in diagnostics['probes']} == {
        'military-frontier', 'scout-pass', 'secondary-passive', 'secondary-level'}
    assert all(r['verdict'] == 'FAIL' and r['fixture'] for r in diagnostics['probes'])
    progress = read('production-progression.json')
    assert len(progress['actions']) == 827
    assert [r['seconds'] for r in progress['milestones']] == [0, 1800, 3600, 86400, 604800, 2592000]
    assert all(r['restart'].startswith('PASS') for r in progress['milestones'])
    for action in progress['actions']:
        if 'jobQuote' in action:
            for resource, amount in action['jobQuote']['cost'].items():
                assert action['before'][resource] - action['after'][resource] == amount
    native = read('native-observations.json')
    assert native and all(r['testedCommit'] == commit for r in native)
    assert native[0]['cityLevel'] == 2 and native[0]['training'][0]['duration'] == 1500
    for name in ['native-first-city.jpg', 'native-upgrade-running.jpg', 'native-upgrade-complete.jpg',
                 'native-training-queued.jpg', 'native-world-before-zoom.jpg']:
        assert (DATA / name).read_bytes().startswith(b'\xff\xd8\xff')
    # The live matrix evolves with recovery; retain this dated baseline as evidence.
    with (DATA / 'feature-verification-matrix.csv').open(encoding='utf-8', newline='') as stream:
        rows = list(csv.DictReader(stream))
    assert len(rows) == len({r['feature_id'] for r in rows}) == 41
    for row in rows:
        assert row['tested_commit'] == commit
        assert all(row[key] for key in ['server', 'native_windows', 'legitimate_progression',
                                       'numerical', 'rok_parity', 'save_restart', 'multiplayer', 'evidence'])
    for name in ['ALPHA_READINESS_REPORT.md', 'FIRST_SESSION_REPORT.md',
                 'MULTIPLAYER_TEST_REPORT.md', 'OPEN_BUGS.md']:
        assert commit in (QA / name).read_text(encoding='utf-8')
    assert 'NOT READY — BLOCKERS REMAIN' in (QA / 'ALPHA_READINESS_REPORT.md').read_text(encoding='utf-8')
    print('PASS dated Task4 QA evidence: 41 rows; 20 HTTP checks; red gameplay requirements retained. Not alpha/parity certification.')


if __name__ == '__main__':
    main()
