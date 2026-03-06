# deck 安装脚本 (Windows PowerShell)
# 用法: .\scripts\install.ps1 -FromLocal
#   或: .\scripts\install.ps1 -Dir C:\deck -Yes

param(
    [string]$Dir = "",
    [string]$Skills = "",
    [switch]$Yes = $false,
    [switch]$FromLocal = $false
)

$ErrorActionPreference = "Stop"
$DEFAULT_RELEASE_URL = if ($env:DECK_RELEASE_URL) { $env:DECK_RELEASE_URL } else { "https://github.com/example/deck/releases/latest/download/deck.tar.gz" }

function Write-Usage {
    @"
deck 安装脚本 (Windows)

用法:
  .\install.ps1 [选项]

选项:
  -Dir PATH      安装目录（默认: $env:USERPROFILE\deck）
  -Skills PATH   skills 安装路径（默认: $env:USERPROFILE\.openclaw\workspace\skills）
  -Yes           非交互模式，已存在的 skill 不覆盖
  -FromLocal     从当前目录复制（用于 git clone 后的本地安装）
  -Help          显示此帮助
"@
}

if ($args -contains "-Help" -or $args -contains "-h") {
    Write-Usage
    exit 0
}

# 检测 openclaw
if (-not (Get-Command openclaw -ErrorAction SilentlyContinue)) {
    Write-Error "未检测到 openclaw。deck 用于管理 openclaw，请先安装 openclaw。"
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

# 下载或本地复制
if ($FromLocal) {
    $REPO_ROOT = Resolve-Path (Join-Path $PSScriptRoot "..")
    if (-not (Test-Path (Join-Path $REPO_ROOT "backend\package.json")) -or -not (Test-Path (Join-Path $REPO_ROOT "app\package.json"))) {
        Write-Error "--FromLocal 需在仓库根目录或 scripts 目录下执行"
    }
    Write-Host "从本地复制到 $INSTALL_DIR ..."
    New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
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
} else {
    if (-not (Get-Command curl -ErrorAction SilentlyContinue) -and -not (Get-Command Invoke-WebRequest -ErrorAction SilentlyContinue)) {
        Write-Error "下载需要 curl 或 PowerShell 网络支持。"
    }
    Write-Host "正在下载 deck..."
    $TMP_DIR = Join-Path $env:TEMP "deck-install-$(Get-Random)"
    New-Item -ItemType Directory -Force -Path $TMP_DIR | Out-Null
    try {
        Invoke-WebRequest -Uri $DEFAULT_RELEASE_URL -OutFile (Join-Path $TMP_DIR "deck.tar.gz") -UseBasicParsing
        $tar = Get-Command tar -ErrorAction SilentlyContinue
        if ($tar) {
            Push-Location $TMP_DIR
            & tar -xzf deck.tar.gz
            Pop-Location
        } else {
            Write-Error "解压需要 tar。请使用 -FromLocal 从本地安装，或安装 tar (如 Git for Windows)。"
        }
        $SRC_ROOT = $TMP_DIR
        foreach ($d in Get-ChildItem -Path $TMP_DIR -Directory) {
            if ((Test-Path (Join-Path $d.FullName "backend\package.json")) -and (Test-Path (Join-Path $d.FullName "app\package.json"))) {
                $SRC_ROOT = $d.FullName
                break
            }
        }
        New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
        Copy-Item -Path (Join-Path $SRC_ROOT "backend") -Destination $INSTALL_DIR -Recurse -Force
        Copy-Item -Path (Join-Path $SRC_ROOT "app") -Destination $INSTALL_DIR -Recurse -Force
        if (Test-Path (Join-Path $SRC_ROOT "skills")) {
            Copy-Item -Path (Join-Path $SRC_ROOT "skills") -Destination $INSTALL_DIR -Recurse -Force
        } else {
            New-Item -ItemType Directory -Force -Path (Join-Path $INSTALL_DIR "skills") | Out-Null
        }
        if (Test-Path (Join-Path $SRC_ROOT "scripts\deck.ps1")) {
            Copy-Item -Path (Join-Path $SRC_ROOT "scripts\deck.ps1") -Destination $INSTALL_DIR -Force
            Copy-Item -Path (Join-Path $SRC_ROOT "scripts\deck.cmd") -Destination $INSTALL_DIR -Force
        }
        Copy-Item -Path (Join-Path $SRC_ROOT "ecosystem.config.cjs") -Destination $INSTALL_DIR -Force -ErrorAction SilentlyContinue
        if (-not (Test-Path (Join-Path $INSTALL_DIR "ecosystem.config.cjs"))) {
            Copy-Item -Path (Join-Path $SRC_ROOT "scripts\ecosystem.config.cjs") -Destination $INSTALL_DIR -Force
        }
    } finally {
        Remove-Item -Path $TMP_DIR -Recurse -Force -ErrorAction SilentlyContinue
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
            if ($Yes) {
                Write-Host "跳过已存在的 skill: $name"
                continue
            }
            $reply = Read-Host "目标路径已存在 skill `"$name`"，是否覆盖？[y/N]"
            if ($reply -notmatch '^[yY]') {
                Write-Host "跳过 $name"
                continue
            }
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
$defaultOpenclaw = Join-Path $env:USERPROFILE ".openclaw"
if ($Yes) {
    Write-Host "[AGENTS.md] 检测到 -Yes 模式，使用默认 .openclaw 路径: $defaultOpenclaw"
} else {
    Write-Host "[AGENTS.md] 将在重启 openclaw gateway 之前更新 Mandatory Workflow 配置。"
    $inputRoot = Read-Host "[AGENTS.md] 请输入 .openclaw 路径（回车使用默认: $defaultOpenclaw）"
    if ($inputRoot) { $defaultOpenclaw = $inputRoot }
}
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
Write-Host "正在重启 openclaw gateway..."
try {
    & openclaw gateway restart
} catch {
    # 忽略失败
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
