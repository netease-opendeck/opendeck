#!/usr/bin/env bash
# DECK 安装脚本
# 用法: ./scripts/install.sh
# 仅支持从本地仓库安装。

set -e

INSTALL_DIR=""
SKILLS_TARGET=""
YES_MODE=false
OPENCLAW_ROOT_INPUT=""
HAS_OPENCLAW=false

usage() {
  cat <<'EOF'
deck 安装脚本

用法:
  ./install.sh [选项]

选项:
  -d, --dir PATH     安装目录（默认: ~/deck）
  -s, --skills PATH  skills 安装路径（默认: ~/.openclaw/workspace/skills/）
  -y, --yes          非交互模式，使用默认路径并自动覆盖同名 skill
  -h, --help         显示此帮助
EOF
}

# 解析参数
while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--dir)      INSTALL_DIR="$2"; shift 2 ;;
    -s|--skills)   SKILLS_TARGET="$2"; shift 2 ;;
    -y|--yes)      YES_MODE=true; shift ;;
    -h|--help)     usage; exit 0 ;;
    *)             echo "未知选项: $1"; usage; exit 1 ;;
  esac
done

resolve_openclaw_root() {
  local default_root="$HOME/.openclaw"

  if [ -n "$OPENCLAW_ROOT_INPUT" ]; then
    return 0
  fi

  if [ -d "$default_root" ]; then
    OPENCLAW_ROOT_INPUT="$default_root"
    echo "[openclaw-root] 检测到默认目录: $default_root"
    return 0
  fi

  if [ "$YES_MODE" = true ]; then
    OPENCLAW_ROOT_INPUT="$default_root"
    echo "[openclaw-root] 未检测到默认目录，-y 模式使用默认值: $default_root"
    return 0
  fi

  printf "[openclaw-root] 未找到 %s，请输入 OpenClaw 根目录（回车使用默认: %s）: " "$default_root" "$default_root"
  read -r input_root || input_root=""
  if [ -n "$input_root" ]; then
    OPENCLAW_ROOT_INPUT="$input_root"
  else
    OPENCLAW_ROOT_INPUT="$default_root"
  fi
}

configure_backend_env() {
  local backend_dir="$INSTALL_DIR/backend"
  local backend_env="$backend_dir/.env"
  local backend_example="$backend_dir/.env.example"

  if [ ! -d "$backend_dir" ]; then
    return 0
  fi

  resolve_openclaw_root
  local openclaw_root="$OPENCLAW_ROOT_INPUT"

  if [ ! -f "$backend_env" ]; then
    if [ -f "$backend_example" ]; then
      cp "$backend_example" "$backend_env"
    else
      {
        echo "# OpenClaw 项目根目录（由安装脚本自动写入）"
        echo "OPENCLAW_ROOT=$openclaw_root"
      } > "$backend_env"
      return 0
    fi
  fi

  tmp_env="${backend_env}.tmp.$$"
  awk -v root="$openclaw_root" '
    BEGIN { replaced = 0 }
    /^OPENCLAW_ROOT=/ {
      print "OPENCLAW_ROOT=" root
      replaced = 1
      next
    }
    { print }
    END {
      if (!replaced) {
        print "OPENCLAW_ROOT=" root
      }
    }
  ' "$backend_env" > "$tmp_env" && mv "$tmp_env" "$backend_env"
}

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

  resolve_openclaw_root
  local openclaw_root="$OPENCLAW_ROOT_INPUT"

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

# 1. 检测 openclaw（缺失时仅警告）
if command -v openclaw >/dev/null 2>&1; then
  HAS_OPENCLAW=true
else
  echo "警告: 未检测到 openclaw，将继续安装，但会跳过 gateway 重启。" >&2
fi

# 2. 检测必要工具
for cmd in node; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "错误: 未找到 $cmd，请先安装" >&2
    exit 1
  fi
done
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
  INSTALL_DIR="$HOME/deck"
fi
if [[ "$INSTALL_DIR" != /* ]]; then
  INSTALL_DIR="$(pwd)/$INSTALL_DIR"
fi

if [ -z "$INSTALL_DIR" ] || [ "$INSTALL_DIR" = "/" ] || [ "$INSTALL_DIR" = "$HOME" ] || [ "$INSTALL_DIR" = "/opt" ]; then
  echo "错误: 非法安装目录: $INSTALL_DIR" >&2
  exit 1
fi

# 4. 确定 skills 目标路径
if [ -z "$SKILLS_TARGET" ]; then
  SKILLS_TARGET="$HOME/.openclaw/workspace/skills"
fi
mkdir -p "$SKILLS_TARGET"

# 5. 从本地仓库复制
# 若安装到 /opt 等系统目录，需先创建
if [[ "$INSTALL_DIR" == /opt/* ]] && command -v sudo >/dev/null 2>&1; then
  sudo mkdir -p "$INSTALL_DIR"
  sudo chown -R "$(whoami)" "$INSTALL_DIR" 2>/dev/null || true
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ ! -d "$REPO_ROOT/backend" ] || [ ! -d "$REPO_ROOT/app" ]; then
  echo "错误: 本地安装模式下必须在 open-deck 仓库内执行脚本。" >&2
  exit 1
fi

echo "从本地仓库复制到 $INSTALL_DIR ..."
mkdir -p "$INSTALL_DIR"

if [ "$INSTALL_DIR" = "/opt/deck" ]; then
  rm -rf /opt/deck/{*,.[!.]*,..?*} 2>/dev/null || true
else
  rm -rf "$INSTALL_DIR/backend" "$INSTALL_DIR/app" "$INSTALL_DIR/skills" \
    "$INSTALL_DIR/deck" "$INSTALL_DIR/deck.ps1" "$INSTALL_DIR/deck.cmd" \
    "$INSTALL_DIR/ecosystem.config.cjs"
fi

cp -r "$REPO_ROOT/backend" "$REPO_ROOT/app" "$INSTALL_DIR/"
[ -d "$REPO_ROOT/skills" ] && cp -r "$REPO_ROOT/skills" "$INSTALL_DIR/" || mkdir -p "$INSTALL_DIR/skills"
cp "$REPO_ROOT/scripts/deck" "$INSTALL_DIR/deck"
cp "$REPO_ROOT/scripts/ecosystem.config.cjs" "$INSTALL_DIR/ecosystem.config.cjs"
[ -f "$REPO_ROOT/scripts/deck.ps1" ] && cp "$REPO_ROOT/scripts/deck.ps1" "$INSTALL_DIR/"
[ -f "$REPO_ROOT/scripts/deck.cmd" ] && cp "$REPO_ROOT/scripts/deck.cmd" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/deck"

# 配置 backend/.env 中的 OPENCLAW_ROOT
configure_backend_env

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
      rm -rf "$target"
    fi
    cp -r "$skill_dir" "$target"
    echo "$name" >> "$INSTALLED_LIST"
    echo "已安装 skill: $name"
  done
fi

echo "$PKG" > "$INSTALL_DIR/.deck_pkg"

# 7. 重启 openclaw
update_agents_md
if [ "$HAS_OPENCLAW" = true ]; then
  echo "正在重启 openclaw gateway..."
  openclaw gateway restart || true
else
  echo "警告: 未检测到 openclaw，跳过 gateway 重启。"
fi

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
