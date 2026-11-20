"""Current compiled source binding supplements immutable pre-integration QA."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'docs/qa/evidence/combined-integration'
def read(name):return json.loads((DATA/name).read_text(encoding='utf-8'))
unity=read('unity-current.json')
digest=hashlib.sha256()
files=sorted((ROOT/'client/Assets/ThronesOfMyth/Scripts').glob('*.cs'),key=lambda p:p.name)
for file in files:digest.update((file.name+'\0'+file.read_text(encoding='utf-8-sig')+'\0').encode())
assert unity['success'] and unity['unityVersion']=='6000.3.0f1'
assert unity['sourceFingerprint']==digest.hexdigest() and unity['scripts']==len(files), 'Run actual CombinedIntegrationReview; do not rebind old evidence'
city=read('unity-city.json');assert city['success'] and city['independentBuildings']==11 and city['paidJobs']==1
topology=read('unity-pass-topology.json');assert topology['success'] and topology['zones']==7 and topology['passModels']==10
for row in read('runtime-sources.json'):
    assert hashlib.sha256((ROOT/row['path']).read_text(encoding='utf-8-sig').encode()).hexdigest()==row['sha256'],row['path']
fresh=json.loads((ROOT/'work/combined-integration/legal-exploration.json').read_text(encoding='utf-8'))
assert fresh['cells']==fresh['restarted']==4096
assert not fresh['scouts'] or all(s['phase'] in ['Outbound','Returning','Exploring'] for s in fresh['scouts'])
assert 'qa-reference' not in (ROOT/'server/index.mjs').read_text(encoding='utf-8')
print('PASS current combined Unity/runtime bindings and fresh4096-cell automatic exploration; external parity/native input independent')
