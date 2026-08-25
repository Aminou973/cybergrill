# CyberGrill - create the repo, push it, switch on Pages, run the first build.
# Needs: git and the GitHub CLI (gh).
param([string]$Name = "cybergrill")
$ErrorActionPreference = "Stop"

foreach ($c in @("git","gh")) {
  if (-not (Get-Command $c -ErrorAction SilentlyContinue)) {
    Write-Host "$c is not installed. GitHub CLI: winget install --id GitHub.cli" -ForegroundColor Red; exit 1
  }
}

gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { gh auth login }

$User = gh api user --jq .login
Write-Host "-> pushing to github.com/$User/$Name" -ForegroundColor Cyan

if (-not (Test-Path .git)) { git init -q }
git add -A
git diff --staged --quiet
if ($LASTEXITCODE -ne 0) { git commit -qm "cybergrill" }
git branch -M main

gh repo view "$User/$Name" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  git remote get-url origin 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { git remote add origin "https://github.com/$User/$Name.git" }
  git push -u origin main
} else {
  gh repo create $Name --public --source=. --remote=origin --push
}

Write-Host "-> allowing Actions to push" -ForegroundColor Cyan
gh api -X PUT "repos/$User/$Name/actions/permissions/workflow" -f default_workflow_permissions=write -F can_approve_pull_request_reviews=true | Out-Null

Write-Host "-> enabling Pages" -ForegroundColor Cyan
gh api -X POST "repos/$User/$Name/pages" -f 'build_type=workflow' 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  gh api -X PUT "repos/$User/$Name/pages" -f 'build_type=workflow' 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Host "  (turn Pages on by hand: Settings > Pages > Source: GitHub Actions)" -ForegroundColor Yellow }
}

Write-Host "-> starting the first build" -ForegroundColor Cyan
gh workflow run publish.yml 2>$null | Out-Null

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "  dashboard  https://$User.github.io/$Name/"
Write-Host "  season     https://$User.github.io/$Name/season.html"
Write-Host "  actions    https://github.com/$User/$Name/actions"
