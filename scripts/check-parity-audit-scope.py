"""Audit inventory, reference and real-command simulation consistency checks."""
import csv
import json
import math
import posixpath
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'research/parity/audits/full-rok-audit'
def read(name):
    return list(csv.DictReader((DATA/name).open(encoding='utf-8-sig',newline='')))
features=read('feature-inventory.csv');modules=read('source-module-inventory.csv')
assert len({r['feature_id'] for r in features})==len(features)
assert len({r['subsystem'] for r in features})==17
assert {r['path'] for r in modules}=={'server/'+p.name for p in (ROOT/'server').glob('*.mjs') if not p.name.endswith('.test.mjs')}
for feature in features:
    assert feature['behavior'] and feature['gap'] and feature['existing_tests']
    assert all((ROOT/path).exists() for path in feature['authoritative_paths'].split(';'))
legacy=read('coverage-reconciliation.csv')
assert len(legacy)==len(list(csv.DictReader((ROOT/'research/MYTH_feature_coverage_register.csv').open(encoding='utf-8-sig'))))
parameters=read('exported-parameters.csv')
assert len({r['parameter_id'] for r in parameters})==len(parameters)
assert all(math.isfinite(float(r['tom_value'])) and r['rok_value']=='' and r['reference_class']=='UNKNOWN' for r in parameters)
buildings=read('building-reference.csv')
assert len({(r['building'],r['level']) for r in buildings})==len(buildings)
for building in {r['building'] for r in buildings}:
    assert {int(r['level']) for r in buildings if r['building']==building}==set(range(1,26))
for row in buildings:
    assert row['reference_build']=='UNKNOWN' and row['reference_class']=='VERIFIED'
    assert all(int(row[key])>=0 for key in ['food','wood','stone','gold','base_seconds'])
    assert row['source_url'].startswith('https://app.rokstats.online/buildings/')
reference=read('reference-level-comparison.csv')
assert len({r['audit_id'] for r in reference})==len(reference)
for row in reference:
    if row['parameter'] in {'food','wood','stone','gold','seconds'}:
        base=next(r for r in buildings if r['building']=='city-hall' and r['level']==row['level'])
        assert int(base['base_seconds' if row['parameter']=='seconds' else row['parameter']])==int(row['rok_value'])
    if row['tom_value']=='':
        assert row['absolute_difference']==row['percentage_difference']==''
    else:
        difference=float(row['tom_value'])-float(row['rok_value'])
        assert math.isclose(float(row['absolute_difference']),difference,abs_tol=1e-10)
        assert (row['percentage_difference']=='') == (float(row['rok_value'])==0)
progress=json.loads((DATA/'progression-results.json').read_text(encoding='utf-8'))
assert [r['label'] for r in progress['milestones']]==['fresh','30 minutes','1 hour','1 day','1 week','1 month']
assert [r['seconds'] for r in progress['milestones']]==[0,1800,3600,86400,604800,2592000]
assert all(r['restart'].startswith('PASS') and r['referenceTrajectory']=='UNKNOWN' for r in progress['milestones'])
assert all(all(amount>=0 for amount in r['resources'].values()) for r in progress['milestones'])
training=[a for a in progress['actions'] if a['type']=='train']
assert [a['targetId'] for a in training]==['infantry','veteranInfantry','columnInfantry','bulwarkInfantry','titanInfantry']
assert training[0]['jobQuote']=={'amount':100,'duration':1500,'cost':{'food':5000,'wood':5000}}
assert progress['milestones'][-1]['reserveUnits']['titanInfantry']==2000
assert progress['milestones'][-1]['cityLevel']==5
assert all(r['before'][key]-r['after'][key]==r['jobQuote']['cost'].get(key,0) for r in training for key in ['food','wood','stone','gold','mana','aether'])
with zipfile.ZipFile(DATA/'RoK_vs_Thrones_of_Myth_Master_Parity_Audit.xlsx') as book:
    ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    shared=[''.join(item.itertext()) for item in ET.fromstring(book.read('xl/sharedStrings.xml'))] if 'xl/sharedStrings.xml' in book.namelist() else []
    relationships={r.get('Id'):r.get('Target') for r in ET.fromstring(book.read('xl/_rels/workbook.xml.rels'))}
    sheets={r.get('name'):relationships[r.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')] for r in ET.fromstring(book.read('xl/workbook.xml')).find('s:sheets',ns)}
    def cells(sheet_name):
        target=sheets[sheet_name]
        path=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
        result=[]
        for row in ET.fromstring(book.read(path)).findall('s:sheetData/s:row',ns):
            values={}
            for cell in row:
                assert cell.get('t')!='e',f'Excel error in {sheet_name}'
                value=cell.find('s:v',ns)
                text=value.text if value is not None else ''
                if cell.get('t')=='s':text=shared[int(text)]
                elif cell.get('t')=='inlineStr':text=''.join(cell.find('s:is',ns).itertext())
                values[''.join(filter(str.isalpha,cell.get('r')))]=text
            if any(values.values()):result.append(values)
        return result
    for name,source in [('Feature Inventory',features),('Building Reference',buildings),('Reference Differences',reference),('Exported Parameters',parameters),('Register Reconciliation',legacy),('Formula Index',read('formula-index.csv')),('Legal Progression',progress['milestones'])]:
        actual=cells(name);assert len(actual)==len(source)+1,(name,'row count differs')
        header=actual[0]
        for xml_row,record in zip(actual[1:],source):
            for column,key in header.items():
                expected=record[key]
                if name=='Feature Inventory' and key=='existing_tests':expected=str(len(expected.split(';')))+' linked test files; full list in feature-inventory.csv'
                value=xml_row.get(column,'')
                try: same=math.isclose(float(value),float(expected),rel_tol=1e-12,abs_tol=1e-10)
                except (ValueError,TypeError):same=str(expected)==value
                assert same,(name,key,value,expected)
print(json.dumps({'features':len(features),'modules':len(modules),'register_rows':len(legacy),'exported_numeric_fields':len(parameters),'building_level_rows':len(buildings),'reference_comparison_rows':len(reference),'legal_progression_milestones':6,'training_tiers_completed':5,'scope':'Internal evidence consistency; not external source truth or full parity'}))
