"""Check Recovery A source/fixture traceability, not RoK source truth or native UX."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'docs/qa/evidence/recovery-a'


def read(name):return json.loads((DATA/name).read_text(encoding='utf-8'))


def main():
    evidence=read('verification.json');topology=read('topology.json');unity=read('unity-pass-topology.json');legal=read('legal-playthrough.json')
    assert evidence['baseline']=='69c58ea6e55b7bfe0c0cba0c2a0ea096e32a6d81'
    assert evidence['initial_red']=={'tests':6,'pass':0,'fail':6}
    assert evidence['full_server']['fail']==0 and evidence['full_server']['pass']+evidence['full_server']['skipped']==evidence['full_server']['tests']
    assert evidence['numeric_parity']=='UNVERIFIED; owner-approved original Divine Gate compatibility'
    for name,expected in evidence['source_sha256'].items():
        actual=hashlib.sha256((ROOT/name).read_text(encoding='utf-8-sig').encode('utf-8')).hexdigest()
        assert actual==expected,name+': refresh current RecoveryA evidence after relevant changes'
    result=subprocess.run(['node','--input-type=module','-e',"import {PROVINCES,MAP_CORRIDORS,PASS_DEFINITIONS} from './server/world-map.mjs'; console.log(JSON.stringify({zones:PROVINCES,corridors:MAP_CORRIDORS,passes:PASS_DEFINITIONS}));"],cwd=ROOT,capture_output=True,text=True,check=True)
    assert json.loads(result.stdout)==topology,'Canonical topology fixture differs'
    assert len(topology['zones'])==7 and len(topology['corridors'])==len(topology['passes'])==10
    assert unity['success'] and unity['zones']==7 and unity['crossings']==10 and unity['passModels']==10 and unity['mountainRenderers']>0
    files=['Scripts/WorldModels.cs','Scripts/WorldView.cs','Scripts/WorldView.Environment.cs','Scripts/WorldView.Territory.cs','Scripts/PrototypeClient.cs','Scripts/PrototypeClient.Screens.cs','Scripts/PrototypeClient.Interface.cs','Scripts/PrototypeClient.Warfare.cs','Editor/PassReview.cs']
    digest=hashlib.sha256()
    for name in files:
        relative='client/Assets/ThronesOfMyth/'+name
        digest.update((relative+'\0'+(ROOT/relative).read_text(encoding='utf-8-sig')+'\0').encode('utf-8'))
    assert digest.hexdigest()==unity['sourceFingerprint'],'Rerun actual Unity topology validation; do not rebind old evidence'
    assert legal['campVictories']>=4 and legal['cityLevel']==2 and legal['commands']==len(legal['actions']) and {'foundations','gates'}<=set(legal['opened'])
    assert len(legal['passes'])==2 and all(p['owned'] for p in legal['passes']) and legal['firstCrossing']['x']>40 and legal['secondCrossing']['z']>40
    assert 'DENIED' in legal['outsideMilitary'] and 'ARRIVED' in legal['outsideScout']
    historical=read('historical-migration.json');assert historical['baseline']==evidence['baseline'] and historical['syntheticSaves']==32 and historical['paidConstructionQueues']==32 and historical['resultSchema']==28
    assert evidence['native_status'] in {'NOT TESTED','PARTIAL'}
    print(json.dumps({'zones':7,'physical_passes':10,'actual_unity_models':10,'legal_commands':legal['commands'],'native_status':evidence['native_status'],'numerical_parity':'UNVERIFIED','scope':'Source/fixture consistency; native usability and external reference truth remain independent'}))


if __name__=='__main__':main()
