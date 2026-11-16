"""Synthetic archive contracts only; no executable or player save is launched."""
import hashlib
import json
import tempfile
import unittest
import zipfile
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

spec = spec_from_file_location('windows_verifier', Path(__file__).with_name('verify-windows-package.py'))
verifier = module_from_spec(spec)
spec.loader.exec_module(verifier)


class WindowsPackageTests(unittest.TestCase):
    def archive(self, root, extra=None, tamper=False):
        names = ['Game/ThronesOfMyth.exe', 'Game/UnityPlayer.dll', 'Runtime/node.exe', 'Runtime/LICENSE', 'Server/index.mjs', 'Launcher.ps1', 'Start Thrones of Myth.cmd']
        contents = {name: b'non-executable synthetic archive fixture' for name in names}
        contents.update(extra or {})
        files = [{'path': n, 'sha256': hashlib.sha256(v).hexdigest()} for n, v in sorted(contents.items())]
        canonical = ''.join(f['path'] + '\0' + f['sha256'] + '\n' for f in files if f['path'].startswith('Server/'))
        manifest = {'platform': 'windows-x86_64', 'protocol': 17, 'commit': '0' * 40, 'dirty': False, 'files': files, 'serverDigest': hashlib.sha256(canonical.encode()).hexdigest()}
        if tamper:
            contents['Server/index.mjs'] = b'tampered'
        path = Path(root) / 'package.zip'
        with zipfile.ZipFile(path, 'w') as archive:
            for name, value in contents.items():
                archive.writestr(name, value)
            archive.writestr('manifest.json', json.dumps(manifest))
        return path

    def test_matching_inventory_and_digest(self):
        with tempfile.TemporaryDirectory() as root:
            self.assertEqual(verifier.verify(self.archive(root))['files'], 7)

    def test_tampered_server_is_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                verifier.verify(self.archive(root, tamper=True))

    def test_private_data_and_traversal_rejected_even_if_manifest_lists_them(self):
        for name in ['../outside', 'Server/world.json', 'Server/credentials.json', 'Game/.env.local', 'Server/save.sqlite']:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as root:
                with self.assertRaises(ValueError):
                    verifier.verify(self.archive(root, {name: b'fixture'}))


if __name__ == '__main__':
    unittest.main()
