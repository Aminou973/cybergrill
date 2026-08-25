#!/usr/bin/env bash
# CyberGrill — create the repo, push it, switch on Pages, run the first build.
# Needs: git and the GitHub CLI (gh).
set -euo pipefail

NAME="${1:-cybergrill}"

command -v git >/dev/null || { echo "git is not installed."; exit 1; }
command -v gh  >/dev/null || { echo "GitHub CLI is not installed — brew install gh"; exit 1; }

gh auth status >/dev/null 2>&1 || gh auth login

USER=$(gh api user --jq .login)
echo "→ pushing to github.com/$USER/$NAME"

[ -d .git ] || git init -q
git add -A
git diff --staged --quiet || git commit -qm "cybergrill"
git branch -M main

if gh repo view "$USER/$NAME" >/dev/null 2>&1; then
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$USER/$NAME.git"
  git push -u origin main
else
  gh repo create "$NAME" --public --source=. --remote=origin --push
fi

echo "→ allowing Actions to push"
gh api -X PUT "repos/$USER/$NAME/actions/permissions/workflow" \
  -f default_workflow_permissions=write -F can_approve_pull_request_reviews=true >/dev/null

echo "→ enabling Pages"
gh api -X POST "repos/$USER/$NAME/pages" -f 'build_type=workflow' >/dev/null 2>&1 \
  || gh api -X PUT "repos/$USER/$NAME/pages" -f 'build_type=workflow' >/dev/null 2>&1 \
  || echo "  (turn Pages on by hand: Settings → Pages → Source: GitHub Actions)"

echo "→ starting the first build"
gh workflow run publish.yml >/dev/null 2>&1 || echo "  (run it from the Actions tab)"

echo
echo "Done."
echo "  dashboard  https://$USER.github.io/$NAME/"
echo "  season     https://$USER.github.io/$NAME/season.html"
echo "  actions    https://github.com/$USER/$NAME/actions"
