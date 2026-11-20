"""B3 deterministic local traceability, never proof of external reference truth."""
import hashlib
import json
from qa_evidence_sources import dated_source
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))

actual = read('work/task7-b3/http-matrix.json')
assert actual == read('docs/qa/evidence/task7-b3/http-matrix.json'), 'Rerun B3 actual HTTP test before checking evidence'
assert actual['requests'] == 71 and actual['duplicateRequests'] == 12
assert actual['simultaneousTrainingFacilities'] == 4 and actual['parallelPaidJobs'] == 7
assert actual['completedReserveUnits'] == 12 and actual['normalActivation'] is False
assert {row['status'] for row in actual['trace']} == {200, 400}
unity = read('docs/qa/evidence/task7-b3/unity-interface.json')
assert unity['success'] and unity['unityVersion'] == '6000.3.0f1'
assert unity['independentBuildings'] == 11 and unity['paidJobs'] == 1
assert 'native input NOT TESTED' in unity['scope']
digest = hashlib.sha256()
for name in ['Scripts/WorldModels.cs', 'Scripts/PrototypeClient.Interface.cs', 'Scripts/PrototypeClient.CityExperience.cs', 'Scripts/PrototypeClient.ReferenceCityQa.cs', 'Editor/ReferenceCityReview.cs']:
    source = dated_source('client/Assets/ThronesOfMyth/' + name)
    digest.update((name + '\0' + source + '\0').encode('utf-8'))
assert digest.hexdigest() == unity['sourceFingerprint'], 'Rerun actual Unity review, never rebind evidence'
for row in read('research/parity/task7/source-module-supplement.json'):
    if row['path'] in ['server/reference-city.mjs', 'server/qa-reference-world.mjs']:
        assert hashlib.sha256((ROOT / row['path']).read_bytes()).hexdigest() == row['sha256']
assert 'qa-reference' not in (ROOT / 'server/index.mjs').read_text(encoding='utf-8')
assert 'reference-city-fixtures' not in (ROOT / 'server/world.mjs').read_text(encoding='utf-8')
print('PASS B3 actual HTTP evidence, Unity compilation fingerprint and isolated runtime hashes; native NOT TESTED, parity not certified')
