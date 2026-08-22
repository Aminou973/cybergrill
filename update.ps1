# =============================================================================
# CyberGrill -- apply an update zip and push it, in one command.
#
#   .\update.ps1 -From C:\Users\oaak2\Downloads\cybergrill_5
#
# Handles every way this has gone wrong before:
#   * .git deleted by extracting over the folder  -> re-inits and re-attaches
#   * a nested cybergrill\cybergrill folder       -> finds the real source
#   * local commits diverged from GitHub          -> resets to remote first
#   * the Action's commits you don't have         -> pulled before you push
#   * a force-push not triggering the workflow    -> dispatches it explicitly
#
# It never merges. Your local folder is replaced by the update, so there is
# nothing to resolve by hand.
# =============================================================================
param(
  [Parameter(Mandatory = $true)][string]$From,
  [string]$To = "",
  [string]$Repo = "https://github.com/Aminou973/cybergrill.git",
  [string]$Branch = "main",
  [string]$Message = ""
)
$ErrorActionPreference = "Stop"
function Say($t, $c = "Cyan") { Write-Host "-> $t" -ForegroundColor $c }
function Die($t) { Write-Host "X  $t" -ForegroundColor Red; exit 1 }

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Die "git is not installed." }

# --- find the real source folder ------------------------------------------------
if (-not (Test-Path $From)) { Die "$From does not exist." }
$src = (Resolve-Path $From).Path
if (-not (Test-Path (Join-Path $src "index.html"))) {
  $inner = Join-Path $src "cybergrill"
  if (Test-Path (Join-Path $inner "index.html")) {
    $src = $inner
    Say "using the nested folder: $src"
  } else {
    Die "no index.html in $From (nor in a cybergrill subfolder). Is that the extracted update?"
  }
}
Say "source: $src"

# The target is where you are standing, NOT where this script lives -- it is
# normally run from the freshly extracted copy, which must never be the target.
if ($To) { $dest = (Resolve-Path $To).Path } else { $dest = (Get-Location).Path }
if ($dest -eq $src) { Die "source and target are the same folder. cd into your repo first, or pass -To <repo folder>." }
Say "target: $dest"
Set-Location $dest

# --- make sure this is a git repo pointing at the right remote ------------------
if (-not (Test-Path (Join-Path $dest ".git"))) {
  Say "no .git here -- re-attaching to GitHub" "Yellow"
  git init -q
  git branch -M $Branch
  git remote add origin $Repo
} else {
  git remote get-url origin *>$null
  if ($LASTEXITCODE -ne 0) { git remote add origin $Repo }
}

# --- abandon any half-finished merge or rebase ----------------------------------
git rebase --abort *>$null
git merge --abort  *>$null

# --- match GitHub exactly, discarding local mess --------------------------------
Say "fetching GitHub"
git fetch origin $Branch
if ($LASTEXITCODE -ne 0) { Die "could not reach GitHub. Check your connection or sign in with: gh auth login" }

Say "resetting to origin/$Branch (local changes are discarded on purpose)"
git checkout -B $Branch "origin/$Branch" 2>$null | Out-Null
git reset --hard "origin/$Branch" | Out-Null

# --- copy the update over -------------------------------------------------------
Say "copying the update in"
Copy-Item -Path (Join-Path $src "*") -Destination $dest -Recurse -Force

# Windows tags anything that came out of a downloaded zip, and RemoteSigned
# then refuses to run it. Clear the tag on what we just copied in so the next
# update runs without anyone having to think about it.
Say "clearing the downloaded-file tag"
Get-ChildItem -Path $dest -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue

# stray nested folder from an earlier bad extract
if (Test-Path (Join-Path $dest "cybergrill")) {
  Say "removing a stray nested cybergrill folder" "Yellow"
  Remove-Item -Path (Join-Path $dest "cybergrill") -Recurse -Force
}

# --- sanity check ---------------------------------------------------------------
if (Get-Command node -ErrorAction SilentlyContinue) {
  Say "validating the night files"
  node scripts/build.mjs --check
  if ($LASTEXITCODE -ne 0) { Die "the night files did not validate -- nothing was pushed." }
} else {
  Say "node not installed, skipping local validation (the Action will still check)" "DarkGray"
}

# --- commit and push ------------------------------------------------------------
git add -A
git diff --staged --quiet
if ($LASTEXITCODE -eq 0) {
  Say "nothing changed -- GitHub already has this version" "Yellow"
} else {
  if (-not $Message) {
    $n = (git diff --staged --name-only | Measure-Object).Count
    $Message = "update: $n files"
  }
  Say "committing: $Message"
  git commit -qm $Message
  Say "pushing"
  git push origin $Branch
  if ($LASTEXITCODE -ne 0) { Die "push failed. Run 'gh auth login' (or 'git push origin $Branch') and try again." }
}

# --- make sure the site actually rebuilds ---------------------------------------
if (Get-Command gh -ErrorAction SilentlyContinue) {
  Say "starting the publish workflow"
  gh workflow run publish.yml *>$null
  if ($LASTEXITCODE -eq 0) { Say "watch it with:  gh run watch" "DarkGray" }
} else {
  Say "gh not installed -- start it by hand at Actions -> publish -> Run workflow" "Yellow"
}

Write-Host ""
Say "done" "Green"
Write-Host "   dashboard  https://aminou973.github.io/cybergrill/?v=$(Get-Random -Maximum 99999)"
Write-Host "   uno table  https://aminou973.github.io/cybergrill/game/"
Write-Host ""
Write-Host "   Give the Action a minute, then open the dashboard link above." -ForegroundColor DarkGray
Write-Host "   The ?v= number is a cache-buster so you never see a stale page." -ForegroundColor DarkGray
