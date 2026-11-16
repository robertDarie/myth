"""Prepare typed authoring inputs from canonical audit CSVs; no XLSX authoring."""
import csv
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'research/parity/audits/full-rok-audit'
tables=[]
for sheet,name,columns,numeric in [
 ('Feature Inventory','feature-inventory.csv',['feature_id','subsystem','behavior','parity','gap','authoritative_paths','reference_url','existing_tests'],[]),
 ('Building Reference','building-reference.csv',['building','level','food','wood','stone','gold','base_seconds','reference_class','source_url','reference_build','limitations'],['level','food','wood','stone','gold','base_seconds']),
 ('Reference Differences','reference-level-comparison.csv',['audit_id','parameter','level','rok_value','tom_value','absolute_difference','percentage_difference','parity','source_url','limitation'],['level','rok_value','tom_value','absolute_difference','percentage_difference']),
 ('Exported Parameters','exported-parameters.csv',['parameter_id','tom_value','profile','reference_class','code_path','unit'],['tom_value']),
 ('Register Reconciliation','coverage-reconciliation.csv',['requirement_id','source_sheet','feature','disposition','existing_source_links','historical_claim'],[]),
 ('Formula Index','formula-index.csv',['formula_id','symbol','code_path','reference_class','status'],[]),
]:
 rows=list(csv.DictReader((DATA/name).open(encoding='utf-8-sig',newline='')))
 if sheet=='Feature Inventory':
  for row in rows: row['existing_tests']=str(len(row['existing_tests'].split(';')))+' linked test files; full list in feature-inventory.csv'
 tables.append({'sheet':sheet,'columns':columns,'rows':[[float(row[key]) if key in numeric and row[key]!='' else row[key] if row[key]!='' else None for key in columns] for row in rows]})
progress=json.loads((DATA/'progression-results.json').read_text(encoding='utf-8'))
columns=['label','clock','seconds','cityLevel','trainedReserves','commanderXP','kills','restart']
tables.append({'sheet':'Legal Progression','columns':columns,'rows':[[row[key] for key in columns] for row in progress['milestones']]})
(ROOT/'work/task3').mkdir(parents=True,exist_ok=True)
(ROOT/'work/task3/workbook-data.json').write_text(json.dumps(tables),encoding='utf-8')
