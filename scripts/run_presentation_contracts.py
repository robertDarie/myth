"""Run the presentation contracts with a .NET SDK, including Unity's bundled SDK."""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sdk_candidates():
    found = []
    for key in ("ProgramFiles", "ProgramFiles(x86)"):
        root = os.environ.get(key)
        if not root:
            continue
        hub = Path(root) / "Unity" / "Hub" / "Editor"
        if hub.is_dir():
            found.extend(hub.glob("*/Editor/Data/DotNetSdk/dotnet.exe"))
    path_dotnet = "dotnet"
    return found, path_dotnet


def can_build(dotnet):
    try:
        completed = subprocess.run(
            [str(dotnet), "--list-sdks"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return False
    return completed.returncode == 0 and bool(completed.stdout.strip())


def main():
    bundled, path_dotnet = sdk_candidates()
    chosen = next((item for item in bundled if can_build(item)), None)
    if chosen is None and can_build(path_dotnet):
        chosen = path_dotnet
    if chosen is None:
        print("No .NET SDK was found. Presentation contracts were not run.", file=sys.stderr)
        return 1
    completed = subprocess.run(
        [str(chosen), "run", "--project", "tests/PresentationContracts", "-c", "Release"],
        cwd=ROOT,
        check=False,
    )
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
