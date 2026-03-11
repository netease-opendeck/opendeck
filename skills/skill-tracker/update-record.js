#!/usr/bin/env node
/**
 * update-record.js
 *
 * Merges updates into the last line of the JSONL file, preserving fields
 * like startMessageId/sessionId/sessionFile that the LLM should not rewrite.
 *
 * Usage:
 *   echo '<PARTIAL_UPDATE_JSON>' | node update-record.js <output-jsonl-path>
 *
 * The script:
 *   1. Reads the last line of the JSONL file (the current turn's record)
 *   2. Deep-merges the update JSON from stdin into the existing record
 *   3. Rewrites only the last line (all prior lines remain untouched)
 *
 * Merge rules:
 *   - Top-level scalar fields from update overwrite existing ones
 *   - "tasks" array: matched by task.id; fields within each task are merged
 *   - "artifacts" array: replaced entirely if provided in update
 *   - "skills" array: replaced entirely if provided in update
 *   - Fields NOT present in the update are preserved from the original
 */

const fs = require('fs');

const outputPath = process.argv[2];

if (!outputPath) {
  console.error('Usage: echo \'<JSON>\' | node update-record.js <output-jsonl-path>');
  process.exit(1);
}

function mergeTasks(existing, updates) {
  if (!Array.isArray(updates)) return existing;
  if (!Array.isArray(existing)) return updates;

  const byId = new Map();
  for (const task of existing) {
    if (task.id) byId.set(task.id, { ...task });
  }
  for (const task of updates) {
    if (task.id && byId.has(task.id)) {
      byId.set(task.id, { ...byId.get(task.id), ...task });
    } else {
      byId.set(task.id || `_new_${byId.size}`, { ...task });
    }
  }
  return Array.from(byId.values());
}

let stdinData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { stdinData += chunk; });
process.stdin.on('end', () => {
  let update;
  try {
    update = JSON.parse(stdinData.trim());
  } catch (e) {
    console.error('Invalid JSON from stdin');
    process.exit(1);
  }

  let content;
  try {
    content = fs.readFileSync(outputPath, 'utf8').trimEnd();
  } catch (e) {
    console.error(`Cannot read JSONL file: ${outputPath}`);
    process.exit(1);
  }

  const lines = content.split('\n');
  let lastRecord;
  try {
    lastRecord = JSON.parse(lines[lines.length - 1]);
  } catch (e) {
    console.error('Cannot parse last line of JSONL');
    process.exit(1);
  }

  if (update.tasks !== undefined) {
    update.tasks = mergeTasks(lastRecord.tasks, update.tasks);
  }

  const merged = { ...lastRecord, ...update };

  lines[lines.length - 1] = JSON.stringify(merged);
  fs.writeFileSync(outputPath, lines.join('\n') + '\n');
  console.log('OK');
});
