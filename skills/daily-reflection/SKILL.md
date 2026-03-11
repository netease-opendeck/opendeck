---
name: daily-reflection
description: "Generate a daily reflection report by analyzing today's session files. Activate when user asks for: daily report, daily reflection, daily review, 每日反思, 每日总结, 日报, daily summary, end-of-day review, or wants to reflect on today's work, tasks, errors, and improvements."
---

# Daily Reflection

Generate a structured daily reflection report by parsing session conversation logs.

## Workflow

1. Run the session parser script to extract today's data
2. Analyze the parsed data to produce 4 reflection sections
3. Write a markdown report to `memory/reflection/reflection-YYYY-MM-DD.md`
4. Send the report to the user

## Step 1: Parse Sessions

```bash
python3 <skill_dir>/scripts/parse_sessions.py [--date YYYY-MM-DD]
```

- Defaults to today (Asia/Shanghai timezone)
- Reads `~/.openclaw/agents/main/sessions/` directory
- Outputs JSON with per-session stats, rounds, tool usage, errors, and token counts

Pipe the JSON output and analyze it.

## Step 2: Analyze and Write Report

Generate a markdown report with these 4 sections. Write in the same language as user's request (Chinese if asked in Chinese).

### Section 1: 📋 Task Overview

- Total task count and total tokens consumed
- A compact table: task name (derived from user request), model used, tokens consumed, status (✅/❌)
- Keep task names short and descriptive, not raw user text

### Section 2: ❌ Error Analysis

- List tasks that had tool errors or execution failures
- For each: what failed, which tool, root cause
- Skip if no errors today

### Section 3: 🔄 Quality Reflection

- Identify tasks where the user had to ask multiple follow-ups to get a satisfactory result (multiple rounds in the same session on the same topic)
- For tasks that required iteration: what could have been done better on first attempt
- For clean single-round tasks: brief note on what worked well
- Generate reusable **task-handling experience** for future reference

### Section 4: 💡 Self-Improvement Suggestions

Based on all issues found:
- Workflow/process optimizations
- New tools or skills to add
- Things to remember (for MEMORY.md)
- Steps to optimize or habits to build

## Step 3: Save and Send

- Write report to `memory/reflection/reflection-YYYY-MM-DD.md`
- Send the full report content to the user
