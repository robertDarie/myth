"""Read every ZIP member; require clean identity, complete hashes and public overlay only."""
import hashlib,json,re,sys,zipfile
from pathlib import Path,PurePosixPath
from package_creator_preview import public_paths

def verify(file):
 with zipfile.ZipFile(file)as z:
  names=[n for n in z.namelist()if not n.endswith('/')]
  if len(names)!=len({n.casefold()for n in names}):raise ValueError('Duplicate Windows paths')
  m=json.loads(z.read('manifest.json'))
  if not m.get('creatorPreview')or m.get('dirty')is not False or m.get('platform')!='windows-x86_64'or m.get('protocol')!=17 or not re.fullmatch('[a-f0-9]{40}',m.get('commit','')):raise ValueError('Invalid creator build identity')
  if not m.get('builtAtUtc')or not re.fullmatch(r'\d+\.\d+\.\d+',m.get('version','')):raise ValueError('Missing release version/date')
  files=m['files']
  if len(files)!=len({f['path'].casefold()for f in files})or {f['path']for f in files}!=set(names)-{'manifest.json'}:raise ValueError('Manifest inventory mismatch')
  required=public_paths()|{'Game/ThronesOfMyth.exe','Game/UnityPlayer.dll','Runtime/node.exe','Runtime/LICENSE','Server/index.mjs','manifest.json'}
  if not required.issubset(names):raise ValueError('Incomplete creator preview')
  allowed=public_paths()|{'manifest.json'}
  private=re.compile(r'(^|/)(\.git|\.env[^/]*|work|saves?|credentials?[^/]*|secrets?[^/]*|sessions?[^/]*|tokens?[^/]*|world\.json)(/|$)|\.(sqlite(?:-wal|-shm)?|db|pem|key|xlsx|pfx|p12)$',re.I)
  for n in names:
   p=PurePosixPath(n)
   if p.is_absolute()or '..'in p.parts or '\\'in n or ':'in n or private.search(n):raise ValueError('Unsafe/private ZIP member: '+n)
   if n not in allowed:
    if p.parts[0]=='Runtime':
     if n not in {'Runtime/node.exe','Runtime/LICENSE'}:raise ValueError('Unexpected runtime file')
    elif p.parts[0]=='Server':
     if len(p.parts)!=2 or p.suffix not in {'.mjs','.json'}or any(x in p.name for x in ['test','fixture','snapshot']):raise ValueError('Unexpected server payload')
    elif p.parts[0]!='Game':raise ValueError('Unexpected public file: '+n)
   data=z.read(n) # includes every binary, not only text entries
   if n!='manifest.json':
    item=next(f for f in files if f['path']==n)
    if hashlib.sha256(data).hexdigest()!=item['sha256']:raise ValueError('Payload hash mismatch: '+n)
   if p.suffix.lower()in {'.json','.txt','.md','.html','.cjs','.mjs','.cmd'}:
    text=data.decode('utf-8-sig')
    if re.search(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}',text):raise ValueError('Credential pattern in '+n)
    if p.suffix.lower()=='.json'and n!='manifest.json':
     def scan(value):
      if isinstance(value,dict):
       for key,v in value.items():
        if key.lower()in {'password','token','sessiontoken','accesstoken','refreshtoken','joincode','invitationcode','privatekey'}and v:raise ValueError('Private data field in '+n)
        scan(v)
      elif isinstance(value,list):
       for v in value:scan(v)
     scan(json.loads(text))
  canonical=''.join(f['path']+'\0'+f['sha256']+'\n'for f in files if f['path'].startswith('Server/'))
  if hashlib.sha256(canonical.encode()).hexdigest()!=m['serverDigest']:raise ValueError('Server digest mismatch')
  page=z.read('CREATOR_PACK/index.html').decode()
  if re.search(r'<script\b|https?://|fetch\(|XMLHttpRequest|localStorage',page,re.I):raise ValueError('Showcase must be offline and read-only')
  for url in re.findall(r'(?:src|href)="([^"]+)"',page):
   # Only the intentional one-level links to packaged public root docs are allowed.
   target=url[3:]if url.startswith('../')else'CREATOR_PACK/'+url
   if target not in names:raise ValueError('Broken offline showcase link: '+url)
  return dict(commit=m['commit'],version=m['version'],protocol=m['protocol'],files=len(files),bytes=Path(file).stat().st_size,sha256=hashlib.sha256(Path(file).read_bytes()).hexdigest(),privacy='PASS: every member read; runtime/public allowlist, forbidden paths, hashes and credential-pattern checks',limitations='Pattern scans cannot prove absence of every possible secret; only explicitly selected source inputs are packaged')
if __name__=='__main__':print(json.dumps(verify(sys.argv[1])))
