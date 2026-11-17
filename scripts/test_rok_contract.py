"""Offline failures prove honest unknowns cannot authorize parity publication."""
import copy
import unittest
import tempfile
import shutil
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import check_rok_contract as gate
import publish_task


class ContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.features = gate.rows(gate.ROOT, 'ROK_COMPLETE_FEATURE_CONTRACT.csv')
        cls.numbers = gate.rows(gate.ROOT, 'ROK_NUMERICAL_REFERENCE.csv')

    def test_honest_unknown_inventory(self):
        self.assertEqual(len(gate.validate_data(self.features, self.numbers)), 206)

    def test_required_field(self):
        features = copy.deepcopy(self.features); features[0]['expected_behavior'] = ''
        with self.assertRaisesRegex(ValueError, 'missing expected_behavior'):
            gate.validate_data(features, self.numbers)

    def test_duplicate_numeric_id(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate/unknown'):
            gate.validate_data(self.features, self.numbers + [self.numbers[0]])

    def test_unsupported_certification(self):
        features = copy.deepcopy(self.features); features[0]['parity_status'] = 'FULLY VERIFIED PARITY'
        with self.assertRaisesRegex(ValueError, 'prerequisites unresolved'):
            gate.validate_data(features, self.numbers)

    def test_gameplay_without_updated_scope(self):
        with patch.object(gate.check_parity, 'changed_paths', return_value={'server/world.mjs'}):
            with self.assertRaisesRegex(ValueError, 'updated publication_scope'):
                gate.validate_repo()

    def test_empty_scope_does_not_authorize(self):
        with patch.object(gate, 'load_scope', return_value={'features':[]}), patch.object(gate.check_parity, 'changed_paths', return_value={'server/world.mjs', gate.BASE+'publication_scope.json'}):
            with self.assertRaisesRegex(ValueError, 'missing reference contract scope'):
                gate.validate_repo()

    def test_scoped_unknown_feature_still_blocks(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name in ['AGENTS.md', gate.check_parity.REGISTRY, 'scripts/publish-tests.json', gate.BASE+'ROK_COMPLETE_FEATURE_CONTRACT.csv', gate.BASE+'ROK_NUMERICAL_REFERENCE.csv']:
                target = root / name; target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(gate.ROOT / name, target)
            (root / gate.BASE / 'publication_scope.json').write_text(json.dumps({'features':[{'feature_id':self.features[0]['feature_id'],'paths':['server/world.mjs']}]}), encoding='utf-8')
            with patch.object(gate.check_parity, 'changed_paths', return_value={'server/world.mjs', gate.BASE+'publication_scope.json'}):
                with self.assertRaisesRegex(ValueError, 'prerequisites unresolved'):
                    gate.validate_repo(root)

    def test_unknown_version_cannot_be_certified(self):
        feature = dict(self.features[0], reference_complete='true', numeric_complete='true', essential_unknowns='', acceptance_checks='real test', evidence_class='VERIFIED', deviation_status='NONE')
        with self.assertRaisesRegex(ValueError, 'version/mode binding unresolved'):
            gate.ready(feature, [])

    def test_explained_non_balance_exemption(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            for name in ['AGENTS.md', 'scripts/publish-tests.json', gate.BASE+'ROK_COMPLETE_FEATURE_CONTRACT.csv', gate.BASE+'ROK_NUMERICAL_REFERENCE.csv']:
                target=root/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(gate.ROOT/name,target)
            registry={'features':[], 'exemptions':[{'kind':'bug-fix','paths':['client/Assets/ThronesOfMyth/Scripts/StrategyCamera.cs'],'reason':'Restore documented UI geometry without changing gameplay or balance.'}]}
            (root/gate.check_parity.REGISTRY).write_text(json.dumps(registry),encoding='utf-8')
            (root/gate.BASE/'publication_scope.json').write_text('{"features":[]}',encoding='utf-8')
            with patch.object(gate.check_parity,'changed_paths',return_value={gate.check_parity.REGISTRY,'client/Assets/ThronesOfMyth/Scripts/StrategyCamera.cs'}):
                self.assertEqual(gate.validate_repo(root)['gameplay_candidates'],0)

    def test_full_certification_is_blocked(self):
        with patch.object(gate.check_parity, 'changed_paths', return_value=set()), self.assertRaisesRegex(ValueError, 'denominator UNKNOWN'):
            gate.validate_repo(require_full=True)

    def test_custom_plan_cannot_bypass(self):
        with patch.object(publish_task, 'load_plan', return_value=[]), patch.object(publish_task.check_parity, 'validate_repo', return_value={}), patch.object(gate, 'validate_repo', side_effect=ValueError('contract denied')), patch.object(publish_task, 'run_plan') as run:
            self.assertEqual(publish_task.main(['--plan', 'custom.json']), 2)
            run.assert_not_called()

    def test_numeric_generator_failure_blocks_even_without_gameplay(self):
        with patch.object(gate.check_parity, 'changed_paths', return_value=set()), patch.object(gate.subprocess, 'run', return_value=SimpleNamespace(returncode=1)):
            with self.assertRaisesRegex(ValueError, 'numeric fixtures/local observations differ'):
                gate.validate_repo(run_checks=True)

    def test_scoped_acceptance_executes_independently_of_selected_plan(self):
        name = 'dated cross-feature QA evidence and source identity (not parity certification)'
        feature = dict(self.features[0], reference_complete='true', numeric_complete='true', essential_unknowns='', acceptance_checks=name, evidence_class='VERIFIED', deviation_status='NONE', reference_version='1.1.13.79', reference_mode='home')
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for filename in ['AGENTS.md', gate.check_parity.REGISTRY, 'scripts/publish-tests.json']:
                target = root / filename; target.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(gate.ROOT / filename, target)
            (root / gate.BASE / 'publication_scope.json').write_text(json.dumps({'features':[{'feature_id':feature['feature_id'],'paths':['server/world.mjs']}]}), encoding='utf-8')
            changed = {'server/world.mjs', gate.BASE+'publication_scope.json'}
            with patch.object(gate, 'rows', side_effect=[[feature], []]), patch.object(gate.check_parity, 'changed_paths', return_value=changed), patch.object(gate.subprocess, 'run', return_value=SimpleNamespace(returncode=0)) as run:
                gate.validate_repo(root, run_checks=True)
                self.assertEqual(run.call_count, 2)
                self.assertEqual(run.call_args_list[1].args[0], ['python', '-X', 'utf8', 'scripts/check_final_assessment.py'])

    def compatibility_case(self, *, approval_change=None, metadata_change=None, path='server/world.mjs'):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder); evidence='research/parity/features/test.md'; target=root/evidence;target.parent.mkdir(parents=True)
            quote='Reuse existing rules; clearly mark numerical parity unverified'
            metadata={'status':'IMPLEMENTED','parity':'Partial parity','essential_unknowns':[],'deviations':[{'authority':quote}]}
            metadata.update(metadata_change or {})
            target.write_text('<!-- parity\n'+json.dumps(metadata)+'\n-->\n',encoding='utf-8')
            approval={'status':'OWNER_APPROVED','approved_on':'2026-11-17','authority':'Explicit owner response for this exact scope','owner_decision':quote,'reference_parity':'UNVERIFIED','feature_ids':['TEST'],'paths':['server/world.mjs'],'evidence_document':evidence,'functional_checks':['functional'],'unchanged_numeric_checks':['numeric']}
            approval.update(approval_change or {})
            (root/'approval.json').write_text(json.dumps(approval),encoding='utf-8')
            return gate.approved_compatibility(root,{'feature_id':'TEST','approved_compatibility':'approval.json'},path,{'features':[evidence]},{'functional':[], 'numeric':[]})

    def test_approved_bounded_partial_scope(self):
        self.assertEqual(self.compatibility_case(),{'functional','numeric'})

    def test_approval_cannot_expand_to_other_paths(self):
        with self.assertRaisesRegex(ValueError,'exceeds'):
            self.compatibility_case(path='server/troops.mjs')

    def test_approval_cannot_certify_parity(self):
        with self.assertRaisesRegex(ValueError,'partial scoped evidence'):
            self.compatibility_case(metadata_change={'parity':'Verified parity'})

    def test_approval_needs_actual_owner_decision(self):
        with self.assertRaisesRegex(ValueError,'explicit owner approval'):
            self.compatibility_case(approval_change={'status':'PENDING'})

    def test_approval_needs_unchanged_numeric_checks(self):
        with self.assertRaisesRegex(ValueError,'unchanged-numeric checks'):
            self.compatibility_case(approval_change={'unchanged_numeric_checks':[]})

    def test_approval_does_not_waive_essential_unknowns_in_implemented_scope(self):
        with self.assertRaisesRegex(ValueError,'partial scoped evidence'):
            self.compatibility_case(metadata_change={'essential_unknowns':['essential unresolved requirement']})


if __name__ == '__main__': unittest.main()
