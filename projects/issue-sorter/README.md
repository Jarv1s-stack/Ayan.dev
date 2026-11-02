# Issue Sorter

A small GitHub Actions example that reads a new or edited issue, picks one matching label (`bug`, `enhancement`, `question`, or `documentation`), and applies it with the workflow's short-lived `GITHUB_TOKEN`. It uses only Python's standard library.

## Try it in dry-run mode

```powershell
$env:GITHUB_EVENT_PATH = '.\sample-issue.json'
$env:GITHUB_REPOSITORY = 'owner/repository'
python .\triage.py
```

Dry-run mode is the default. The script prints the suggested label and does not make an API call. To enable writes, set `DRY_RUN=false` and provide `GITHUB_TOKEN` through the workflow secret context. Never paste a token into the source file or a committed `.env` file.

## Enable the workflow

Copy `workflow.example.yml` into `.github/workflows/issue-sorter.yml` in a repository that contains this folder. Review the label rules first. The workflow requests only `issues: write`, and the script leaves issues unchanged when no rule matches.

The rule matching is intentionally easy to edit: add phrases to `LABELS` and, if needed, add a color in `COLORS`.
