"""Offline regression for client archive integrity and privacy checks."""
import hashlib
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec

spec = spec_from_file_location("verify_client_package", Path(__file__).with_name("verify-client-package.py"))
verifier = module_from_spec(spec)
spec.loader.exec_module(verifier)


class ClientPackageTests(unittest.TestCase):
    def archive(self, folder, extra=None, tamper=False):
        files = {"Game/ThronesOfMyth.exe": b"fixture", "Game/UnityPlayer.dll": b"fixture", "Game/ThronesOfMyth_Data/main.assets": b"fixture", "Start Thrones of Myth Online.cmd": b"start Game\\ThronesOfMyth.exe --thrones-client-only", "CLIENT-ONLY-README.txt": b"Public instructions"}
        files.update(extra or {})
        manifest = {"platform": "windows-client-only-x86_64", "protocol": 17, "commit": "0" * 40, "dirty": False, "files": [{"path": n, "sha256": hashlib.sha256(v).hexdigest()} for n, v in files.items()]}
        if tamper:
            files["Game/ThronesOfMyth.exe"] = b"changed"
        path = Path(folder) / "client.zip"
        with zipfile.ZipFile(path, "w") as archive:
            for name, data in files.items():
                archive.writestr(name, data)
            archive.writestr("manifest.json", json.dumps(manifest))
        return path

    def test_exact_hashes_and_corruption(self):
        with tempfile.TemporaryDirectory() as folder:
            self.assertEqual(verifier.verify(self.archive(folder))["files"], 5)
            with self.assertRaisesRegex(ValueError, "hash mismatch"):
                verifier.verify(self.archive(folder, tamper=True))

    def test_private_server_data_and_path_escape(self):
        with tempfile.TemporaryDirectory() as folder:
            for name in ["Server/index.mjs", "Runtime/node.exe", "Game/world.json", "Game/kingdom.sqlite", "Game/research.xlsx", "../outside.txt", "/absolute.txt"]:
                with self.subTest(name=name), self.assertRaises(ValueError):
                    verifier.verify(self.archive(folder, {name: b"private"}))


if __name__ == "__main__":
    unittest.main()
