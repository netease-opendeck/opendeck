# OpenDeck 安装脚本 (Windows PowerShell, 本地安装后自动启动)

param(
    [string]$Dir = "",
    [string]$Skills = "",
    [switch]$Yes = $false
)

$ErrorActionPreference = "Stop"
$script:HasOpenClaw = $false
$script:ResolvedOpenClawRoot = ""
$script:PKG = ""

# Default behavior: no-arg install is equivalent to -Yes.
if ($PSBoundParameters.Count -eq 0 -and -not $Yes) {
    $Yes = $true
    Write-Host "未提供参数，默认启用非交互模式（等同 -Yes）。"
}

function Resolve-OpenClawRoot {
    if ($script:ResolvedOpenClawRoot) { return $script:ResolvedOpenClawRoot }
    $defaultRoot = Join-Path $env:USERPROFILE ".openclaw"
    if (Test-Path $defaultRoot -PathType Container) {
        $script:ResolvedOpenClawRoot = $defaultRoot
        return $script:ResolvedOpenClawRoot
    }
    if ($Yes) {
        $script:ResolvedOpenClawRoot = $defaultRoot
        Write-Warning "未检测到 $defaultRoot，已按默认值继续。"
        Write-Host "建议显式指定安装目录后重试，例如: .\scripts\install.ps1 -Yes -Dir $env:USERPROFILE\deck -Skills $env:USERPROFILE\.openclaw\workspace\skills"
        return $script:ResolvedOpenClawRoot
    }
    $inputRoot = Read-Host "[openclaw-root] 未找到 $defaultRoot，请输入 OpenClaw 根目录（回车使用默认: $defaultRoot）"
    if ($inputRoot) { $script:ResolvedOpenClawRoot = $inputRoot } else { $script:ResolvedOpenClawRoot = $defaultRoot }
    return $script:ResolvedOpenClawRoot
}

function Ensure-Pm2 {
    if (Get-Command pm2 -ErrorAction SilentlyContinue) { return }
    Write-Host "未检测到 pm2，正在自动安装..."
    if ($script:PKG -eq "pnpm") { & pnpm add -g pm2 } else { & npm install -g pm2 }
    if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
        throw "pm2 安装后仍不可用，请手动安装后重试。"
    }
}

function Cleanup-LegacyDeck {
    if (Get-Command deck -ErrorAction SilentlyContinue) {
        try { & deck remove | Out-Null } catch {}
    }
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath) {
        $parts = $userPath.Split(';') | Where-Object { $_ -and ($_ -notmatch '\\deck$') }
        [Environment]::SetEnvironmentVariable("Path", ($parts -join ';'), "User")
    }
}

function Read-PortFromEnv([string]$BackendEnvPath) {
    if (Test-Path $BackendEnvPath -PathType Leaf) {
        $line = Get-Content $BackendEnvPath | Where-Object { $_ -match '^PORT\s*=' } | Select-Object -First 1
        if ($line) {
            $p = ($line -split '=')[1].Trim()
            if ($p) { return $p }
        }
    }
    return "19520"
}

if (Get-Command openclaw -ErrorAction SilentlyContinue) { $script:HasOpenClaw = $true } else { Write-Warning "未检测到 openclaw，将继续安装，但会跳过 gateway 重启。" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "未找到 node，请先安装 Node.js。" }
if (Get-Command pnpm -ErrorAction SilentlyContinue) { $script:PKG = "pnpm" } elseif (Get-Command npm -ErrorAction SilentlyContinue) { $script:PKG = "npm" } else { throw "未找到 pnpm 或 npm，请先安装。" }

if (-not $Dir) { $Dir = Join-Path $env:USERPROFILE "deck" }
if (-not [System.IO.Path]::IsPathRooted($Dir)) { $Dir = Join-Path (Get-Location) $Dir }
$INSTALL_DIR = $Dir
if (-not $Skills) { $Skills = Join-Path $env:USERPROFILE ".openclaw\workspace\skills" }
$SKILLS_TARGET = $Skills
New-Item -ItemType Directory -Force -Path $SKILLS_TARGET | Out-Null

Cleanup-LegacyDeck

$REPO_ROOT = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not (Test-Path (Join-Path $REPO_ROOT "backend\package.json")) -or -not (Test-Path (Join-Path $REPO_ROOT "app\package.json"))) {
    throw "本地安装模式下必须在 open-deck 仓库内执行脚本。"
}
Write-Host "从本地复制到 $INSTALL_DIR ..."
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
Remove-Item -Path (Join-Path $INSTALL_DIR "backend"), (Join-Path $INSTALL_DIR "app"), (Join-Path $INSTALL_DIR "skills"), (Join-Path $INSTALL_DIR "ecosystem.config.cjs") -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $REPO_ROOT "backend") -Destination $INSTALL_DIR -Recurse -Force
Copy-Item -Path (Join-Path $REPO_ROOT "app") -Destination $INSTALL_DIR -Recurse -Force
if (Test-Path (Join-Path $REPO_ROOT "skills")) { Copy-Item -Path (Join-Path $REPO_ROOT "skills") -Destination $INSTALL_DIR -Recurse -Force } else { New-Item -ItemType Directory -Force -Path (Join-Path $INSTALL_DIR "skills") | Out-Null }
Copy-Item -Path (Join-Path $REPO_ROOT "scripts\ecosystem.config.cjs") -Destination $INSTALL_DIR -Force

$backendDir = Join-Path $INSTALL_DIR "backend"
$backendEnv = Join-Path $backendDir ".env"
$backendExample = Join-Path $backendDir ".env.example"
if (Test-Path $backendDir -PathType Container) {
    $openclawRoot = Resolve-OpenClawRoot
    if (-not (Test-Path $backendEnv -PathType Leaf)) {
        if (Test-Path $backendExample -PathType Leaf) { Copy-Item -Path $backendExample -Destination $backendEnv -Force }
        else { "# OpenClaw 项目根目录`nOPENCLAW_ROOT=$openclawRoot" | Set-Content $backendEnv -Encoding utf8 }
    } else {
        $content = Get-Content -Path $backendEnv -Raw -Encoding utf8
        if ($content -match '^OPENCLAW_ROOT=.*') { $content = $content -replace '^OPENCLAW_ROOT=.*', "OPENCLAW_ROOT=$openclawRoot" }
        else { $content = "$content`nOPENCLAW_ROOT=$openclawRoot`n" }
        Set-Content -Path $backendEnv -Value $content -Encoding utf8
    }
}

$script:PKG | Set-Content (Join-Path $INSTALL_DIR ".deck_pkg") -Encoding utf8 -NoNewline

Ensure-Pm2
Write-Host "正在安装依赖并构建 backend..."
Push-Location (Join-Path $INSTALL_DIR "backend")
& $script:PKG install
& $script:PKG run build
Pop-Location
Write-Host "正在安装依赖并构建 frontend..."
Push-Location (Join-Path $INSTALL_DIR "app")
& $script:PKG install
& $script:PKG run build
Pop-Location

Push-Location $INSTALL_DIR
& pm2 delete deck-backend 2>$null
& pm2 start ecosystem.config.cjs
Pop-Location

$SKILLS_SRC = Join-Path $INSTALL_DIR "skills"
$INSTALLED_LIST = Join-Path $INSTALL_DIR ".installed_skills"
"" | Set-Content $INSTALLED_LIST -Encoding utf8
$SKILLS_TARGET | Set-Content (Join-Path $INSTALL_DIR ".skills_target") -Encoding utf8
if (Test-Path $SKILLS_SRC) {
    foreach ($skillDir in Get-ChildItem -Path $SKILLS_SRC -Directory) {
        $target = Join-Path $SKILLS_TARGET $skillDir.Name
        if (Test-Path $target) { Remove-Item -Path $target -Recurse -Force -ErrorAction SilentlyContinue }
        Copy-Item -Path $skillDir.FullName -Destination $target -Recurse -Force
        Add-Content -Path $INSTALLED_LIST -Value $skillDir.Name
    }
}

$agentsConfigPath = Join-Path $PSScriptRoot "agents-config.json"
if (Test-Path $agentsConfigPath -PathType Leaf) {
    $agentsConfig = Get-Content -Path $agentsConfigPath -Raw -Encoding utf8 | ConvertFrom-Json
    $openclawRoot = Resolve-OpenClawRoot
    if (Test-Path $openclawRoot -PathType Container) {
        $markerStart = if ($agentsConfig.markerStart) { [string]$agentsConfig.markerStart } else { "<!-- OPENDECK_AGENTS_BLOCK_START -->" }
        $markerEnd = if ($agentsConfig.markerEnd) { [string]$agentsConfig.markerEnd } else { "<!-- OPENDECK_AGENTS_BLOCK_END -->" }
        $appendContent = if ($agentsConfig.appendContent) { ([string]$agentsConfig.appendContent).TrimEnd() } else { "" }
        if (-not $appendContent) { $appendContent = "" }
        $keywords = @()
        if ($agentsConfig.duplicateKeywords) {
            foreach ($kw in $agentsConfig.duplicateKeywords) {
                if ($kw) { $keywords += [string]$kw }
            }
        }
        $keywords += $markerStart
        $keywords += $markerEnd
        $keywords = $keywords | Where-Object { $_ -and $_.Trim().Length -gt 0 } | Select-Object -Unique
        $block = "$markerStart`n$appendContent`n$markerEnd`n"

        $agentsFiles = Get-ChildItem -Path $openclawRoot -Filter "AGENTS.md" -Recurse -File -ErrorAction SilentlyContinue
        foreach ($f in $agentsFiles) {
            $content = Get-Content -Path $f.FullName -Raw -ErrorAction SilentlyContinue
            if (-not $content) { $content = "" }
            $hasMarkers = $content.Contains($markerStart) -and $content.Contains($markerEnd)
            if ($hasMarkers) {
                $pattern = [regex]::new([regex]::Escape($markerStart) + "[\s\S]*?" + [regex]::Escape($markerEnd) + "\s*", [System.Text.RegularExpressions.RegexOptions]::Singleline)
                $replaced = $pattern.Replace($content, $block)
                if ($replaced -ne $content) {
                    Set-Content -Path $f.FullName -Value $replaced -Encoding utf8
                }
                continue
            }

            $alreadyHas = $false
            foreach ($kw in $keywords) {
                if ($content.Contains($kw)) { $alreadyHas = $true; break }
            }
            if (-not $alreadyHas) {
                $prefix = if ($content.Length -eq 0 -or $content.EndsWith("`n")) { "" } else { "`n" }
                Set-Content -Path $f.FullName -Value ($content + $prefix + $block) -Encoding utf8
            }
        }
    }
}

if ($script:HasOpenClaw) { try { & openclaw gateway restart } catch {} }

$port = Read-PortFromEnv $backendEnv
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:$port" -UseBasicParsing -TimeoutSec 1
        if ($res.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}
if (-not $ready) { throw "服务启动后 60 秒内未通过 HTTP 就绪检查（http://localhost:$port）。" }

Write-Host ""
Write-Host "安装完成并已启动！"
Write-Host "访问地址: http://localhost:$port"
