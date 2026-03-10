# OpenDeck 卸载脚本 (Windows, 默认非交互)

param(
    [string]$Dir = ""
)

$ErrorActionPreference = "Stop"
if (-not $Dir) {
    $Dir = Join-Path $env:USERPROFILE "deck"
}
if (-not [System.IO.Path]::IsPathRooted($Dir)) {
    $Dir = Join-Path (Get-Location) $Dir
}

if (-not (Test-Path $Dir -PathType Container)) {
    Write-Host "安装目录不存在: $Dir"
    exit 0
}

$installedList = Join-Path $Dir ".installed_skills"
$skillsTargetFile = Join-Path $Dir ".skills_target"
if (Test-Path $skillsTargetFile -PathType Leaf) {
    $skillsTarget = (Get-Content -Path $skillsTargetFile -Raw -Encoding utf8).Trim()
} else {
    $skillsTarget = Join-Path $env:USERPROFILE ".openclaw\workspace\skills"
}

if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    & pm2 delete deck-backend 2>$null | Out-Null
}

if (Test-Path $installedList -PathType Leaf) {
    foreach ($name in Get-Content $installedList) {
        if (-not $name) { continue }
        $target = Join-Path $skillsTarget $name
        if (Test-Path $target -PathType Container) {
            Remove-Item -Path $target -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Remove-Item -Path $Dir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "OpenDeck 已卸载。"
