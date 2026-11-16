"""Read-only full Windows ZIP payload/hash/privacy verification; never starts a save."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path, PurePosixPath


def verify(path):
    with zipfile.ZipFile(path) as archive:
        names = [name for name in archive.namelist() if not name.endswith('/')]
        if len({n.casefold() for n in names}) != len(names):
            raise ValueError('Duplicate Windows package paths')
        for name in names:
            p = PurePosixPath(name)
            if p.is_absolute() or '..' in p.parts or '\\' in name or ':' in name:
                raise ValueError('Unsafe package path')
            if p.parts[0] not in {'Game', 'Server', 'Runtime', 'Launcher.ps1', 'Start Thrones of Myth.cmd', 'README.txt', 'manifest.json'}:
                raise ValueError('Unexpected package content')
            if p.name.lower() in {'world.json', 'credentials.json', 'secrets.json'} or p.name.lower().endswith(('.sqlite', '.sqlite-wal', '.sqlite-shm', '.pem')) or p.name.lower().startswith('.env') or 'saves' in [x.lower() for x in p.parts]:
                raise ValueError('Private data in package')
        required = {'manifest.json', 'Game/ThronesOfMyth.exe', 'Game/UnityPlayer.dll', 'Runtime/node.exe', 'Runtime/LICENSE', 'Server/index.mjs', 'Launcher.ps1', 'Start Thrones of Myth.cmd'}
        if not required.issubset(names):
            raise ValueError('Incomplete Windows package')
        manifest = json.loads(archive.read('manifest.json'))
        if manifest['platform'] != 'windows-x86_64' or manifest['protocol'] != 17 or manifest['dirty'] is not False:
            raise ValueError('Wrong or dirty build identity')
        files = manifest['files']
        if len({f['path'] for f in files}) != len(files) or {f['path'] for f in files} != set(names) - {'manifest.json'}:
            raise ValueError('Manifest inventory mismatch')
        for item in files:
            if hashlib.sha256(archive.read(item['path'])).hexdigest() != item['sha256']:
                raise ValueError('Payload hash mismatch: ' + item['path'])
        canonical = ''.join(f["path"] + '\0' + f['sha256'] + '\n' for f in files if f['path'].startswith('Server/'))
        if hashlib.sha256(canonical.encode()).hexdigest() != manifest['serverDigest']:
            raise ValueError('Server digest mismatch')
        return {'commit': manifest['commit'], 'dirty': manifest['dirty'], 'protocol': manifest['protocol'], 'files': len(files), 'zipBytes': Path(path).stat().st_size, 'serverDigest': manifest['serverDigest']}


if __name__ == '__main__':
    print(json.dumps(verify(sys.argv[1] if len(sys.argv) > 1 else 'dist/Thrones-of-Myth-Windows.zip')))
