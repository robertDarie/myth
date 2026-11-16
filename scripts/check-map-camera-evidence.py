"""Verify real Unity geometry evidence and bind it to the tested math sources.

This is not a native input/rendering certification. Rerun CameraReview when the
bound camera/minimap math changes; unrelated gameplay/docs do not require it.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'docs/qa/evidence/recovery/map-camera.json').read_text(encoding='utf-8'))
assert data['unityVersion'] == '6000.3.0f1'
assert data['geometry']['success'] and not data['geometry']['errors']
assert data['geometry']['checks'] >= 13774
assert data['cursor']['success'] and data['cursor']['blockedScrollPreserved']
assert data['cursor']['drift'] <= .002
assert data['nativeInputVerdict'] == 'NOT TESTED'
for path, expected in data['sourceSha256'].items():
    assert path in {
        'client/Assets/ThronesOfMyth/Scripts/StrategyCamera.cs',
        'client/Assets/ThronesOfMyth/Scripts/CameraFootprint.cs',
        'client/Assets/ThronesOfMyth/Scripts/MinimapGeometry.cs',
    }
    # Git may check C# out with CRLF on Windows; hash normalized source text.
    actual = hashlib.sha256((ROOT / path).read_text(encoding='utf-8-sig').encode('utf-8')).hexdigest()
    assert actual == expected, path + ': rerun real Unity geometry acceptance'
assert len(data['sourceSha256']) == 3
print('PASS source-bound Unity geometry evidence; native input/rendering remain NOT TESTED.')
