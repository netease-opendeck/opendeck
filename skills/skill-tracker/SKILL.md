---
name: skill-tracker
description: Track skill execution details including matched skills, decomposed tasks, execution status, outputs, and timestamps. Called at the start of every conversation turn to record skill usage.

---

# Skill Tracker

Track which skills and tools are used in each conversation turn. Records are stored as JSONL for analysis and debugging.

## When to Record

**Record** when either is true:
- Any tool is invoked during this turn, OR
- Any skill (excluding skill-tracker itself) is matched

**Skip** when both are true:
- No tool invocations, AND
- No skill matched

## File Location

`workspace/tracker-result/skill-execution.jsonl` — one JSON record per line, append-only.

Create the directory if it doesn't exist:
```bash
mkdir -p workspace/tracker-result
```

## Record Structure

```json
{
  "sessionId": "string",
  "sessionFile": "/absolute/path/to/session.jsonl",
  "startMessageId": "hex-id of the user message that starts this turn",
  "turnName": "concise summary of this turn",
  "timestamp": "ISO8601",
  "skills": [
    { "name": "string", "description": "string" }
  ],
  "tasks": [
    {
      "id": "task-1",
      "name": "string",
      "skill": "string",
      "taskType": "instant|scheduled",
      "scheduledName": "string or null",
      "detail": "30-150 chars summarizing context and purpose; append likely next step if any",
      "status": "pending|running|completed|failed",
      "output": "string or null",
      "startedAt": "ISO8601 or null",
      "endedAt": "ISO8601 or null",
      "error": "string or null"
    }
  ],
  "artifacts": [
    {
      "taskId": "task-1",
      "fileName": "example.md",
      "fileSize": 1234,
      "absolutePath": "/home/node/.openclaw/workspace/tracker-result/example.md"
    }
  ]
}
```

### Field Notes

- `sessionId`: from `agents/main/sessions/sessions.json` → `sessionId` field.
- `sessionFile`: absolute path to the session JSONL file (for later replay/extraction).
- `startMessageId`: the `id` field of the user message that starts this turn. Used to locate the exact start point in the session JSONL regardless of line number.
- `turnName`: short summary of what this turn does (e.g. "查询合肥天气", "Analyze GitHub repo").
- `skills`: matched skills this turn (do NOT include `skill-tracker` itself).
- `taskType`: `"instant"` for direct user requests, `"scheduled"` for heartbeat/cron-triggered tasks.
- `scheduledName`: only when `taskType` is `"scheduled"` (e.g. `"heartbeat"`); otherwise `null`.
- `artifacts`: optional, only when output files are generated.

## Execution Steps

Follow these steps **exactly** and **in order**. Do not skip any step.

---

### Step 1: Determine session file path

Read `agents/main/sessions/sessions.json` to get the `sessionId` and `sessionFile` path.

```bash
cat agents/main/sessions/sessions.json | node -e "
  let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const s=JSON.parse(d)['agent:main:main'];
    console.log(s.sessionId);
    console.log(s.sessionFile);
  });
"
```

Save both values — you'll use them in every subsequent step.

---

### Step 2 + 3: Create the initial tracker record

Build a JSON object with all fields **except** `startMessageId` (the script injects it automatically):
- `sessionId`, `sessionFile`, `timestamp`
- `turnName`
- `skills` array (matched skills, excluding skill-tracker)
- `tasks` array with `status: "pending"` or `"running"`
- Empty `artifacts`

Pipe the JSON into the helper script. It will auto-detect the correct `startMessageId` from the session JSONL and append the complete record:

```bash
cat <<'RECORD' | node <skill-dir>/append-record.js <session-jsonl-path> workspace/tracker-result/skill-execution.jsonl
<JSON_RECORD_WITHOUT_startMessageId>
RECORD
```

The script outputs the injected `startMessageId` to stdout (for logging only — you do **not** need to read or copy it).

> **Why a script?** Hex message IDs are long arbitrary strings. Letting the LLM copy them manually leads to truncation (e.g. `a3f8c91b` → `a3f8c9`). The script reads the ID directly from the session file, eliminating this risk.

---

### Step 4: Execute the actual user task

Now proceed with the user's request — call tools, run skills, do the work.

---

### Step 5: Detect Deck URL and append reminder

Run this command to detect the OpenDeck URL:

```bash
pm2 jlist 2>/dev/null | node -e "
  let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    try{const l=JSON.parse(d);const f=l.find(p=>p.name==='deck-backend'&&p.pm2_env&&p.pm2_env.status==='online');
    if(f){
      const cwd=f.pm2_env.pm_cwd||'';
      const path=require('path');
      const fs=require('fs');
      let port='19520';
      try{const envFile=fs.readFileSync(path.join(cwd,'.env'),'utf8');const m=envFile.match(/^PORT\s*=\s*(\d+)/m);if(m)port=m[1];}catch(e){}
      const publicIp=(require('child_process').execSync('curl -s --connect-timeout 3 ifconfig.me 2>/dev/null').toString()||'').trim();
      if(publicIp){
        const http=require('http');
        const req=http.get('http://'+publicIp+':'+port+'/',{timeout:3000},res=>{
          console.log('http://'+publicIp+':'+port);process.exit(0);
        });
        req.on('error',()=>{console.log('http://localhost:'+port);process.exit(0);});
        req.on('timeout',()=>{req.destroy();console.log('http://localhost:'+port);process.exit(0);});
      }else{console.log('http://localhost:'+port);process.exit(0);}
    }else{process.exit(1)}}catch(e){process.exit(1)}})
"
```

**Then append a reminder as the last line of your reply** (after a blank line):

- Command succeeds → `📋 任务已记录 - 在 OpenDeck 查看详情: [OpenDeck](URL)` (use user's language)
- Command fails → `📋 任务已记录 - 可在 OpenDeck 查看详情。` (use user's language)

**Reminder rules:**
- At most once per turn (never repeat even if multiple tool calls happen)
- Must be the very last line, separated by a blank line from the main content
- Use the same language as the user's message

---

### Step 6: Update the tracker record (MUST be last)

**This step MUST be the very last tool call in the turn.** No other tool calls should follow it.

Pipe only the **changed fields** into the update script. It merges them into the last line of the JSONL, preserving `startMessageId`, `sessionId`, `sessionFile`, and any other fields you don't include:

- Set task `status` to `"completed"` or `"failed"`
- Fill in `endedAt`, `output`, `error`
- Add `artifacts` if any files were generated

```bash
cat <<'UPDATE' | node <skill-dir>/update-record.js workspace/tracker-result/skill-execution.jsonl
<JSON_WITH_ONLY_CHANGED_FIELDS>
UPDATE
```

Merge rules:
- Top-level scalars overwrite existing values
- `tasks`: matched by `id`; per-task fields are merged (unchanged tasks are kept)
- `artifacts` / `skills`: replaced entirely if provided

> **Important**: Only the last line is updated. All prior lines remain untouched. You do NOT need to repeat `startMessageId` or other unchanged fields.

## Rules Summary

1. **Append-only**: never modify existing lines (except the current turn's last-line update in Step 6)
2. **One record per turn**: each user message → at most one JSONL line
3. **Do NOT track skill-tracker itself** in `skills` or `tasks`
4. **Silent execution**: skill-tracker must never interfere with, delay, or change the reply content
5. **Never mention** JSONL paths, JSON structure, or internal details to the user
