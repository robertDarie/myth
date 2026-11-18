"""B2 local source/fixture traceability; not external RoK truth or native certification."""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))

evidence = read('docs/qa/evidence/task7-b2/verification.json')
unity = read('docs/qa/evidence/task7-b2/unity-interface.json')
assert unity['success'] and unity['unityVersion'] == '6000.3.0f1'
assert unity['independentBuildings'] == 11 and unity['paidJobs'] >= 1
digest = hashlib.sha256()
for name in ['Scripts/WorldModels.cs', 'Scripts/PrototypeClient.Interface.cs', 'Scripts/PrototypeClient.CityExperience.cs', 'Scripts/PrototypeClient.ReferenceCityQa.cs', 'Editor/ReferenceCityReview.cs']:
    source = (ROOT / 'client/Assets/ThronesOfMyth' / name).read_text(encoding='utf-8-sig')
    digest.update((name + '\0' + source + '\0').encode('utf-8'))
assert digest.hexdigest() == unity['sourceFingerprint'], 'Rerun actual Unity ReferenceCityReview; never rebind old evidence'
assert evidence['normal_activation'] is False and evidence['real_saves_used'] is False
assert evidence['native']['verdict'] == 'PARTIAL'
assert evidence['native']['not_tested'] and evidence['native']['actual_pass']
for screenshot in evidence['screenshots']:
    data = (ROOT / screenshot['path']).read_bytes()
    assert data.startswith(b'\xff\xd8') and hashlib.sha256(data).hexdigest() == screenshot['sha256']
track_a = read('docs/qa/evidence/task7-b2/track-a.json')
gaps = read('research/parity/task7-b2/first-five-level-gaps.json')
assert track_a['highest_verified_city_hall'] is None and track_a['reference_supported_upgrades_completed'] == 0
assert track_a['normal_activation'] is False and not track_a['synthetic_fallback_counted']
assert [row['level'] for row in gaps['rows']] == [1, 2, 3, 4, 5]
assert all(not row['current_supported_activation'] and row['current_account_binding'] == 'UNKNOWN' for row in gaps['rows'])
assert 'qa-reference' not in (ROOT / 'server/index.mjs').read_text(encoding='utf-8')
assert 'reference-city-fixtures' not in (ROOT / 'server/world.mjs').read_text(encoding='utf-8')
subprocess.run(['node', 'scripts/qa-reference-playthrough.mjs'], cwd=ROOT, check=True)
fresh = read('work/task7-b2/track-b.json')
assert fresh == read('docs/qa/evidence/task7-b2/track-b.json'), 'Published integrated progression differs from fresh commands'
assert fresh['normalActivation'] is False and fresh['legacyMatchedOrdinaryWorld'] is True
assert fresh['paidUpgrades'] == 270 and fresh['worldSeconds'] == fresh['engineSeconds'] == 11670
print(json.dumps({'actual_Unity_DTO_buildings': 11, 'integrated_synthetic_upgrades': 270, 'native': 'PARTIAL; see explicit NOT TESTED cases', 'normal_activation': False, 'RoK_parity': 'NOT CERTIFIED'}))
