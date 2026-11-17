"""Contract traceability gate; never certifies external facts or full-game coverage."""
import argparse
import csv
import fnmatch
import json
from pathlib import Path
import check_parity

ROOT = Path(__file__).resolve().parents[1]
POLICY = 'ZERO UNAPPROVED MECHANICAL OR NUMERICAL DEVIATIONS'
STATUSES = {'FULLY VERIFIED PARITY', 'PARTIAL PARITY', 'MISMATCH', 'MISSING', 'REFERENCE UNVERIFIED', 'BLOCKED BY DEPENDENCY', 'NOT APPLICABLE ONLY WITH DOCUMENTED PROOF'}
BASE = 'research/parity/'


def rows(root, name):
    with (root / BASE / name).open(encoding='utf-8', newline='') as stream:
        return list(csv.DictReader(stream))


def validate_data(features, numbers):
    ids = set()
    for row in features:
        fid = row.get('feature_id')
        if not fid or fid in ids:
            raise ValueError('Missing/duplicate contract feature ID: ' + str(fid))
        ids.add(fid)
        for field in ['expected_behavior', 'reference_version', 'source_url', 'checked', 'evidence_class', 'tom_implementation', 'parity_status', 'acceptance_scenarios', 'migration_impact', 'deviation_status']:
            if not row.get(field):
                raise ValueError(fid + ': missing ' + field)
        check_parity.checked_date(row['checked'])
        if row['evidence_class'] not in check_parity.LABELS or not row['source_url'].startswith('https://') or row['parity_status'] not in STATUSES:
            raise ValueError(fid + ': invalid source/class/status')
        if row['parity_status'] == 'FULLY VERIFIED PARITY':
            ready(row, numbers)
        if row['parity_status'] == 'NOT APPLICABLE ONLY WITH DOCUMENTED PROOF' and not row.get('not_applicable_proof'):
            raise ValueError(fid + ': absent non-applicability proof')
    refs = set()
    for row in numbers:
        rid = row.get('reference_id')
        if not rid or rid in refs or row.get('feature_id') not in ids:
            raise ValueError('Duplicate/unknown numeric binding: ' + str(rid))
        refs.add(rid)
        if row.get('evidence_class') not in check_parity.LABELS or not row.get('parameter'):
            raise ValueError(rid + ': incomplete numeric evidence')
        if row.get('reference_value') and row['evidence_class'] in {'VERIFIED', 'CORROBORATED'} and not row.get('source_url', '').startswith('https://'):
            raise ValueError(rid + ': supported value requires an exact source URL')
        check_parity.checked_date(row.get('checked'))
        if not row.get('reference_value') and not row.get('uncertainty'):
            raise ValueError(rid + ': missing value needs an explicit uncertainty')
    return ids


def ready(feature, numbers):
    fid = feature['feature_id']
    if feature.get('reference_complete') != 'true' or feature.get('numeric_complete') != 'true' or feature.get('essential_unknowns') or not feature.get('acceptance_checks'):
        raise ValueError(fid + ': essential reference/acceptance prerequisites unresolved')
    if feature['evidence_class'] not in {'VERIFIED', 'CORROBORATED'} or feature.get('deviation_status') != 'NONE':
        raise ValueError(fid + ': unsupported evidence or unapproved deviation')
    if 'UNKNOWN' in feature.get('reference_version', '').upper() or 'UNRESOLVED' in feature.get('reference_mode', '').upper():
        raise ValueError(fid + ': version/mode binding unresolved')
    for row in numbers:
        if row['feature_id'] == fid and row.get('essential') == 'true':
            if row['evidence_class'] not in {'VERIFIED', 'CORROBORATED'} or not row.get('reference_value') or row.get('version_binding', '').startswith('UNKNOWN'):
                raise ValueError(fid + ': essential version-bound number unresolved')


def validate_repo(root=ROOT, require_full=False):
    root = Path(root)
    agents = root / 'AGENTS.md'
    if not agents.exists() or POLICY not in agents.read_text(encoding='utf-8'):
        return {'policy': 'legacy repository; existing research gate applies'}
    features = rows(root, 'ROK_COMPLETE_FEATURE_CONTRACT.csv')
    numbers = rows(root, 'ROK_NUMERICAL_REFERENCE.csv')
    ids = validate_data(features, numbers)
    changed = check_parity.changed_paths(root)
    candidates = {p for p in changed if check_parity.gameplay(p)}
    registry = json.loads((root / check_parity.REGISTRY).read_text(encoding='utf-8'))
    if check_parity.REGISTRY in changed:
        for exemption in registry.get('exemptions', []):
            if exemption.get('kind') in {'bug-fix', 'formatting', 'security', 'infrastructure'} and len(exemption.get('reason', '')) >= 20:
                candidates = {p for p in candidates if not any(fnmatch.fnmatchcase(p, pattern) for pattern in exemption.get('paths', []))}
    scope_path = BASE + 'publication_scope.json'
    scope = json.loads((root / scope_path).read_text(encoding='utf-8'))
    scoped = scope.get('features', [])
    if candidates and scope_path not in changed:
        raise ValueError('Gameplay publication requires an updated publication_scope.json')
    checks = {t['name'] for t in json.loads((root / 'scripts/publish-tests.json').read_text(encoding='utf-8'))['tests']}
    for path in candidates:
        matched = [binding for binding in scoped if any(fnmatch.fnmatchcase(path, pattern) for pattern in binding.get('paths', []))]
        if not matched:
            raise ValueError(path + ': missing reference contract scope')
        for binding in matched:
            fid = binding.get('feature_id')
            if fid not in ids:
                raise ValueError('Unknown scoped feature: ' + str(fid))
            feature = next(f for f in features if f['feature_id'] == fid)
            ready(feature, numbers)
            if any(c not in checks for c in feature['acceptance_checks'].split(';')):
                raise ValueError(fid + ': acceptance check absent from publication plan')
    if require_full:
        status = json.loads((root / BASE / 'ROK_CONTRACT_STATUS.json').read_text(encoding='utf-8'))
        if not status.get('reference_scope_complete'):
            raise ValueError('Full reference denominator UNKNOWN; completeness certification blocked')
        for feature in features:
            ready(feature, numbers)
    return {'discovered_scopes': len(features), 'numeric_rows': len(numbers), 'gameplay_candidates': len(candidates), 'full_parity_certified': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--require-full', action='store_true'); args = parser.parse_args()
    try:
        print(json.dumps(validate_repo(require_full=args.require_full)))
    except (ValueError, KeyError, TypeError, OSError) as error:
        raise SystemExit('RoK contract gate: ' + str(error))
