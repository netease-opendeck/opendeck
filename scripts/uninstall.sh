#!/usr/bin/env bash
# OpenDeck 卸载脚本（默认非交互）

set -e

INSTALL_DIR="${1:-$HOME/deck}"
if [[ "$INSTALL_DIR" != /* ]]; then
  INSTALL_DIR="$(pwd)/$INSTALL_DIR"
fi

if [ ! -d "$INSTALL_DIR" ]; then
  echo "安装目录不存在: $INSTALL_DIR"
  exit 0
fi

INSTALLED_LIST="$INSTALL_DIR/.installed_skills"
SKILLS_TARGET_FILE="$INSTALL_DIR/.skills_target"
if [ -f "$SKILLS_TARGET_FILE" ]; then
  SKILLS_TARGET="$(cat "$SKILLS_TARGET_FILE")"
else
  SKILLS_TARGET="$HOME/.openclaw/workspace/skills"
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete deck-backend >/dev/null 2>&1 || true
fi

if [ -f "$INSTALLED_LIST" ]; then
  while IFS= read -r name; do
    [ -z "$name" ] && continue
    target="$SKILLS_TARGET/$name"
    [ -d "$target" ] && rm -rf "$target"
  done < "$INSTALLED_LIST"
fi

rm -rf "$INSTALL_DIR"
echo "OpenDeck 已卸载。"
