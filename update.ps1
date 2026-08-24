# =============================================================================
# CyberGrill -- apply an update folder to your repo and push it, in one command.
#
#   .\update.ps1 -From C:\Users\oaak2\Downloads\cybergrill_9
#
# Run it from inside your repo, or pass -To <repo folder>.
#
# Handles every way this has gone wrong before:
#   * PowerShell treating git's ordinary stderr chatter as a fatal error
#   * .git deleted by extracting over the folder  -> re-inits and re-attaches
#   * a nested cybergrill\cybergrill folder       -> finds the real source
#   * local commits diverged from GitHub          -> resets to remote first
#   * no upstream set on the branch               -> sets it on the push
#   * Windows blocking scripts out of a zip       -> unblocks what it copies in
#   * your own config.yml settings                -> kept when an update is blank
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

# git writes perfectly ordinary progress to stderr ("Switched to a new branch",
# "no rebase in progress"). With ErrorActionPreference = Stop, PowerShell turns
# that into a terminating error and the script dies on a message that was never
# a problem. So every git call goes through here: streams merged, nothing
# thrown, exit code handed back for us to judge.
function RunGit {
  $old = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $text = (& git @args 2>&1 | Out-String)
  $code = $LASTEXITCODE
  $ErrorActionPreference = $old
  return [pscustomobject]@{ Code = $code; Text = $text }
}

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
  RunGit init -q            | Out-Null
  RunGit branch -M $Branch  | Out-Null
  RunGit remote add origin $Repo | Out-Null
} elseif ((RunGit remote get-url origin).Code -ne 0) {
  Say "no origin remote -- adding it" "Yellow"
  RunGit remote add origin $Repo | Out-Null
}

# --- abandon any half-finished merge or rebase ----------------------------------
RunGit rebase --abort | Out-Null
RunGit merge --abort  | Out-Null

# --- match GitHub exactly, discarding local mess --------------------------------
Say "fetching GitHub"
$r = RunGit fetch origin $Branch
if ($r.Code -ne 0) {
  Write-Host $r.Text -ForegroundColor DarkGray
  Die "could not reach GitHub. Check your connection, or sign in with: gh auth login"
}

Say "resetting to origin/$Branch (local changes are discarded on purpose)"
RunGit checkout -B $Branch "origin/$Branch" | Out-Null
$r = RunGit reset --hard "origin/$Branch"
if ($r.Code -ne 0) { Write-Host $r.Text -ForegroundColor DarkGray; Die "could not reset to origin/$Branch." }
RunGit branch --set-upstream-to="origin/$Branch" $Branch | Out-Null

# --- settings that live on your side --------------------------------------------
# config.yml gets overwritten like everything else. If the update ships a blank
# where you have a real value (the worker URL, the admin passcode hash), keep
# yours rather than silently wiping it.
$keep = @{}
$cfgDest = Join-Path $dest "config.yml"
$cfgSrc  = Join-Path $src  "config.yml"
if ((Test-Path $cfgDest) -and (Test-Path $cfgSrc)) {
  foreach ($k in @("uno_server", "admin_salt", "admin_hash", "repo_owner", "repo_name")) {
    $pat = "^" + $k + ':\s*"(.*)"'
    $mine   = Select-String -Path $cfgDest -Pattern $pat | Select-Object -First 1
    $theirs = Select-String -Path $cfgSrc  -Pattern $pat | Select-Object -First 1
    if ($mine -and $theirs) {
      $a = $mine.Matches[0].Groups[1].Value
      $b = $theirs.Matches[0].Groups[1].Value
      if ($a -and -not $b) { $keep[$k] = $a }
    }
  }
}

# --- copy the update over -------------------------------------------------------
Say "copying the update in"
Copy-Item -Path (Join-Path $src "*") -Destination $dest -Recurse -Force

if ($keep.Count -gt 0) {
  $lines = Get-Content $cfgDest
  $outLines = foreach ($line in $lines) {
    $m = [regex]::Match($line, '^([a-z_]+):')
    if ($m.Success -and $keep.ContainsKey($m.Groups[1].Value)) {
      $m.Groups[1].Value + ': "' + $keep[$m.Groups[1].Value] + '"'
    } else { $line }
  }
  $outLines | Set-Content $cfgDest -Encoding UTF8
  Say ("kept your own " + (($keep.Keys | Sort-Object) -join ", ") + " in config.yml") "Yellow"
}

# Windows tags anything that came out of a downloaded zip, and RemoteSigned then
# refuses to run it. Clear the tag on what we just copied in so the next update
# runs without anyone having to think about it.
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
RunGit add -A | Out-Null
$staged = RunGit diff --staged --quiet
if ($staged.Code -eq 0) {
  Say "nothing changed -- GitHub already has this version" "Yellow"
} else {
  if (-not $Message) {
    $n = ((RunGit diff --staged --name-only).Text -split "`n" | Where-Object { $_.Trim() }).Count
    $Message = "update: $n files"
  }
  Say "committing: $Message"
  $r = RunGit commit -qm $Message
  if ($r.Code -ne 0) { Write-Host $r.Text -ForegroundColor DarkGray; Die "the commit failed." }
  Say "pushing"
  $r = RunGit push --set-upstream origin $Branch
  if ($r.Code -ne 0) {
    Write-Host $r.Text -ForegroundColor DarkGray
    Die "push failed. Sign in with 'gh auth login' and run this again."
  }
}

# --- make sure the site actually rebuilds ---------------------------------------
if (Get-Command gh -ErrorAction SilentlyContinue) {
  Say "starting the publish workflow"
  $old = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  & gh workflow run publish.yml 2>&1 | Out-Null
  $ok = ($LASTEXITCODE -eq 0)
  $ErrorActionPreference = $old
  if ($ok) { Say "watch it with:  gh run watch" "DarkGray" }
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