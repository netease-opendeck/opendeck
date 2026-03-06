#!/usr/bin/env bash
# DECK 安装脚本
# 用法: curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/open-deck/main/scripts/install.sh | bash
#   或: ./scripts/install.sh --from-local
# 将 YOUR_ORG 替换为你的 GitHub 组织或用户名。

set -e

INSTALL_DIR=""
SKILLS_TARGET=""
YES_MODE=false
FROM_LOCAL=false
# Replace YOUR_ORG with your GitHub org/username when using GitHub Releases.
DEFAULT_RELEASE_URL="${DECK_RELEASE_URL:-https://github.com/YOUR_ORG/open-deck/releases/latest/download/deck.tar.gz}"

usage() {
  cat <<'EOF'
deck 安装脚本

用法:
  curl -fsSL <URL> | bash [选项]
  ./install.sh [选项]

选项:
  -d, --dir PATH     安装目录（默认: 有 sudo 时 /opt/deck，否则 ~/deck）
  -s, --skills PATH  skills 安装路径（默认: ~/.openclaw/workspace/skills/）
  -y, --yes          非交互模式，已存在的 skill 不覆盖
  --from-local       从当前目录复制（用于 git clone 后的本地安装）
  -h, --help         显示此帮助
EOF
}

# 解析参数
while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--dir)      INSTALL_DIR="$2"; shift 2 ;;
    -s|--skills)   SKILLS_TARGET="$2"; shift 2 ;;
    -y|--yes)      YES_MODE=true; shift ;;
    --from-local)  FROM_LOCAL=true; shift ;;
    -h|--help)     usage; exit 0 ;;
    *)             echo "未知选项: $1"; usage; exit 1 ;;
  esac
done

# 更新 .openclaw 下的 AGENTS.md，追加 Mandatory Workflow 配置
update_agents_md() {
  local script_dir
  script_dir="$(cd "$(dirname "$0")" && pwd)"
  local config_path="$script_dir/agents-config.json"
  if [ ! -f "$config_path" ]; then
    echo "错误: 未找到 agents-config.json，请确保 scripts/agents-config.json 存在。" >&2
    exit 1
  fi

  local content_file keywords_file
  content_file="${TMPDIR:-/tmp}/agents-append-$$.txt"
  keywords_file="${TMPDIR:-/tmp}/agents-keywords-$$.txt"
  node -e "
const fs = require('fs');
const configPath = process.argv[1];
const contentPath = process.argv[2];
const keywordsPath = process.argv[3];
const c = JSON.parse(fs.readFileSync(configPath, 'utf8'));
fs.writeFileSync(contentPath, c.appendContent);
fs.writeFileSync(keywordsPath, c.duplicateKeywords.join('\n'));
" "$config_path" "$content_file" "$keywords_file"

  local default_root="$HOME/.openclaw"
  local openclaw_root="$default_root"

  if [ "$YES_MODE" = true ]; then
    echo "[AGENTS.md] 检测到 -y 模式，使用默认 .openclaw 路径: $default_root"
  else
    echo "[AGENTS.md] 将在重启 openclaw gateway 之前更新 Mandatory Workflow 配置。"
    printf "[AGENTS.md] 请输入 .openclaw 路径（回车使用默认: %s）: " "$default_root"
    read -r input_root || input_root=""
    if [ -n "$input_root" ]; then
      openclaw_root="$input_root"
    fi
  fi

  if [ ! -d "$openclaw_root" ]; then
    echo "[AGENTS.md] 未找到目录: $openclaw_root，跳过写入"
    rm -f "$content_file" "$keywords_file"
    return 0
  fi

  local count
  count=$(find "$openclaw_root" -name "AGENTS.md" -type f 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" = "0" ]; then
    echo "[AGENTS.md] 未在 $openclaw_root 下找到 AGENTS.md，跳过写入"
    rm -f "$content_file" "$keywords_file"
    return 0
  fi

  echo "[AGENTS.md] 在 $openclaw_root 下找到 $count 个 AGENTS.md，将逐一处理..."

  find "$openclaw_root" -name "AGENTS.md" -type f 2>/dev/null | while IFS= read -r file; do
    local already_has=0
    while IFS= read -r kw; do
      [ -z "$kw" ] && continue
      if grep -q "$kw" "$file" 2>/dev/null; then
        already_has=1
        break
      fi
    done < "$keywords_file"
    if [ "$already_has" = "1" ]; then
      echo "[AGENTS.md] 已包含 Mandatory Workflow，跳过: $file"
      continue
    fi

    if cat "$content_file" >> "$file" 2>/dev/null; then
      echo "[AGENTS.md] 已向 $file 追加 Mandatory Workflow"
    else
      echo "[AGENTS.md] 无法写入 $file" >&2
    fi
  done

  rm -f "$content_file" "$keywords_file"
}

# 1. 检测 openclaw
if ! command -v openclaw >/dev/null 2>&1; then
  echo "错误: 未检测到 openclaw。deck 用于管理 openclaw，请先安装 openclaw。" >&2
  exit 1
fi

# 2. 检测必要工具
for cmd in node; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "错误: 未找到 $cmd，请先安装" >&2
    exit 1
  fi
done
if [ "$FROM_LOCAL" = false ] && ! command -v curl >/dev/null 2>&1; then
  echo "错误: 未找到 curl，下载安装需要 curl" >&2
  exit 1
fi
if ! command -v pnpm >/dev/null 2>&1 && ! command -v npm >/dev/null 2>&1; then
  echo "错误: 未找到 pnpm 或 npm，请先安装" >&2
  exit 1
fi
if command -v pnpm >/dev/null 2>&1; then
  PKG=pnpm
else
  PKG=npm
fi
echo "使用包管理器: $PKG"

# 3. 确定安装目录
if [ -z "$INSTALL_DIR" ]; then
  if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    INSTALL_DIR="/opt/deck"
  else
    INSTALL_DIR="$HOME/deck"
  fi
fi
if [[ "$INSTALL_DIR" != /* ]]; then
  INSTALL_DIR="$(pwd)/$INSTALL_DIR"
fi

# 4. 确定 skills 目标路径
if [ -z "$SKILLS_TARGET" ]; then
  SKILLS_TARGET="$HOME/.openclaw/workspace/skills"
fi
mkdir -p "$SKILLS_TARGET"

# 5. 下载或本地复制
# 若安装到 /opt 等系统目录，需先创建
if [[ "$INSTALL_DIR" == /opt/* ]] && command -v sudo >/dev/null 2>&1; then
  sudo mkdir -p "$INSTALL_DIR"
  sudo chown -R "$(whoami)" "$INSTALL_DIR" 2>/dev/null || true
fi

TMP_EXTRACT=""
if [ "$FROM_LOCAL" = true ]; then
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  if [ ! -d "$REPO_ROOT/backend" ] || [ ! -d "$REPO_ROOT/app" ]; then
    echo "错误: --from-local 需在仓库根目录或 scripts 目录下执行" >&2
    exit 1
  fi
  echo "从本地复制到 $INSTALL_DIR ..."
  mkdir -p "$INSTALL_DIR"
  cp -r "$REPO_ROOT/backend" "$REPO_ROOT/app" "$INSTALL_DIR/"
  [ -d "$REPO_ROOT/skills" ] && cp -r "$REPO_ROOT/skills" "$INSTALL_DIR/" || mkdir -p "$INSTALL_DIR/skills"
  # 复制 deck 脚本和 ecosystem 配置
  cp "$REPO_ROOT/scripts/deck" "$INSTALL_DIR/deck"
  cp "$REPO_ROOT/scripts/ecosystem.config.cjs" "$INSTALL_DIR/ecosystem.config.cjs"
  [ -f "$REPO_ROOT/scripts/deck.ps1" ] && cp "$REPO_ROOT/scripts/deck.ps1" "$INSTALL_DIR/"
  [ -f "$REPO_ROOT/scripts/deck.cmd" ] && cp "$REPO_ROOT/scripts/deck.cmd" "$INSTALL_DIR/"
  chmod +x "$INSTALL_DIR/deck"
else
  echo "正在下载 deck..."
  TMP_EXTRACT="$(mktemp -d)"
  trap "rm -rf '$TMP_EXTRACT'" EXIT
  curl -fsSL "$DEFAULT_RELEASE_URL" -o "$TMP_EXTRACT/deck.tar.gz"
  tar -xzf "$TMP_EXTRACT/deck.tar.gz" -C "$TMP_EXTRACT"
  # 查找包含 backend 和 app 的目录
  SRC_ROOT="$TMP_EXTRACT"
  for d in "$TMP_EXTRACT" "$TMP_EXTRACT"/*/; do
    if [ -d "$d/backend" ] && [ -d "$d/app" ]; then
      SRC_ROOT="$d"
      break
    fi
  done
  mkdir -p "$INSTALL_DIR"
  cp -r "$SRC_ROOT/backend" "$SRC_ROOT/app" "$INSTALL_DIR/"
  [ -d "$SRC_ROOT/skills" ] && cp -r "$SRC_ROOT/skills" "$INSTALL_DIR/" || mkdir -p "$INSTALL_DIR/skills"
  # 复制 deck 脚本和 ecosystem 配置
  if [ -f "$SRC_ROOT/deck" ] && [ -f "$SRC_ROOT/ecosystem.config.cjs" ]; then
    cp "$SRC_ROOT/deck" "$SRC_ROOT/ecosystem.config.cjs" "$INSTALL_DIR/"
    [ -f "$SRC_ROOT/deck.ps1" ] && cp "$SRC_ROOT/deck.ps1" "$INSTALL_DIR/"
    [ -f "$SRC_ROOT/deck.cmd" ] && cp "$SRC_ROOT/deck.cmd" "$INSTALL_DIR/"
  elif [ -f "$SRC_ROOT/scripts/deck" ]; then
    cp "$SRC_ROOT/scripts/deck" "$SRC_ROOT/scripts/ecosystem.config.cjs" "$INSTALL_DIR/"
    [ -f "$SRC_ROOT/scripts/deck.ps1" ] && cp "$SRC_ROOT/scripts/deck.ps1" "$INSTALL_DIR/"
    [ -f "$SRC_ROOT/scripts/deck.cmd" ] && cp "$SRC_ROOT/scripts/deck.cmd" "$INSTALL_DIR/"
  fi
  chmod +x "$INSTALL_DIR/deck"
fi

# 6. 安装内置 skills（含同名覆盖确认）
SKILLS_SRC="$INSTALL_DIR/skills"
INSTALLED_LIST="$INSTALL_DIR/.installed_skills"
: > "$INSTALLED_LIST"
echo "$SKILLS_TARGET" > "$INSTALL_DIR/.skills_target"

if [ -d "$SKILLS_SRC" ]; then
  for skill_dir in "$SKILLS_SRC"/*/; do
    [ -d "$skill_dir" ] || continue
    name="$(basename "$skill_dir")"
    target="$SKILLS_TARGET/$name"
    if [ -d "$target" ]; then
      if [ "$YES_MODE" = true ]; then
        echo "跳过已存在的 skill: $name"
        continue
      fi
      echo -n "目标路径已存在 skill \"$name\"，是否覆盖？[y/N] "
      read -r reply
      case "${reply:-n}" in
        [yY]|[yY][eE][sS]) ;;
        *) echo "跳过 $name"; continue ;;
      esac
    fi
    cp -r "$skill_dir" "$target"
    echo "$name" >> "$INSTALLED_LIST"
    echo "已安装 skill: $name"
  done
fi

echo "$PKG" > "$INSTALL_DIR/.deck_pkg"

# 7. 重启 openclaw
update_agents_md
echo "正在重启 openclaw gateway..."
openclaw gateway restart || true

# 8. 安装 deck 命令到 PATH（自动注入环境变量）
DECK_PATH_MARKER_START="# === deck PATH (do not edit) ==="
DECK_PATH_MARKER_END="# === end deck PATH ==="
DECK_PATH_BLOCK="$DECK_PATH_MARKER_START
export PATH=\"$INSTALL_DIR:\$PATH\"
$DECK_PATH_MARKER_END"

if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
  sudo ln -sf "$INSTALL_DIR/deck" /usr/local/bin/deck
  echo "symlink:/usr/local/bin/deck" > "$INSTALL_DIR/.deck_install_method"
  echo "已创建软链接 /usr/local/bin/deck，deck 命令已全局可用"
else
  PROFILES=("$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile")
  MODIFIED=""
  for pf in "${PROFILES[@]}"; do
    if [ -f "$pf" ] && grep -q "$DECK_PATH_MARKER_START" "$pf" 2>/dev/null; then
      continue
    fi
    {
      [ -f "$pf" ] && [ -s "$pf" ] && echo ""
      echo "$DECK_PATH_BLOCK"
    } >> "$pf" 2>/dev/null && MODIFIED="${MODIFIED:+$MODIFIED,}$pf"
  done
  if [ -n "$MODIFIED" ]; then
    echo "profile:$MODIFIED" > "$INSTALL_DIR/.deck_install_method"
    echo "已将 deck 注入 PATH（已修改: $MODIFIED），请执行 source ~/.zshrc 或重新打开终端使 deck 命令生效"
  else
    echo "警告: 无法写入 shell profile，请手动执行: export PATH=\"$INSTALL_DIR:\$PATH\""
  fi
fi

# 9. 完成提示
echo ""
echo "安装完成！deck 已安装到 $INSTALL_DIR"
echo "使用方式: deck start | stop | restart | status | help | remove"
echo "skills 已安装到 $SKILLS_TARGET"
