# AI loop pilot

The stop hook is inactive until you start it. Live OpenAI calls are disabled. A ChatGPT subscription does not pay for API usage, and this pilot must not spend extra money. Review stays local until you explicitly approve a paid API.

Functional gameplay from the workbooks comes before custom 3D. Visual production stays deferred.

The original identity rule in `.cursor/rules/original-identity.mdc` is unchanged.

## Start

```powershell
$env:OPENAI_API_KEY = "your key stays in this shell"
python .ai-loop/loop.py start
```

Finish a task by writing `.ai-loop/handoff.md`. When the agent stops, the hook reads that file, the git diff, and the roadmap. FIX and NEXT become the next prompt. STOP ends the turn. Three follow-ups is the cap.

## Pause

```powershell
python .ai-loop/loop.py pause
```

## Resume

```powershell
python .ai-loop/loop.py resume
```

## Status

```powershell
python .ai-loop/loop.py status
```

`api_key_set` is true or false. The key itself is not printed.

## Offline check

```powershell
python .ai-loop/tests/test_hook_offline.py
```

A live review is a separate step. Do not treat a green offline test as proof that OpenAI answered.
