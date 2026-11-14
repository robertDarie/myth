"""Verify the freshly generated client-only ZIP without extracting it."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path, PurePosixPath


def verify(path):
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if len({n.casefold() for n in names}) != len(names):
            raise ValueError("Duplicate Windows package paths.")
        allowed = {"Game", "manifest.json", "Start Thrones of Myth Online.cmd", "CLIENT-ONLY-README.txt"}
        for name in names:
            p = PurePosixPath(name)
            if p.is_absolute() or ".." in p.parts or "\\" in name or not p.parts or p.parts[0] not in allowed:
                raise ValueError("Unexpected package path: " + name)
            if p.suffix.lower() in {".sqlite", ".xlsx", ".pem"} or p.name.lower() in {"world.json", ".env", "credentials.json", "playerprefs"}:
                raise ValueError("Private data in client package: " + name)
        required = {"Game/ThronesOfMyth.exe", "Game/UnityPlayer.dll", "manifest.json", "Start Thrones of Myth Online.cmd", "CLIENT-ONLY-README.txt"}
        if not required.issubset(names) or not any(n.startswith("Game/ThronesOfMyth_Data/") for n in names):
            raise ValueError("Missing executable, Unity data, identity or instructions.")
        manifest = json.loads(archive.read("manifest.json"))
        if manifest.get("platform") != "windows-client-only-x86_64" or manifest.get("protocol") != 17:
            raise ValueError("Unexpected client platform/protocol.")
        recorded = {f["path"]: f["sha256"] for f in manifest["files"]}
        payloads = {n for n in names if not n.endswith("/") and n != "manifest.json"}
        if set(recorded) != payloads:
            raise ValueError("Manifest does not cover the exact package contents.")
        for name, expected in recorded.items():
            with archive.open(name) as stream:
                if hashlib.file_digest(stream, "sha256").hexdigest() != expected:
                    raise ValueError("Package hash mismatch: " + name)
        launcher = archive.read("Start Thrones of Myth Online.cmd").decode("ascii").lower()
        if "--thrones-client-only" not in launcher or "node" in launcher or "server\\" in launcher:
            raise ValueError("Client launcher must start only the game.")
        return {"files": len(payloads), "commit": manifest["commit"], "dirty": manifest["dirty"], "protocol": manifest["protocol"], "zipBytes": Path(path).stat().st_size}


if __name__ == "__main__":
    try:
        print(json.dumps(verify(sys.argv[1] if len(sys.argv) > 1 else "dist/Thrones-of-Myth-Windows-Client.zip")))
    except (ValueError, KeyError, OSError, zipfile.BadZipFile) as error:
        raise SystemExit(str(error))
