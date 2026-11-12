# Publish every verified task

This repository publishes completed gameplay to `origin/main`. The rule is `.cursor/rules/publish-every-task.mdc` with `alwaysApply: true`.

## What is installed

- `.cursor/rules/publish-every-task.mdc` tells the agent to implement, test, update coverage, commit, push, and report.
- `.cursor/hooks/publish_guard.py` is a stop hook. It prints a follow-up only when `.cursor/publish-pending` exists. It does not push and does not call a model.
- `scripts/publish_task.py` runs `scripts/publish-tests.json` and then fast-forwards `origin/main`.
- The existing stop hook stays in `.cursor/hooks.json`. The publish reminder is a second stop command.

## Before the first real push

Run the offline checks:

```text
python -X utf8 scripts/test_publish_offline.py
```

Those checks use temporary repositories. They do not contact GitHub.

## After a task passes

```text
python -X utf8 scripts/publish_task.py
python -X utf8 scripts/publish_task.py --push
```

The first command only runs the test plan. `--push` runs it again and pushes `main` when `origin/main` is a fast-forward ancestor. A failed test, a feature branch, a diverged remote, a force-push flag, or a private workbook stops the script.

Add a command to `scripts/publish-tests.json` when a new gameplay system needs a regression test.

Keep the two original Excel research workbooks untracked. Do not commit credentials, `.env` files, kingdom saves, or SQLite databases.
