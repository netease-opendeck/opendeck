#!/usr/bin/env node
/**
 * extract-turn-messages.js
 *
 * Usage:
 *   node extract-turn-messages.js <session-jsonl-path> <start-message-id> [end-message-id]
 *
 * - <session-jsonl-path>: absolute path to the session JSONL file
 * - <start-message-id>: the `id` field of the user message that starts this turn
 * - [end-message-id]: optional; if provided, extraction stops AFTER this message id.
 *                     If omitted, extraction stops BEFORE the next user message (or EOF).
 *
 * Output: JSON array of **abbreviated** message objects for this turn, printed to stdout.
 *
 * Each message is summarized (not raw). Format:
 *   {
 *     "id": "message-id",
 *     "role": "user|assistant|toolResult",
 *     "type": "message",
 *     "summary": "first ~200 chars of text content",
 *     "toolCalls": ["tool_name", ...],    // only if assistant message contains tool calls
 *     "contentBlocks": 3,                  // number of content blocks
 *     "totalChars": 12345                  // total character count of all text content
 *   }
 *
 * Turn boundary logic (when end-message-id is omitted):
 *   A turn starts at the message with start-message-id and ends at the line
 *   BEFORE the next user message (role=user), or end-of-file.
 *
 * When end-message-id is provided:
 *   Extraction includes all messages from start-message-id through end-message-id (inclusive).
 */

const fs = require('fs');

const sessionPath = process.argv[2];
const startMsgId = process.argv[3];
const endMsgId = process.argv[4] || null;

if (!sessionPath || !startMsgId) {
  console.error('Usage: node extract-turn-messages.js <session-jsonl-path> <start-message-id> [end-message-id]');
  process.exit(1);
}

const raw = fs.readFileSync(sessionPath, 'utf8').trim();
const lines = raw.split('\n');

// Find start index by message id
let startIdx = -1;
for (let i = 0; i < lines.length; i++) {
  try {
    const obj = JSON.parse(lines[i]);
    if (obj.id === startMsgId) {
      startIdx = i;
      break;
    }
  } catch (e) {
    // skip
  }
}

if (startIdx === -1) {
  console.error(`Start message id "${startMsgId}" not found in ${sessionPath}`);
  process.exit(1);
}

// Find end index
let endIdx = lines.length; // exclusive
if (endMsgId) {
  for (let i = startIdx; i < lines.length; i++) {
    try {
      const obj = JSON.parse(lines[i]);
      if (obj.id === endMsgId) {
        endIdx = i + 1;
        break;
      }
    } catch (e) {
      // skip
    }
  }
} else {
  for (let i = startIdx + 1; i < lines.length; i++) {
    try {
      const obj = JSON.parse(lines[i]);
      if (obj.message && obj.message.role === 'user') {
        endIdx = i;
        break;
      }
    } catch (e) {
      // skip
    }
  }
}

const SUMMARY_MAX = 200;

/**
 * Abbreviate a single parsed JSONL message object into a compact summary.
 */
function abbreviate(obj) {
  const msg = obj.message || {};
  const result = {
    id: obj.id || null,
    role: msg.role || null,
    type: obj.type || null,
  };

  const contentArr = Array.isArray(msg.content) ? msg.content : [];

  // Collect text snippets and tool call names
  let allText = '';
  const toolCalls = [];

  for (const block of contentArr) {
    if (block.type === 'text' && typeof block.text === 'string') {
      allText += block.text;
    } else if (block.type === 'toolCall') {
      const name = block.toolName || block.name || block.function?.name || 'unknown';
      toolCalls.push(name);
    }
  }

  // Summary: first N chars of concatenated text, trimmed
  const trimmed = allText.replace(/\s+/g, ' ').trim();
  result.summary = trimmed.length > SUMMARY_MAX
    ? trimmed.substring(0, SUMMARY_MAX) + '…'
    : trimmed;

  if (toolCalls.length > 0) {
    result.toolCalls = toolCalls;
  }

  result.contentBlocks = contentArr.length;
  result.totalChars = allText.length;

  return result;
}

// Extract and abbreviate
const messages = [];
for (let i = startIdx; i < endIdx; i++) {
  try {
    const obj = JSON.parse(lines[i]);
    messages.push(abbreviate(obj));
  } catch (e) {
    // skip unparseable
  }
}

// Output
console.log(JSON.stringify(messages));
