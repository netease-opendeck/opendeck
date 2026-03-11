#!/usr/bin/env node
/**
 * append-record.js
 *
 * Appends a new tracker record to the JSONL file, automatically injecting
 * the correct startMessageId so the LLM never needs to manually copy hex IDs.
 *
 * Usage:
 *   echo '<PARTIAL_JSON>' | node append-record.js <session-jsonl-path> <output-jsonl-path>
 *
 * The script:
 *   1. Finds the last user message id from the session JSONL
 *   2. Reads the partial record JSON from stdin
 *   3. Injects/overwrites the "startMessageId" field
 *   4. Appends the complete record as a new line to the output JSONL
 *
 * The partial JSON from stdin should contain all fields EXCEPT startMessageId
 * (if startMessageId is present, it will be overwritten with the correct value).
 */

const fs = require('fs');

const sessionPath = process.argv[2];
const outputPath = process.argv[3];

if (!sessionPath || !outputPath) {
  console.error('Usage: echo \'<JSON>\' | node append-record.js <session-jsonl-path> <output-jsonl-path>');
  process.exit(1);
}

function findLastUserMessageId(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8').trim();
  } catch (e) {
    console.error(`Cannot read session file: ${filePath}`);
    process.exit(1);
  }
  const lines = raw.split('\n');
  const userMsgIds = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.message && obj.message.role === 'user' && obj.id) {
        userMsgIds.push(obj.id);
      }
    } catch (_) {
      // skip
    }
  }
  if (userMsgIds.length === 0) {
    console.error('No user messages found in session file');
    process.exit(1);
  }
  return userMsgIds[userMsgIds.length - 1];
}

let stdinData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { stdinData += chunk; });
process.stdin.on('end', () => {
  let record;
  try {
    record = JSON.parse(stdinData.trim());
  } catch (e) {
    console.error('Invalid JSON from stdin');
    process.exit(1);
  }

  const startMessageId = findLastUserMessageId(sessionPath);
  record.startMessageId = startMessageId;

  const dir = require('path').dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.appendFileSync(outputPath, JSON.stringify(record) + '\n');
  console.log(startMessageId);
});
