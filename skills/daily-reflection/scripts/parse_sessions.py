#!/usr/bin/env python3
"""
Parse today's OpenClaw session files and extract structured conversation data.

Usage:
    python3 parse_sessions.py [--date YYYY-MM-DD] [--sessions-dir PATH]

Output: JSON to stdout with structured session summaries.
"""

import json
import sys
import os
import glob
import argparse
from datetime import datetime, timezone, timedelta


def parse_args():
    parser = argparse.ArgumentParser(description="Parse OpenClaw session files for daily reflection")
    parser.add_argument("--date", type=str, default=None,
                        help="Date to analyze (YYYY-MM-DD). Defaults to today in Asia/Shanghai.")
    parser.add_argument("--sessions-dir", type=str,
                        default=os.path.expanduser("~/.openclaw/agents/main/sessions"),
                        help="Path to sessions directory")
    return parser.parse_args()


def get_target_date(date_str=None):
    """Get target date. Default: today in Asia/Shanghai (UTC+8)."""
    if date_str:
        return date_str
    now_utc = datetime.now(timezone.utc)
    shanghai_offset = timedelta(hours=8)
    now_shanghai = now_utc + shanghai_offset
    return now_shanghai.strftime("%Y-%m-%d")


def strip_openclaw_metadata(text):
    """Remove OpenClaw inbound metadata (Conversation info, Sender blocks) from user messages."""
    import re
    # Remove "Conversation info (untrusted metadata):\n```json\n{...}\n```" blocks
    text = re.sub(r'Conversation info \(untrusted metadata\):\s*```json\s*\{[^}]*\}\s*```', '', text, flags=re.DOTALL)
    # Remove "Sender (untrusted metadata):\n```json\n{...}\n```" blocks
    text = re.sub(r'Sender \(untrusted metadata\):\s*```json\s*\{[^}]*\}\s*```', '', text, flags=re.DOTALL)
    # Remove timestamp prefix like "[Tue 2026-03-10 18:56 GMT+8]"
    text = re.sub(r'\[[\w]+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} GMT[+\-]\d+\]\s*', '', text)
    return text.strip()


def find_session_files(sessions_dir, target_date):
    """Find session files updated on the target date."""
    files = []
    # Match both active .jsonl and reset files with today's date
    for f in glob.glob(os.path.join(sessions_dir, "*.jsonl*")):
        basename = os.path.basename(f)
        if basename == "sessions.json" or basename.endswith(".lock"):
            continue
        # Check file modification time or filename date
        try:
            mtime = os.path.getmtime(f)
            mtime_dt = datetime.fromtimestamp(mtime, tz=timezone.utc) + timedelta(hours=8)
            file_date = mtime_dt.strftime("%Y-%m-%d")
            if file_date == target_date:
                files.append(f)
        except OSError:
            continue
    return sorted(files)


def parse_session_file(filepath, target_date):
    """Parse a single session JSONL file and extract today's conversations."""
    session_info = None
    messages = []
    
    # Target date boundaries in UTC (assuming Asia/Shanghai = UTC+8)
    date_obj = datetime.strptime(target_date, "%Y-%m-%d")
    day_start_utc = date_obj - timedelta(hours=8)  # 00:00 Shanghai = 16:00 prev day UTC
    day_end_utc = day_start_utc + timedelta(days=1)
    
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                
                if entry.get("type") == "session":
                    session_info = {
                        "id": entry.get("id", ""),
                        "version": entry.get("version"),
                        "started": entry.get("timestamp", ""),
                    }
                    continue
                
                if entry.get("type") != "message":
                    continue
                
                msg = entry.get("message", {})
                role = msg.get("role", "")
                timestamp_str = entry.get("timestamp", "")
                
                # Filter to target date
                if timestamp_str:
                    try:
                        msg_time = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                        if msg_time.tzinfo is None:
                            msg_time = msg_time.replace(tzinfo=timezone.utc)
                        if msg_time < day_start_utc or msg_time >= day_end_utc:
                            continue
                    except (ValueError, TypeError):
                        pass
                
                # Skip delivery mirrors and tool results for summary
                provider = msg.get("provider", "")
                model = msg.get("model", "")
                if model == "delivery-mirror":
                    continue
                
                # Extract content
                content_parts = msg.get("content", [])
                if isinstance(content_parts, str):
                    content_parts = [{"type": "text", "text": content_parts}]
                
                text_content = ""
                tool_calls = []
                tool_results = []
                
                for part in content_parts:
                    if not isinstance(part, dict):
                        continue
                    if part.get("type") == "text":
                        text_content += part.get("text", "") + "\n"
                    elif part.get("type") == "toolCall":
                        tool_calls.append({
                            "name": part.get("name", ""),
                            "id": part.get("id", ""),
                        })
                    elif part.get("type") == "thinking":
                        pass  # Skip thinking blocks in output
                
                # Extract usage/token info
                usage = msg.get("usage", {})
                cost = usage.get("cost", {})
                
                message_data = {
                    "role": role,
                    "timestamp": timestamp_str,
                    "text": text_content.strip()[:2000],  # Truncate long content
                    "model": model if model else None,
                    "provider": provider if provider else None,
                }
                
                if tool_calls:
                    message_data["tool_calls"] = tool_calls
                if role == "toolResult":
                    message_data["tool_name"] = msg.get("toolName", "")
                    is_error = msg.get("isError", False)
                    details = msg.get("details", {})
                    if isinstance(details, dict) and details.get("status") == "error":
                        is_error = True
                    message_data["is_error"] = is_error
                
                if usage:
                    message_data["tokens"] = {
                        "input": usage.get("input", 0),
                        "output": usage.get("output", 0),
                        "cache_read": usage.get("cacheRead", 0),
                        "total": usage.get("totalTokens", 0),
                    }
                    if cost:
                        message_data["cost"] = cost.get("total", 0)
                
                messages.append(message_data)
    except (OSError, IOError) as e:
        return None
    
    if not messages:
        return None
    
    # Compute session-level stats
    total_input = 0
    total_output = 0
    total_tokens = 0
    total_cost = 0.0
    models_used = set()
    tools_used = set()
    error_count = 0
    user_messages = []
    assistant_messages = []
    
    for m in messages:
        tokens = m.get("tokens", {})
        total_input += tokens.get("input", 0)
        total_output += tokens.get("output", 0)
        total_tokens += tokens.get("total", 0)
        total_cost += m.get("cost", 0)
        
        if m.get("model"):
            models_used.add(m["model"])
        
        if m.get("tool_calls"):
            for tc in m["tool_calls"]:
                tools_used.add(tc["name"])
        
        if m.get("role") == "toolResult" and m.get("is_error"):
            error_count += 1
        
        if m["role"] == "user":
            # Extract the actual user request (skip metadata lines)
            text = m["text"]
            clean_text = strip_openclaw_metadata(text)
            if clean_text and "new session was started" not in clean_text.lower() and "heartbeat" not in clean_text.lower():
                user_messages.append(clean_text[:500])
        
        if m["role"] == "assistant" and m.get("text"):
            assistant_messages.append(m["text"][:500])
    
    # Identify conversation rounds (user request → assistant response pairs)
    rounds = []
    current_round = None
    for m in messages:
        if m["role"] == "user":
            text = m["text"]
            if "new session was started" in text.lower() or "heartbeat" in text.lower():
                continue
            if current_round:
                rounds.append(current_round)
            clean_req = strip_openclaw_metadata(text)
            current_round = {
                "user_request": clean_req[:500],
                "timestamp": m["timestamp"],
                "last_timestamp": m["timestamp"],
                "assistant_responses": [],
                "tools_used": [],
                "errors": [],
                "tokens": {"input": 0, "output": 0, "total": 0},
                "duration_seconds": 0,
            }
        elif current_round:
            if m.get("timestamp"):
                current_round["last_timestamp"] = m["timestamp"]
            if m["role"] == "assistant":
                if m.get("text"):
                    current_round["assistant_responses"].append(m["text"][:300])
                if m.get("tool_calls"):
                    for tc in m["tool_calls"]:
                        current_round["tools_used"].append(tc["name"])
                tokens = m.get("tokens", {})
                current_round["tokens"]["input"] += tokens.get("input", 0)
                current_round["tokens"]["output"] += tokens.get("output", 0)
                current_round["tokens"]["total"] += tokens.get("total", 0)
            elif m["role"] == "toolResult":
                if m.get("is_error"):
                    current_round["errors"].append({
                        "tool": m.get("tool_name", "unknown"),
                        "text": m.get("text", "")[:200],
                    })
                if m.get("tool_name"):
                    if m["tool_name"] not in current_round["tools_used"]:
                        current_round["tools_used"].append(m["tool_name"])
    
    if current_round:
        rounds.append(current_round)
    
    # Calculate duration for each round
    for r in rounds:
        try:
            t_start = datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00"))
            t_end = datetime.fromisoformat(r["last_timestamp"].replace("Z", "+00:00"))
            r["duration_seconds"] = max(0, int((t_end - t_start).total_seconds()))
        except (ValueError, TypeError):
            r["duration_seconds"] = 0
    
    total_duration = sum(r.get("duration_seconds", 0) for r in rounds)

    return {
        "session_id": session_info["id"] if session_info else os.path.basename(filepath),
        "file": os.path.basename(filepath),
        "stats": {
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_tokens": total_tokens,
            "total_cost": total_cost,
            "total_duration_seconds": total_duration,
            "models_used": sorted(models_used),
            "tools_used": sorted(tools_used),
            "error_count": error_count,
            "user_message_count": len(user_messages),
            "round_count": len(rounds),
        },
        "user_requests_summary": user_messages[:20],  # Cap at 20
        "rounds": rounds[:30],  # Cap at 30 rounds
    }


def main():
    args = parse_args()
    target_date = get_target_date(args.date)
    sessions_dir = args.sessions_dir
    
    if not os.path.isdir(sessions_dir):
        print(json.dumps({"error": f"Sessions directory not found: {sessions_dir}"}))
        sys.exit(1)
    
    files = find_session_files(sessions_dir, target_date)
    
    results = {
        "date": target_date,
        "sessions_dir": sessions_dir,
        "files_found": len(files),
        "sessions": [],
    }
    
    for f in files:
        session_data = parse_session_file(f, target_date)
        if session_data and session_data["stats"]["round_count"] > 0:
            results["sessions"].append(session_data)
    
    results["total_sessions"] = len(results["sessions"])
    
    # Aggregate stats
    total_tokens = sum(s["stats"]["total_tokens"] for s in results["sessions"])
    total_cost = sum(s["stats"]["total_cost"] for s in results["sessions"])
    total_errors = sum(s["stats"]["error_count"] for s in results["sessions"])
    total_rounds = sum(s["stats"]["round_count"] for s in results["sessions"])
    all_models = set()
    all_tools = set()
    for s in results["sessions"]:
        all_models.update(s["stats"]["models_used"])
        all_tools.update(s["stats"]["tools_used"])
    
    total_duration = sum(s["stats"]["total_duration_seconds"] for s in results["sessions"])

    results["aggregate"] = {
        "total_tokens": total_tokens,
        "total_cost": total_cost,
        "total_errors": total_errors,
        "total_rounds": total_rounds,
        "total_duration_seconds": total_duration,
        "models_used": sorted(all_models),
        "tools_used": sorted(all_tools),
    }
    
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
