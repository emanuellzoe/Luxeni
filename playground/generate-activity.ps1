<#
.SYNOPSIS
  Bangun demo "utility CSS" bertahap: banyak branch -> PR -> merge.
  Default: 20 PR x 5 commit = 100 commit, auto-merge ke base branch.

.NOTES
  Semua perubahan dikurung di folder playground/. Tidak menyentuh kode lain.
#>
[CmdletBinding()]
param(
  [int]$PRCount = 20,
  [int]$CommitsPerPR = 5,
  [string]$BaseBranch = "main",
  [switch]$NoMerge
)

$ErrorActionPreference = 'Stop'

# resolve real executables (hindari nama fungsi bentrok)
$GitExe = (Get-Command git.exe -CommandType Application | Select-Object -First 1).Source
$GhExe  = (Get-Command gh.exe  -CommandType Application | Select-Object -First 1).Source

function RunGit {
  param([Parameter(ValueFromRemainingArguments = $true)]$a)
  & $GitExe @a
  if ($LASTEXITCODE -ne 0) { throw "git $($a -join ' ') -> exit $LASTEXITCODE" }
}
function RunGh {
  param([Parameter(ValueFromRemainingArguments = $true)]$a)
  $out = & $GhExe @a
  if ($LASTEXITCODE -ne 0) { throw "gh $($a -join ' ') -> exit $LASTEXITCODE" }
  return $out
}

$palette = @('#2563eb','#16a34a','#dc2626','#d97706','#7c3aed','#0891b2','#db2777','#65a30d','#ea580c','#0d9488')

# folder playground (relatif ke root repo)
$repoRoot = (& $GitExe rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0) { throw "bukan di dalam repo git" }
Set-Location $repoRoot
$dir = Join-Path $repoRoot 'playground'

function Ensure-Files {
  if (-not (Test-Path (Join-Path $dir 'styles.css'))) {
    Set-Content -Path (Join-Path $dir 'styles.css') -Value "/* utility classes - generated incrementally */" -Encoding utf8
  }
  if (-not (Test-Path (Join-Path $dir 'CHANGELOG.md'))) {
    Set-Content -Path (Join-Path $dir 'CHANGELOG.md') -Value "# Changelog" -Encoding utf8
  }
  if (-not (Test-Path (Join-Path $dir 'index.html'))) {
    $html = "<!doctype html>`n<html><head><meta charset=`"utf-8`"><link rel=`"stylesheet`" href=`"styles.css`"></head>`n<body>`n<!-- boxes -->`n</body></html>"
    Set-Content -Path (Join-Path $dir 'index.html') -Value $html -Encoding utf8
  }
}

function Add-Utility {
  param([int]$c)
  Ensure-Files
  $color = $palette[($c - 1) % $palette.Count]
  $css = ".u-$c { padding: ${c}px; border-radius: 4px; background: $color; color: #fff; }"
  Add-Content -Path (Join-Path $dir 'styles.css')   -Value $css -Encoding utf8
  Add-Content -Path (Join-Path $dir 'CHANGELOG.md') -Value "- u-${c}: add utility (bg $color, pad ${c}px)" -Encoding utf8
  Add-Content -Path (Join-Path $dir 'index.html')   -Value "<div class=`"u-$c`">box u-$c</div>" -Encoding utf8
}

# ---- run ----
$runId = Get-Date -Format "yyyyMMdd-HHmmss"
Write-Host "run id: $runId | $PRCount PR x $CommitsPerPR commit = $($PRCount * $CommitsPerPR) commit | merge: $(-not $NoMerge)"

$counter = 0
for ($i = 1; $i -le $PRCount; $i++) {
  $branch = "playground/$runId-pr{0:D2}" -f $i

  RunGit checkout $BaseBranch
  RunGit pull --ff-only origin $BaseBranch
  RunGit checkout -b $branch

  $utils = @()
  for ($j = 1; $j -le $CommitsPerPR; $j++) {
    $counter++
    Add-Utility -c $counter
    RunGit add playground
    RunGit commit -m "playground: add utility u-$counter (PR $i, commit $j)"
    $utils += "u-$counter"
  }

  RunGit push -u origin $branch

  $title = "Playground activity batch $i (run $runId)"
  $body  = "Auto-generated incremental utilities: $($utils -join ', '). Folder: playground/ only."
  $prUrl = (RunGh pr create --base $BaseBranch --head $branch --title $title --body $body | Select-String 'https://github.com').Matches.Value | Select-Object -Last 1
  Write-Host "  PR $i -> $prUrl"

  RunGit checkout $BaseBranch
  if (-not $NoMerge) {
    RunGh pr merge $prUrl --merge --delete-branch | Out-Null
    RunGit pull --ff-only origin $BaseBranch
    Write-Host "  merged + branch deleted"
  }
}

Write-Host "DONE: $counter commit, $PRCount PR"
