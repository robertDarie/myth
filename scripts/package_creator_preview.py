"""Assemble an explicitly allowlisted creator overlay on a clean full Unity package."""
import argparse, hashlib, html, json, shutil, subprocess, zipfile
from datetime import datetime, timezone
from pathlib import Path

REPO=Path(__file__).resolve().parents[1]
DOCS=['START_HERE.txt','CREATOR_FEEDBACK.md','KNOWN_LIMITATIONS.md']
IMAGES={
 'civilization-armies.png':('docs/art/civilization-armies-0.17.png','Earlier original culture/unit asset-review contact sheet; not a current gameplay screenshot.'),
 'structures.png':('docs/art/stylized-assets-0.16.png','Earlier original structure/creature asset-review sheet; prototype scale/materials.'),
 'greek-army.png':('docs/art/greek-army-0.17.png','Earlier Greek army asset-review render; not fresh progression proof.'),
 'commander-paintings.png':('client/Assets/ThronesOfMyth/Resources/Art/CommanderAtlas.png','Original AI-generated painted commander reference atlas, eleven roster identities plus one reserved vignette; not eleven finished3D models.'),
 'native-city.jpg':('docs/qa/evidence/recovery-a-native/01-fresh-greek-city.jpg','Actual native fresh Greek QA city, baseline f6cb144.'),
 'native-pass.jpg':('docs/qa/evidence/recovery-a-native/36-final-pass-card-native.jpg','Actual74185be native captured pass/card; prerequisites were separately prepared with production commands.'),
 'native-combat.jpg':('docs/qa/evidence/recovery-a-native/30-native-rally-world-combat.jpg','Actual645e0df native pass rally combat after explicitly scripted prerequisite setup; not a new-player10-minute promise.')}
AUDIO=['Footstep','HorseHoof','BowRelease','MetalImpact','DivineCast','CityAmbience','RallyCharge','RallyRelease','RenewalChime','HuntressFlight','CrescentImpact']
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def public_paths():
 return set(DOCS+['CreatorLauncher.cjs','START THRONES OF MYTH.cmd','CREATOR_PACK/index.html','CREATOR_PACK/PRODUCTION_BRIEF.md','CREATOR_PACK/rosters.json']+['CREATOR_PACK/Images/'+n for n in IMAGES]+['CREATOR_PACK/Audio/'+n+'.wav' for n in AUDIO])
def assemble(base,output,archive,require_head=True):
 base=Path(base).resolve();output=Path(output).resolve();archive=Path(archive).resolve()
 dist=(REPO/'dist').resolve()
 if dist not in output.parents or archive.parent!=dist:raise ValueError('Creator outputs must remain inside dist')
 if output.exists() or archive.exists():raise ValueError('Preserve existing releases: choose a new output name')
 m=json.loads((base/'manifest.json').read_text(encoding='utf-8-sig'))
 if m.get('dirty') is not False or m.get('platform')!='windows-x86_64' or m.get('protocol')!=17:raise ValueError('Clean full Windows package required')
 if require_head:
  head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip()
  clean=subprocess.check_output(['git','status','--porcelain','--untracked-files=normal'],cwd=REPO,text=True).strip()
  if clean or m['commit']!=head:raise ValueError('Build from the current clean published source first')
 for f in m['files']:
  p=(base/f['path']).resolve()
  if base not in p.parents or digest(p)!=f['sha256']:raise ValueError('Base package integrity failed')
 # Runtime only: never recursively copy repository/work/save directories.
 for f in m['files']:
  if f['path'] in ['Launcher.ps1','Start Thrones of Myth.cmd','README.txt']:continue
  if not f['path'].startswith(('Game/','Runtime/','Server/')):raise ValueError('Unexpected base package payload')
  target=output/f['path'];target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(base/f['path'],target)
 for name in DOCS+['CreatorLauncher.cjs','START THRONES OF MYTH.cmd']:
  shutil.copyfile(REPO/'packaging/creator'/name,output/name)
 pack=output/'CREATOR_PACK';pack.mkdir()
 for name in ['PRODUCTION_BRIEF.md','rosters.json']:shutil.copyfile(REPO/'packaging/creator'/name,pack/name)
 sections=[]
 for name,(source,caption) in IMAGES.items():
  target=pack/'Images'/name;target.parent.mkdir(exist_ok=True);shutil.copyfile(REPO/source,target)
  sections.append('<figure><a href="Images/'+name+'"><img loading="lazy" src="Images/'+name+'" alt="'+html.escape(caption)+'"></a><figcaption>'+html.escape(caption)+'</figcaption></figure>')
 for name in AUDIO:
  target=pack/'Audio'/(name+'.wav');target.parent.mkdir(exist_ok=True);shutil.copyfile(REPO/'client/Assets/ThronesOfMyth/Resources/Audio'/(name+'.wav'),target)
 roster=json.loads((pack/'rosters.json').read_text())
 lists=''.join('<section><h2>'+html.escape(key.title())+'</h2><ul>'+''.join('<li>'+html.escape(x['name']+(' — '+x['mythic'] if 'mythic'in x else ''))+'</li>'for x in items)+'</ul></section>'for key,items in roster.items())
 page='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thrones of Myth • Creator Pack</title><style>body{background:#132731;color:#efe5ce;font:18px/1.6 system-ui;margin:2rem auto;max-width:1100px;padding:0 1rem}a{color:#f1cd75}img{max-width:100%;height:auto}figure{margin:2rem 0;padding:1rem;background:#203741}figcaption{font-size:.9rem}audio{display:block;max-width:100%}h1,h2{color:#f1cd75}</style><h1>Thrones of Myth — private creator pack</h1><p>Read-only offline references. No scripts, server calls, gameplay authority, unlocks or save access. Work in progress; original art only. Version '+html.escape(m['version'])+' / source '+m['commit']+'.</p><p><a href="../START_HERE.txt">Start here</a> · <a href="../CREATOR_FEEDBACK.md">10–15-minute tour / feedback</a> · <a href="PRODUCTION_BRIEF.md">Proposed production brief</a> · <a href="../KNOWN_LIMITATIONS.md">Limitations / absent supplied files</a></p><h2>Existing original placeholders and native references</h2>'+''.join(sections)+'<h2>Existing original synthesized effects — not a finished soundtrack</h2>'+''.join('<p>'+name+'<audio controls preload="none" src="Audio/'+name+'.wav"></audio></p>'for name in AUDIO)+lists+'</html>'
 (pack/'index.html').write_text(page,encoding='utf-8')
 m.update(creatorPreview=True,builtAtUtc=datetime.now(timezone.utc).isoformat(),creatorPack='Offline static references; no gameplay grants',missingSuppliedDocuments=['Thrones_of_Myth_Creator_Asset_Tracker.xlsx','Thrones_of_Myth_Creator_Brief.md'])
 m['files']=[dict(path=p.relative_to(output).as_posix(),sha256=digest(p)) for p in sorted(output.rglob('*')) if p.is_file()]
 canonical=''.join(f['path']+'\0'+f['sha256']+'\n'for f in m['files']if f['path'].startswith('Server/'))
 if hashlib.sha256(canonical.encode()).hexdigest()!=m['serverDigest']:raise ValueError('Creator overlay must not alter the matching server')
 (output/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6)as z:
  for p in sorted(output.rglob('*')):
   if p.is_file():z.write(p,p.relative_to(output).as_posix())
 return dict(zip=str(archive),bytes=archive.stat().st_size,sha256=digest(archive),commit=m['commit'],files=len(m['files']))
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--base',required=True);a.add_argument('--output',required=True);a.add_argument('--zip',required=True);args=a.parse_args()
 print(json.dumps(assemble(args.base,args.output,args.zip)))
