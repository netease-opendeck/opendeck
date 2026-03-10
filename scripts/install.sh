#!/usr/bin/env bash
# OpenDeck 本地安装脚本（安装后自动启动）

set -e

INSTALL_DIR=""
SKILLS_TARGET=""
YES_MODE=false
OPENCLAW_ROOT_INPUT=""
HAS_OPENCLAW=false
PKG=""

usage() {
  cat <<'EOF'
OpenDeck 安装脚本

用法:
  ./install.sh [选项]

选项:
  -d, --dir PATH     安装目录（默认: ~/deck）
  -s, --skills PATH  skills 安装路径（默认: ~/.openclaw/workspace/skills/）
  -y, --yes          非交互模式，使用默认路径并自动覆盖同名 skill
  -h, --help         显示此帮助
EOF
}

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
    return 0
  fi
  if [ "$YES_MODE" = true ]; then
    OPENCLAW_ROOT_INPUT="$default_root"
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

ensure_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    return 0
  fi
  echo "未检测到 pm2，正在自动安装..."
  if [ "$PKG" = "pnpm" ]; then
    pnpm add -g pm2
  else
    npm install -g pm2
  fi
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "错误: pm2 安装后仍不可用，请手动安装后重试。" >&2
    exit 1
  fi
}

cleanup_legacy_deck() {
  if command -v deck >/dev/null 2>&1; then
    echo "检测到旧版 deck 命令，尝试迁移清理..."
    deck remove >/dev/null 2>&1 || true
  fi

  if [ -L /usr/local/bin/deck ]; then
    rm -f /usr/local/bin/deck || true
  fi

  local start_marker="# === deck PATH (do not edit) ==="
  local end_marker="# === end deck PATH ==="
  local profiles=("$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile")
  for pf in "${profiles[@]}"; do
    [ -f "$pf" ] || continue
    grep -q "$start_marker" "$pf" 2>/dev/null || continue
    if sed -i.bak "/$start_marker/,/$end_marker/d" "$pf" 2>/dev/null; then
      rm -f "${pf}.bak"
    elif sed -i '' "/$start_marker/,/$end_marker/d" "$pf" 2>/dev/null; then
      :
    fi
  done
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

  local tmp_env="${backend_env}.tmp.$$"
  awk -v root="$openclaw_root" '
    BEGIN { replaced = 0 }
    /^OPENCLAW_ROOT=/ { print "OPENCLAW_ROOT=" root; replaced = 1; next }
    { print }
    END { if (!replaced) print "OPENCLAW_ROOT=" root }
  ' "$backend_env" > "$tmp_env" && mv "$tmp_env" "$backend_env"
}

update_agents_md() {
  local script_dir
  script_dir="$(cd "$(dirname "$0")" && pwd)"
  local config_path="$script_dir/agents-config.json"
  if [ ! -f "$config_path" ]; then
    echo "错误: 未找到 agents-config.json，请确保 scripts/agents-config.json 存在。" >&2
    exit 1
  fi

  resolve_openclaw_root
  local openclaw_root="$OPENCLAW_ROOT_INPUT"
  if [ ! -d "$openclaw_root" ]; then
    echo "[AGENTS.md] 未找到目录: $openclaw_root，跳过写入"
    return 0
  fi

  local content_file keywords_file
  content_file="${TMPDIR:-/tmp}/agents-append-$$.txt"
  keywords_file="${TMPDIR:-/tmp}/agents-keywords-$$.txt"
  node -e "
const fs=require('fs');
const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
fs.writeFileSync(process.argv[2],c.appendContent);
fs.writeFileSync(process.argv[3],c.duplicateKeywords.join('\n'));
" "$config_path" "$content_file" "$keywords_file"

  local count
  count=$(find "$openclaw_root" -name "AGENTS.md" -type f 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" = "0" ]; then
    echo "[AGENTS.md] 未在 $openclaw_root 下找到 AGENTS.md，跳过写入"
    rm -f "$content_file" "$keywords_file"
    return 0
  fi

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
      continue
    fi
    cat "$content_file" >> "$file" 2>/dev/null || true
  done

  rm -f "$content_file" "$keywords_file"
}

ensure_build() {
  echo "正在安装 backend 依赖并构建..."
  (cd "$INSTALL_DIR/backend" && $PKG install && $PKG run build)
  echo "正在安装 frontend 依赖并构建..."
  (cd "$INSTALL_DIR/app" && $PKG install && $PKG run build)
}

read_port_from_env() {
  local env_file="$INSTALL_DIR/backend/.env"
  if [ -f "$env_file" ]; then
    local p
    p="$(awk -F= '/^PORT[[:space:]]*=/{gsub(/[[:space:]]*/,"",$2); print $2; exit}' "$env_file")"
    if [ -n "$p" ]; then
      echo "$p"
      return 0
    fi
  fi
  echo "19520"
}

start_services() {
  ensure_pm2
  ensure_build
  if [ ! -f "$INSTALL_DIR/ecosystem.config.cjs" ]; then
    echo "错误: 未找到 ecosystem.config.cjs，安装不完整。" >&2
    exit 1
  fi
  (cd "$INSTALL_DIR" && pm2 delete deck-backend >/dev/null 2>&1 || true)
  (cd "$INSTALL_DIR" && pm2 start ecosystem.config.cjs)
}

wait_http_ready() {
  local port="$1"
  local url="http://localhost:$port"
  local i
  for i in $(seq 1 60); do
    if node -e "const http=require('http');const req=http.get('$url',res=>{process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.setTimeout(1000,()=>{req.destroy();process.exit(1);});" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

if command -v openclaw >/dev/null 2>&1; then
  HAS_OPENCLAW=true
else
  echo "警告: 未检测到 openclaw，将继续安装，但会跳过 gateway 重启。" >&2
fi

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
if command -v pnpm >/dev/null 2>&1; then PKG=pnpm; else PKG=npm; fi
echo "使用包管理器: $PKG"

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

if [ -z "$SKILLS_TARGET" ]; then
  SKILLS_TARGET="$HOME/.openclaw/workspace/skills"
fi
mkdir -p "$SKILLS_TARGET"

cleanup_legacy_deck

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
  rm -rf "$INSTALL_DIR/backend" "$INSTALL_DIR/app" "$INSTALL_DIR/skills" "$INSTALL_DIR/ecosystem.config.cjs"
fi
cp -r "$REPO_ROOT/backend" "$REPO_ROOT/app" "$INSTALL_DIR/"
[ -d "$REPO_ROOT/skills" ] && cp -r "$REPO_ROOT/skills" "$INSTALL_DIR/" || mkdir -p "$INSTALL_DIR/skills"
cp "$REPO_ROOT/scripts/ecosystem.config.cjs" "$INSTALL_DIR/ecosystem.config.cjs"

configure_backend_env

SKILLS_SRC="$INSTALL_DIR/skills"
INSTALLED_LIST="$INSTALL_DIR/.installed_skills"
: > "$INSTALLED_LIST"
echo "$SKILLS_TARGET" > "$INSTALL_DIR/.skills_target"
if [ -d "$SKILLS_SRC" ]; then
  for skill_dir in "$SKILLS_SRC"/*/; do
    [ -d "$skill_dir" ] || continue
    name="$(basename "$skill_dir")"
    target="$SKILLS_TARGET/$name"
    [ -d "$target" ] && rm -rf "$target"
    cp -r "$skill_dir" "$target"
    echo "$name" >> "$INSTALLED_LIST"
  done
fi
echo "$PKG" > "$INSTALL_DIR/.deck_pkg"

update_agents_md
if [ "$HAS_OPENCLAW" = true ]; then
  openclaw gateway restart || true
fi

start_services
PORT="$(read_port_from_env)"
if wait_http_ready "$PORT"; then
  echo ""
  echo "安装完成并已启动！"
  echo "访问地址: http://localhost:$PORT"
else
  echo "错误: 服务启动后 60 秒内未通过 HTTP 就绪检查（http://localhost:$PORT）。" >&2
  exit 1
fi
