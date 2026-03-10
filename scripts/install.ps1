# deck 安装脚本 (Windows PowerShell)
# 用法: .\scripts\install.ps1
#   或: .\scripts\install.ps1 -Dir C:\deck -Yes

param(
    [string]$Dir = "",
    [string]$Skills = "",
    [switch]$Yes = $false
)

$ErrorActionPreference = "Stop"
$script:HasOpenClaw = $false
$script:ResolvedOpenClawRoot = ""

function Write-Usage {
    @"
deck 安装脚本 (Windows)

用法:
  .\install.ps1 [选项]

选项:
  -Dir PATH      安装目录（默认: $env:USERPROFILE\deck）
  -Skills PATH   skills 安装路径（默认: $env:USERPROFILE\.openclaw\workspace\skills）
  -Yes           非交互模式，使用默认路径并自动覆盖同名 skill
  -Help          显示此帮助
"@
}

function Resolve-OpenClawRoot {
    if ($script:ResolvedOpenClawRoot) {
        return $script:ResolvedOpenClawRoot
    }

    $defaultRoot = Join-Path $env:USERPROFILE ".openclaw"
    if (Test-Path $defaultRoot -PathType Container) {
        Write-Host "[openclaw-root] 检测到默认目录: $defaultRoot"
        $script:ResolvedOpenClawRoot = $defaultRoot
        return $script:ResolvedOpenClawRoot
    }

    if ($Yes) {
        Write-Host "[openclaw-root] 未检测到默认目录，-Yes 模式使用默认值: $defaultRoot"
        $script:ResolvedOpenClawRoot = $defaultRoot
        return $script:ResolvedOpenClawRoot
    }

    $inputRoot = Read-Host "[openclaw-root] 未找到 $defaultRoot，请输入 OpenClaw 根目录（回车使用默认: $defaultRoot）"
    if ($inputRoot) {
        $script:ResolvedOpenClawRoot = $inputRoot
    } else {
        $script:ResolvedOpenClawRoot = $defaultRoot
    }
    return $script:ResolvedOpenClawRoot
}

if ($args -contains "-Help" -or $args -contains "-h") {
    Write-Usage
    exit 0
}

# 检测 openclaw
if (Get-Command openclaw -ErrorAction SilentlyContinue) {
    $script:HasOpenClaw = $true
} else {
    Write-Warning "未检测到 openclaw，将继续安装，但会跳过 gateway 重启。"
}

# 检测 node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "未找到 node，请先安装 Node.js。"
}

# 包管理器：优先 pnpm，否则 npm
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $script:PKG = "pnpm"
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    $script:PKG = "npm"
} else {
    Write-Error "未找到 pnpm 或 npm，请先安装。"
}
Write-Host "使用包管理器: $script:PKG"

# 确定安装目录
if (-not $Dir) {
    $Dir = Join-Path $env:USERPROFILE "deck"
}
if (-not [System.IO.Path]::IsPathRooted($Dir)) {
    $Dir = Join-Path (Get-Location) $Dir
}
$INSTALL_DIR = $Dir

# 确定 skills 目标路径
if (-not $Skills) {
    $Skills = Join-Path $env:USERPROFILE ".openclaw\workspace\skills"
}
$SKILLS_TARGET = $Skills
New-Item -ItemType Directory -Force -Path $SKILLS_TARGET | Out-Null

# 仅本地仓库复制
$REPO_ROOT = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not (Test-Path (Join-Path $REPO_ROOT "backend\package.json")) -or -not (Test-Path (Join-Path $REPO_ROOT "app\package.json"))) {
    Write-Error "本地安装模式下必须在 open-deck 仓库内执行脚本。"
}
Write-Host "从本地复制到 $INSTALL_DIR ..."
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
Remove-Item -Path (Join-Path $INSTALL_DIR "backend"), (Join-Path $INSTALL_DIR "app"), (Join-Path $INSTALL_DIR "skills"), (Join-Path $INSTALL_DIR "deck.ps1"), (Join-Path $INSTALL_DIR "deck.cmd"), (Join-Path $INSTALL_DIR "ecosystem.config.cjs") -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $REPO_ROOT "backend") -Destination $INSTALL_DIR -Recurse -Force
Copy-Item -Path (Join-Path $REPO_ROOT "app") -Destination $INSTALL_DIR -Recurse -Force
if (Test-Path (Join-Path $REPO_ROOT "skills")) {
    Copy-Item -Path (Join-Path $REPO_ROOT "skills") -Destination $INSTALL_DIR -Recurse -Force
} else {
    New-Item -ItemType Directory -Force -Path (Join-Path $INSTALL_DIR "skills") | Out-Null
}
Copy-Item -Path (Join-Path $REPO_ROOT "scripts\deck.ps1") -Destination $INSTALL_DIR -Force
Copy-Item -Path (Join-Path $REPO_ROOT "scripts\deck.cmd") -Destination $INSTALL_DIR -Force
Copy-Item -Path (Join-Path $REPO_ROOT "scripts\ecosystem.config.cjs") -Destination $INSTALL_DIR -Force

# 配置 backend\.env 中的 OPENCLAW_ROOT
$backendDir = Join-Path $INSTALL_DIR "backend"
$backendEnv = Join-Path $backendDir ".env"
$backendExample = Join-Path $backendDir ".env.example"
if (Test-Path $backendDir -PathType Container) {
    $openclawRoot = Resolve-OpenClawRoot

    if (-not (Test-Path $backendEnv -PathType Leaf)) {
        if (Test-Path $backendExample -PathType Leaf) {
            Copy-Item -Path $backendExample -Destination $backendEnv -Force
        } else {
            "# OpenClaw 项目根目录（由安装脚本自动写入）`nOPENCLAW_ROOT=$openclawRoot" | Set-Content $backendEnv -Encoding utf8
        }
    } else {
        $content = Get-Content -Path $backendEnv -Raw -Encoding utf8
        if ($content -match '^OPENCLAW_ROOT=.*') {
            $content = $content -replace '^OPENCLAW_ROOT=.*', "OPENCLAW_ROOT=$openclawRoot"
        } else {
            $content = "$content`nOPENCLAW_ROOT=$openclawRoot`n"
        }
        Set-Content -Path $backendEnv -Value $content -Encoding utf8
    }
}

# 安装内置 skills
$SKILLS_SRC = Join-Path $INSTALL_DIR "skills"
$INSTALLED_LIST = Join-Path $INSTALL_DIR ".installed_skills"
"" | Set-Content $INSTALLED_LIST -Encoding utf8
$SKILLS_TARGET | Set-Content (Join-Path $INSTALL_DIR ".skills_target") -Encoding utf8

if (Test-Path $SKILLS_SRC) {
    foreach ($skillDir in Get-ChildItem -Path $SKILLS_SRC -Directory) {
        $name = $skillDir.Name
        $target = Join-Path $SKILLS_TARGET $name
        if (Test-Path $target) {
            Remove-Item -Path $target -Recurse -Force -ErrorAction SilentlyContinue
        }
        Copy-Item -Path $skillDir.FullName -Destination $target -Recurse -Force
        Add-Content -Path $INSTALLED_LIST -Value $name
        Write-Host "已安装 skill: $name"
    }
}

# 写入 .deck_pkg
$script:PKG | Set-Content (Join-Path $INSTALL_DIR ".deck_pkg") -Encoding utf8 -NoNewline

# 更新 AGENTS.md
$agentsConfigPath = Join-Path $PSScriptRoot "agents-config.json"
if (-not (Test-Path $agentsConfigPath -PathType Leaf)) {
    Write-Error "未找到 agents-config.json，请确保 scripts/agents-config.json 存在。"
    exit 1
}
$agentsConfig = Get-Content -Path $agentsConfigPath -Raw -Encoding utf8 | ConvertFrom-Json
$defaultOpenclaw = Resolve-OpenClawRoot
if (Test-Path $defaultOpenclaw -PathType Container) {
    $agentsFiles = Get-ChildItem -Path $defaultOpenclaw -Filter "AGENTS.md" -Recurse -File -ErrorAction SilentlyContinue
    if ($agentsFiles) {
        Write-Host "[AGENTS.md] 在 $defaultOpenclaw 下找到 $($agentsFiles.Count) 个 AGENTS.md，将逐一处理..."
        $block = $agentsConfig.appendContent
        foreach ($f in $agentsFiles) {
            $content = Get-Content -Path $f.FullName -Raw -ErrorAction SilentlyContinue
            $alreadyHas = $false
            foreach ($kw in $agentsConfig.duplicateKeywords) {
                if ($content -and $content -match [regex]::Escape($kw)) {
                    $alreadyHas = $true
                    break
                }
            }
            if ($alreadyHas) {
                Write-Host "[AGENTS.md] 已包含 Mandatory Workflow，跳过: $($f.FullName)"
                continue
            }
            try {
                Add-Content -Path $f.FullName -Value $block -Encoding utf8
                Write-Host "[AGENTS.md] 已向 $($f.FullName) 追加 Mandatory Workflow"
            } catch {
                Write-Warning "[AGENTS.md] 无法写入 $($f.FullName)"
            }
        }
    } else {
        Write-Host "[AGENTS.md] 未在 $defaultOpenclaw 下找到 AGENTS.md，跳过写入"
    }
} else {
    Write-Host "[AGENTS.md] 未找到目录: $defaultOpenclaw，跳过写入"
}

# 重启 openclaw
if ($script:HasOpenClaw) {
    Write-Host "正在重启 openclaw gateway..."
    try {
        & openclaw gateway restart
    } catch {
        # 忽略失败
    }
} else {
    Write-Warning "未检测到 openclaw，跳过 gateway 重启。"
}

# 将 deck 加入用户 PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$INSTALL_DIR*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$INSTALL_DIR", "User")
    $env:Path = "$env:Path;$INSTALL_DIR"
    "profile:User" | Set-Content (Join-Path $INSTALL_DIR ".deck_install_method") -Encoding utf8
    Write-Host "已将 deck 加入用户 PATH。请重新打开终端使 deck 命令生效。"
} else {
    Write-Host "deck 已在 PATH 中。"
}

Write-Host ""
Write-Host "安装完成！deck 已安装到 $INSTALL_DIR"
Write-Host "使用方式: deck start | stop | restart | status | help | remove"
Write-Host "skills 已安装到 $SKILLS_TARGET"
