---
name: daily-reflection
description: "Generate a daily reflection report by analyzing today's session files. Activate when user asks for: daily report, daily reflection, daily review, 每日反思, 每日总结, 日报, daily summary, end-of-day review, or wants to reflect on today's work, tasks, errors, and improvements. Also activate when user asks to setup/schedule/configure the daily reflection cron job, 设置定时, 配置定时任务, 定时触发, schedule daily reflection, set up cron, configure scheduled task."
---

# Daily Reflection

Generate a structured daily reflection report by parsing session conversation logs.

## Workflow

1. **Setup cron job** (first time or on-demand): Ask user for preferred trigger time, check for existing job, create/update the scheduled task
2. Run the session parser script to extract today's data
3. Analyze the parsed data to produce 4 reflection sections
4. Write a markdown report to `memory/reflection-YYYY-MM-DD.md`
5. Send the report to the user

## Step 0: Cron Job Setup (run first on every activation)

**Every time this skill is activated**, first check whether the cron job already exists:

```bash
openclaw cron list
```

- **If a job named `"daily-reflection"` already exists** → skip to Step 1 immediately, no need to ask the user anything.
- **If no such job exists** → ask the user:

  > No daily reflection cron job found. What time would you like it to run each day? (e.g. `22:00`) — or reply "skip" to just generate today's report now.

  After the user replies:
  - If user says **skip** / no → proceed directly to Step 1.
  - If user provides a time (e.g. `22:00`, `21:30`):
    1. Parse the hour and minute from the input.
    2. Detect whether any channels are configured:
       ```bash
       openclaw channels status
       ```
    3. **If at least one channel is connected** → use isolated session with announce (delivers to wherever the agent last replied):
       ```bash
       openclaw cron add \
         --name "daily-reflection" \
         --cron "<MM> <HH> * * *" \
         --tz "Asia/Shanghai" \
         --session isolated \
         --message "Please run the daily-reflection skill and generate today's reflection report." \
         --announce
       ```
    4. **If no channels are configured** → use main session (result appears in the OpenClaw main chat window):
       ```bash
       openclaw cron add \
         --name "daily-reflection" \
         --cron "<MM> <HH> * * *" \
         --tz "Asia/Shanghai" \
         --session main \
         --system-event "Please run the daily-reflection skill and generate today's reflection report."
       ```
    5. Confirm to user: `✅ Cron job created. Daily reflection will trigger automatically at HH:MM (Asia/Shanghai).` Also mention which delivery mode was used and why.

  Note: cron expression format is `<minute> <hour> * * *`. For example, `22:00` → `0 22 * * *`; `21:30` → `30 21 * * *`.

Then proceed to Step 1 to generate today's report.

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

- Total task count, total tokens consumed, and total time spent (sum of all round durations from `aggregate.total_duration_seconds`, formatted as `Xh Ym` or `Xm Ys`)
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

- Write report to `memory/reflection-YYYY-MM-DD.md`
- Send the full report content to the user
