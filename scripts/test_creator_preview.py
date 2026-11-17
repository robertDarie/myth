import hashlib,json,tempfile,unittest,zipfile
from pathlib import Path
from package_creator_preview import public_paths
from verify_creator_preview import verify

class CreatorPrivacyTests(unittest.TestCase):
 def archive(self,root,extra=None,tamper=False,page='<!doctype html><title>Offline</title>'):
  payload={n:b'public synthetic test fixture'for n in public_paths()|{'Game/ThronesOfMyth.exe','Game/UnityPlayer.dll','Runtime/node.exe','Runtime/LICENSE','Server/index.mjs'}}
  payload['CREATOR_PACK/rosters.json']=b'{}';payload['CREATOR_PACK/index.html']=page.encode();payload.update(extra or {})
  files=[dict(path=n,sha256=hashlib.sha256(data).hexdigest())for n,data in sorted(payload.items())]
  canonical=''.join(f['path']+'\0'+f['sha256']+'\n'for f in files if f['path'].startswith('Server/'))
  m=dict(creatorPreview=True,platform='windows-x86_64',protocol=17,version='0.45.0',commit='a'*40,dirty=False,builtAtUtc='2026-11-17T12:00:00Z',serverDigest=hashlib.sha256(canonical.encode()).hexdigest(),files=files)
  if tamper:payload['Server/index.mjs']=b'changed after hashing'
  p=Path(root)/'fixture.zip'
  with zipfile.ZipFile(p,'w')as z:
   for n,data in payload.items():z.writestr(n,data)
   z.writestr('manifest.json',json.dumps(m))
  return p
 def test_public_runtime_and_complete_static_pack(self):
  with tempfile.TemporaryDirectory()as root:self.assertEqual(verify(self.archive(root))['protocol'],17)
 def test_hash_tampering_rejected(self):
  with tempfile.TemporaryDirectory()as root:
   with self.assertRaisesRegex(ValueError,'hash mismatch'):verify(self.archive(root,tamper=True))
 def test_private_paths_rejected_even_with_valid_hashes(self):
  for name in ['.git/config','Server/world.json','Server/credentials.json','Game/.env','Game/save.sqlite','CREATOR_PACK/private.xlsx','../outside','Game/session.json','Game/key.pem']:
   with self.subTest(name=name),tempfile.TemporaryDirectory()as root:
    with self.assertRaises(ValueError):verify(self.archive(root,{name:b'synthetic'}))
 def test_secret_field_and_unknown_document_rejected(self):
  for name,data in [('Server/other.json',b'{"token":"synthetic-private-value"}'),('CREATOR_PACK/internal.md',b'internal notes')]:
   with self.subTest(name=name),tempfile.TemporaryDirectory()as root:
    with self.assertRaises(ValueError):verify(self.archive(root,{name:data}))
 def test_active_remote_and_broken_showcase_links_rejected(self):
  for page in ['<script>anything()</script>','<img src="https://example.com/x">','<a href="missing.png">Missing</a>']:
   with self.subTest(page=page),tempfile.TemporaryDirectory()as root:
    with self.assertRaises(ValueError):verify(self.archive(root,page=page))

if __name__=='__main__':unittest.main()
