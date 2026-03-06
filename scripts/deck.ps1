# deck - 管理 deck 服务 (Windows PowerShell)
# 用法: deck start | stop | restart | status | help | remove

param([string]$Command = "help")

$ErrorActionPreference = "Stop"

# 定位 DECK_ROOT
if ($env:DECK_ROOT) {
    $DECK_ROOT = $env:DECK_ROOT
} elseif (Test-Path (Join-Path $PSScriptRoot "backend\package.json")) {
    $DECK_ROOT = $PSScriptRoot
} elseif (Test-Path (Join-Path (Split-Path $PSScriptRoot -Parent) "backend\package.json")) {
    $DECK_ROOT = Split-Path $PSScriptRoot -Parent
} else {
    Write-Error "无法定位 deck 安装目录，请设置 DECK_ROOT 环境变量"
}

$ECOSYSTEM = Join-Path $DECK_ROOT "ecosystem.config.cjs"
$INSTALLED_SKILLS = Join-Path $DECK_ROOT ".installed_skills"
if (Test-Path (Join-Path $DECK_ROOT ".skills_target")) {
    $SKILLS_TARGET = Get-Content (Join-Path $DECK_ROOT ".skills_target") -Raw
} else {
    $SKILLS_TARGET = Join-Path $env:USERPROFILE ".openclaw\workspace\skills"
}

# 包管理器
if (Test-Path (Join-Path $DECK_ROOT ".deck_pkg")) {
    $PKG = (Get-Content (Join-Path $DECK_ROOT ".deck_pkg") -Raw).Trim()
} elseif (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $PKG = "pnpm"
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    $PKG = "npm"
} else {
    Write-Error "未找到 pnpm 或 npm，请先安装"
}
if (-not (Get-Command $PKG -ErrorAction SilentlyContinue)) {
    Write-Error "包管理器 $PKG 不可用，请检查 PATH"
}

function Show-Help {
    @"
deck - 管理 deck 服务

用法: deck <命令>

命令:
  start    启动 backend 和 frontend
  stop     停止 backend 和 frontend
  restart  重启 backend 和 frontend
  status   查看运行状态
  help     显示此帮助
  remove   停止服务、删除安装目录及已安装的 skills

示例:
  deck start
  deck status
  deck stop
"@
}

function Ensure-Pm2 {
    if (Get-Command pm2 -ErrorAction SilentlyContinue) { return }
    Write-Host "未检测到 pm2，正在自动安装..."
    if ($PKG -eq "pnpm") {
        & pnpm add -g pm2
    } else {
        & npm install -g pm2
    }
    if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
        Write-Error "pm2 安装后仍不可用，请检查 PATH 或手动执行: npm install -g pm2"
    }
    Write-Host "pm2 已安装完成。"
}

function Ensure-Build {
    $backendMain = Join-Path $DECK_ROOT "backend\dist\main.js"
    if (-not (Test-Path $backendMain)) {
        Write-Host "正在构建 backend..."
        Push-Location (Join-Path $DECK_ROOT "backend")
        try {
            & $PKG install
            & $PKG run build
        } finally {
            Pop-Location
        }
    }
    $appDist = Join-Path $DECK_ROOT "app\dist"
    if (-not (Test-Path $appDist)) {
        Write-Host "正在构建 frontend..."
        Push-Location (Join-Path $DECK_ROOT "app")
        try {
            & $PKG install
            & $PKG run build
        } finally {
            Pop-Location
        }
    }
}

function Start-Deck {
    Ensure-Pm2
    Ensure-Build
    if (-not (Test-Path $ECOSYSTEM)) {
        Write-Error "未找到 ecosystem.config.cjs，请确保安装完整"
    }
    Set-Location $DECK_ROOT
    & pm2 start ecosystem.config.cjs
    Write-Host "deck 已启动"
}

function Stop-Deck {
    Ensure-Pm2
    & pm2 stop deck-backend deck-frontend 2>$null
    Write-Host "deck 已停止"
}

function Restart-Deck {
    Ensure-Pm2
    Ensure-Build
    & pm2 restart deck-backend deck-frontend 2>$null
    if ($LASTEXITCODE -ne 0) {
        & pm2 start $ECOSYSTEM
    }
    Write-Host "deck 已重启"
}

function Get-DeckStatus {
    Ensure-Pm2
    & pm2 list
}

function Remove-DeckFromPath {
    $methodFile = Join-Path $DECK_ROOT ".deck_install_method"
    if (-not (Test-Path $methodFile)) { return }
    $method = Get-Content $methodFile -Raw
    if ($method -match "profile:") {
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
        $installDir = $DECK_ROOT -replace [regex]::Escape('\'), '\\'
        $newPath = ($currentPath -split ';' | Where-Object { $_ -ne $DECK_ROOT }) -join ';'
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "已从用户 PATH 移除 deck"
    }
}

function Remove-Deck {
    Ensure-Pm2
    Write-Host "正在停止 deck 进程..."
    & pm2 delete deck-backend deck-frontend 2>$null
    if (Test-Path $INSTALLED_SKILLS) {
        Write-Host "正在删除已安装的 skills..."
        Get-Content $INSTALLED_SKILLS | ForEach-Object {
            if ($_) {
                $target = Join-Path $SKILLS_TARGET $_
                if (Test-Path $target) {
                    Remove-Item -Path $target -Recurse -Force
                    Write-Host "  已删除: $_"
                }
            }
        }
    }
    Remove-DeckFromPath
    Write-Host "正在删除 deck 安装目录: $DECK_ROOT"
    Remove-Item -Path $DECK_ROOT -Recurse -Force
    Write-Host "deck 已完全移除"
}

switch ($Command.ToLower()) {
    "start"   { Start-Deck }
    "stop"    { Stop-Deck }
    "restart" { Restart-Deck }
    "status"  { Get-DeckStatus }
    "help"    { Show-Help }
    "remove"  { Remove-Deck }
    default   {
        Write-Host "未知命令: $Command" -ForegroundColor Red
        Show-Help
        exit 1
    }
}
