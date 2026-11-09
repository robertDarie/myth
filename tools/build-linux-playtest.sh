#!/usr/bin/env bash
set -euo pipefail
thrones_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
thrones_unity="${1:-${THRONES_UNITY_EDITOR:-}}"
if [[ -z "$thrones_unity" || ! -x "$thrones_unity" ]]; then
  echo 'Supply the Unity 6000.3.0f1 executable: tools/build-linux-playtest.sh /path/to/Editor/Unity' >&2
  exit 2
fi
cd -- "$thrones_root"
node --test
if command -v dotnet >/dev/null 2>&1; then
  dotnet run --project tests/PresentationContracts -c Release
else
  echo 'Portable C# contracts PENDING: .NET 8 SDK is not installed.' >&2
fi
mkdir -p work/linux-review
"$thrones_unity" -batchmode -nographics -projectPath "$thrones_root/client" -buildTarget Linux64 -executeMethod ThronesOfMyth.Editor.VisualAcceptanceReview.ValidateHeadless -quit -logFile "$thrones_root/work/linux-review/headless.log"
"$thrones_unity" -batchmode -nographics -projectPath "$thrones_root/client" -buildTarget Linux64 -executeMethod ThronesOfMyth.Editor.LinuxPlaytestBuilder.BuildFromCommandLine -quit -logFile "$thrones_root/work/linux-review/build.log"
node --input-type=module - "$thrones_root" <<'JS'
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
const root=process.argv[2];const {verifyPackage}=await import(pathToFileURL(join(root,'packaging/linux/Launch.mjs')));const stamp=await verifyPackage(join(root,'dist/Linux'));console.log('Verified package payload: '+stamp.version+' '+stamp.commit+(stamp.dirty?' (modified source checkout)':''));
JS
printf '%s\n' 'Linux package built and payload checked. Rendering, animation, audio, native input and FPS still require a real playtest.'
