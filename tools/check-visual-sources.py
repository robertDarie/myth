#!/usr/bin/env python3
"""Non-rendering C#/PowerShell syntax and Unity source/import hygiene checks.
Requires tree-sitter, tree-sitter-c-sharp and tree-sitter-powershell.
"""
from pathlib import Path
import re
from tree_sitter import Language, Parser
import tree_sitter_c_sharp
import tree_sitter_powershell

root = Path(__file__).resolve().parent.parent
languages = [Language(tree_sitter_c_sharp.language()), Language(tree_sitter_powershell.language())]
parsers = [Parser(language) for language in languages]
files = list((root / 'client/Assets').rglob('*.cs'))
ps_files = list((root / 'tools').glob('*.ps1')) + list((root / 'packaging/windows').glob('*.ps1'))
errors, trees, guids = [], [], {}
for path in files + ps_files:
    data = path.read_bytes()
    tree = parsers[0 if path.suffix == '.cs' else 1].parse(data)
    trees.append(tree)  # Retain native tree lifetimes while traversing.
    if tree.root_node.has_error:
        errors.append(f'{path.relative_to(root)}: syntax error')
    if path.suffix != '.cs':
        continue
    if b'using UnityEditor' in data and 'Editor' not in path.parts:
        errors.append(f'{path.name}: Editor dependency in runtime source')
    stack = [tree.root_node]
    while stack:
        node = stack.pop()
        stack.extend(node.children)
        if node.type == 'variable_declaration' and data[node.start_byte:node.start_byte + 4] == b'var ' and sum(child.type == 'variable_declarator' for child in node.named_children) > 1:
            errors.append(f'{path.name}:{node.start_point.row + 1}: multiple var declarators')
    meta = path.with_suffix('.cs.meta')
    match = re.search(r'^guid: ([a-f0-9]{32})$', meta.read_text(), re.M) if meta.exists() else None
    if not match:
        errors.append(f'{path.name}: missing/invalid Unity meta GUID')
    elif match[1] in guids:
        errors.append(f'{path.name}: duplicate GUID with {guids[match[1]]}')
    else:
        guids[match[1]] = path.name
for path in (root / 'client/Assets').rglob('*.fbx'):
    with path.open('rb') as stream:
        if stream.read(80).startswith(b'version https://git-lfs.github.com/spec'):
            errors.append(f'{path.name}: Git LFS pointer instead of imported asset')
print(f'{len(files)} C# files; {len(ps_files)} PowerShell scripts; {len(errors)} issues')
for error in errors:
    print(error)
raise SystemExit(bool(errors))
