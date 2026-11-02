"""Classify a GitHub issue and apply one existing or newly-created label."""
import json
import os
import sys
import urllib.error
import urllib.request


LABELS = {
    "bug": ("bug", "error", "broken", "crash", "doesn't work", "does not work"),
    "enhancement": ("feature", "improve", "add", "support", "would be useful"),
    "question": ("how do", "how can", "why does", "question", "help me"),
    "documentation": ("docs", "documentation", "readme", "typo", "example"),
}
COLORS = {"bug": "d73a4a", "enhancement": "a2eeef", "question": "d876e3", "documentation": "0075ca"}


def classify(title, body):
    content = f"{title}\n{body}".casefold()
    scores = {label: sum(content.count(phrase) for phrase in phrases) for label, phrases in LABELS.items()}
    winner = max(scores, key=scores.get)
    return winner if scores[winner] else None


def github_request(path, token, method="GET", payload=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"https://api.github.com{path}",
        data=body,
        method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "issue-sorter-portfolio-demo",
            **({"Content-Type": "application/json"} if body else {}),
        },
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        return response.status, response.read()


def main():
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    repository = os.environ.get("GITHUB_REPOSITORY", "")
    if not event_path:
        raise SystemExit("Set GITHUB_EVENT_PATH to a GitHub issue event JSON file.")
    with open(event_path, encoding="utf-8") as event_file:
        event = json.load(event_file)
    issue = event.get("issue", {})
    label = classify(issue.get("title", ""), issue.get("body", "") or "")
    if not label:
        print("No category matched; leaving the issue unchanged.")
        return

    number = issue.get("number")
    if not number or not repository:
        raise SystemExit("The event must include an issue number and GITHUB_REPOSITORY.")
    if os.environ.get("DRY_RUN", "true").casefold() != "false":
        print(f"Dry run: would add the '{label}' label to issue #{number}.")
        return

    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise SystemExit("Set GITHUB_TOKEN in the workflow environment; the token is never read from a file.")
    try:
        github_request(f"/repos/{repository}/labels", token, "POST", {"name": label, "color": COLORS[label]})
    except urllib.error.HTTPError as error:
        if error.code != 422:  # GitHub returns 422 when the label already exists.
            raise
    github_request(f"/repos/{repository}/issues/{number}/labels", token, "POST", {"labels": [label]})
    print(f"Applied the '{label}' label to issue #{number}.")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as error:
        print(f"GitHub API request failed with HTTP {error.code}.", file=sys.stderr)
        raise SystemExit(1)
    except TimeoutError:
        print("GitHub API request timed out.", file=sys.stderr)
        raise SystemExit(1)
