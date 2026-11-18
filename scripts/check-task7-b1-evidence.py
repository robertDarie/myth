"""Check local provenance and reproduce TEST_ONLY engine evidence, not source truth."""
import csv
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
matrix = json.loads((ROOT / 'research/parity/task7-b1/requirements-matrix.json').read_text(encoding='utf-8'))
source = ROOT / matrix['provenance']['source_fixture']
assert hashlib.sha256(source.read_bytes()).hexdigest() == matrix['provenance']['sha256']
with source.open(encoding='utf-8-sig', newline='') as stream:
    original = {(row['building'], int(row['level'])): row for row in csv.DictReader(stream)}
assert len(matrix['rows']) == len(original) == 650
seen = set()
for row in matrix['rows']:
    key = (row['building'], row['level'])
    assert key not in seen
    seen.add(key)
    old = original[key]
    assert row['cost_observed'] == {name: int(old[name]) for name in ('food', 'wood', 'stone', 'gold')}
    assert row['construction_seconds_observed'] == int(old['base_seconds'])
    assert row['source'] == old['source_url']
    assert row['reference_version'] == row['requirements_completeness'] == 'UNKNOWN'
    assert all(row[name] is None for name in ('power_increase', 'unlocks', 'capacity_effects', 'modifier_behavior'))
    assert 'UNKNOWN' in row['field_confidence']['modifier_behavior']
assert seen == set(original)
assert matrix['academy_research']['complete_rank_DAG'] is None
assert matrix['academy_research']['normal_activation'] is False
subprocess.run(['node', 'scripts/reference-city-playthrough.mjs'], cwd=ROOT, check=True)
actual = json.loads((ROOT / 'work/task7-b1/progression.json').read_text(encoding='utf-8'))
published = json.loads((ROOT / 'docs/qa/evidence/task7-b1/progression.json').read_text(encoding='utf-8'))
assert actual == published, 'Published synthetic ledger differs from fresh authoritative commands'
assert actual['normalActivation'] is False
assert actual['paidUpgradeCommands'] == 270
assert set(actual['finalLevels'].values()) == {25}
print(json.dumps({'matrix_rows': len(seen), 'synthetic_paid_upgrades': 270, 'current_RoK_parity': 'NOT CERTIFIED'}))
