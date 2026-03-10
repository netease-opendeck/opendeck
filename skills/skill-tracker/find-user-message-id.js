#!/usr/bin/env node
/**
 * find-user-message-id.js
 *
 * Usage:
 *   node find-user-message-id.js <session-jsonl-path> [nth-from-end]
 *
 * Finds the message `id` of the Nth-from-last user message.
 * Default nth-from-end = 1 (the LAST user message = current turn).
 *
 * Output: the message id string, or exits with code 1 if not found.
 */

const fs = require('fs');

const sessionPath = process.argv[2];
const nthFromEnd = parseInt(process.argv[3] || '1', 10);

if (!sessionPath) {
  console.error('Usage: node find-user-message-id.js <session-jsonl-path> [nth-from-end]');
  process.exit(1);
}

const raw = fs.readFileSync(sessionPath, 'utf8').trim();
const lines = raw.split('\n');

// Collect all user message ids
const userMsgIds = [];
for (let i = 0; i < lines.length; i++) {
  try {
    const obj = JSON.parse(lines[i]);
    if (obj.message && obj.message.role === 'user' && obj.id) {
      userMsgIds.push(obj.id);
    }
  } catch (e) {
    // skip
  }
}

if (userMsgIds.length < nthFromEnd) {
  console.error(`Only ${userMsgIds.length} user messages found, requested ${nthFromEnd}th from end`);
  process.exit(1);
}

console.log(userMsgIds[userMsgIds.length - nthFromEnd]);
