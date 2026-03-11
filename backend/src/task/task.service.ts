import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import { SkillExecutionService } from '../skill-execution/skill-execution.service';
import { ExecutionRecord, TaskRecord } from '../skill-execution/interfaces/execution-record.interface';
import { ChildTaskDto, TaskItemDto, TaskStatsResponseDto } from './dto/task-response.dto';

interface SessionFileRecord {
  type?: string;
  id?: string;
  timestamp?: string;
  message?: {
    role?: string;
    content?: Record<string, unknown>[];
    isError?: boolean;
    timestamp?: number;
  };
}

interface SessionMessageItem {
  id: string;
  role: string;
  normalizedRole: string;
  timestamp: string | null;
  rawMessageTimestampMs: number | null;
  content: Record<string, unknown>[];
  isError: boolean;
}

interface TimeRange {
  startedAt: string | null;
  endedAt: string | null;
}

interface CollectedChildrenTasks {
  childrenTasks: ChildTaskDto[];
  startedAtFromChildren: string | null;
  endedAtFromChildren: string | null;
}

const SENSITIVE_KEY_PATTERN =
  /(token|password|passwd|api[_-]?key|authorization|secret|access[_-]?key|refresh[_-]?token|client[_-]?secret)/i;
const SENSITIVE_TEXT_PATTERNS = [
  /(authorization\s*[:=]\s*bearer\s+)[^\s"']+/gi,
  /((api[_-]?key|token|password|passwd|secret)\s*[:=]\s*)[^\s"']+/gi,
];
const REDACTED = '[REDACTED]';

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function redactText(value: string): string {
  return SENSITIVE_TEXT_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, `$1${REDACTED}`), value);
}

function redactUnknown(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) return REDACTED;
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactUnknown(item));
  if (isObjectLike(value)) {
    const output: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(value)) {
      output[entryKey] = redactUnknown(entryValue, entryKey);
    }
    return output;
  }
  return value;
}

function toEpochMsOrNull(input: unknown): number | null {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : null;
  }
  if (typeof input === 'string' && input.trim().length > 0) {
    const parsed = Number(input);
    if (!Number.isNaN(parsed)) return parsed;
    const dateMs = new Date(input).getTime();
    return Number.isNaN(dateMs) ? null : dateMs;
  }
  return null;
}

function toIsoOrNullFromMs(ms: number | null): string | null {
  if (ms === null) return null;
  return new Date(ms).toISOString();
}

function toLocalStringOrNullFromMs(ms: number | null): string | null {
  if (ms === null) return null;
  return new Date(ms).toLocaleString();
}

function computeTimeRangeFromTaskRecords(tasks: TaskRecord[]): TimeRange {
  let startedAt: string | null = null;
  let endedAt: string | null = null;

  for (const task of tasks) {
    if (task.startedAt) {
      if (!startedAt || new Date(task.startedAt).getTime() < new Date(startedAt).getTime()) {
        startedAt = task.startedAt;
      }
    }
    if (task.endedAt) {
      if (!endedAt || new Date(task.endedAt).getTime() > new Date(endedAt).getTime()) {
        endedAt = task.endedAt;
      }
    }
  }

  return { startedAt, endedAt };
}

function deriveLegacyError(isError: boolean): string | null {
  return isError ? 'true' : 'false';
}

function stripUserSenderMetadataPrefix(text: string): string {
  // Remove OpenClaw sender metadata preface if present at the beginning of user text.
  const pattern =
    /^\s*Sender \(untrusted metadata\):\s*\n+(?:```json\s*)?\{[\s\S]*?\}(?:\s*```)?\s*\n*\[[^\]]+\]\s*/i;
  return text.replace(pattern, '').trimStart();
}

function normalizeContentByRole(
  role: string,
  content: Record<string, unknown>[],
): Record<string, unknown>[] {
  if (role.toLowerCase() !== 'user') return content;
  return content.map((block) => {
    if (
      block.type === 'text' &&
      typeof block.text === 'string'
    ) {
      return {
        ...block,
        text: stripUserSenderMetadataPrefix(block.text),
      };
    }
    return block;
  });
}

@Injectable()
export class TaskService {
  constructor(private readonly skillExecutionService: SkillExecutionService) {}

  private lineToSessionMessage(line: string): SessionMessageItem | null {
    let parsed: SessionFileRecord;
    try {
      parsed = JSON.parse(line) as SessionFileRecord;
    } catch {
      return null;
    }

    if (parsed.type !== 'message') return null;

    const id = parsed.id?.trim();
    const role = parsed.message?.role?.trim();
    if (!id || !role) return null;

    const content = Array.isArray(parsed.message?.content)
      ? ((redactUnknown(parsed.message?.content) as Record<string, unknown>[]) ?? [])
      : [];
    const normalizedContent = normalizeContentByRole(role, content);
    const rawMessageTimestampMs = toEpochMsOrNull(parsed.message?.timestamp);
    const timestamp = toLocalStringOrNullFromMs(rawMessageTimestampMs);
    const normalizedRole = role.toLowerCase();

    return {
      id,
      role,
      normalizedRole,
      timestamp,
      rawMessageTimestampMs,
      content: normalizedContent,
      isError: parsed.message?.isError === true,
    };
  }

  private async collectChildrenTasksFromSessionFile(
    sessionFile?: string,
    startMessageId?: string,
  ): Promise<CollectedChildrenTasks> {
    if (!sessionFile?.trim() || !startMessageId?.trim()) {
      return { childrenTasks: [], startedAtFromChildren: null, endedAtFromChildren: null };
    }

    let content: string;
    try {
      content = await fs.readFile(sessionFile, 'utf-8');
    } catch {
      return { childrenTasks: [], startedAtFromChildren: null, endedAtFromChildren: null };
    }

    const messages: SessionMessageItem[] = content
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => this.lineToSessionMessage(line))
      .filter((message): message is SessionMessageItem => message !== null);

    const startIndex = messages.findLastIndex((message) => message.id === startMessageId);
    if (startIndex < 0) {
      return { childrenTasks: [], startedAtFromChildren: null, endedAtFromChildren: null };
    }

    const selectedMessages: SessionMessageItem[] = [];
    selectedMessages.push(messages[startIndex]);

    for (let i = startIndex + 1; i < messages.length; i++) {
      const current = messages[i];
      if (current.normalizedRole === 'user') break;
      selectedMessages.push(current);
    }

    const rawTimestamps = selectedMessages
      .map((message) => message.rawMessageTimestampMs)
      .filter((ms): ms is number => ms !== null)
      .sort((a, b) => a - b);

    const childrenTasks = selectedMessages.map((message) => ({
      id: message.id,
      role: message.role,
      timestamp: message.timestamp,
      content: message.content,
      isError: message.isError,
      // backward compatibility
      name: null,
      status: null,
      error: deriveLegacyError(message.isError),
    }));

    return {
      childrenTasks,
      startedAtFromChildren: toIsoOrNullFromMs(rawTimestamps[0] ?? null),
      endedAtFromChildren: toIsoOrNullFromMs(rawTimestamps[rawTimestamps.length - 1] ?? null),
    };
  }

  private async mapRecord(record: ExecutionRecord): Promise<TaskItemDto> {
    const tasks: TaskRecord[] = record.tasks ?? [];

    const {
      childrenTasks,
      startedAtFromChildren,
      endedAtFromChildren,
    } = await this.collectChildrenTasksFromSessionFile(
      record.sessionFile,
      record.startMessageId,
    );
    const timeFromLegacyTasks = computeTimeRangeFromTaskRecords(tasks);
    const startedAt = startedAtFromChildren ?? timeFromLegacyTasks.startedAt;
    const endedAt = endedAtFromChildren ?? timeFromLegacyTasks.endedAt;

    let error: string | null = null;
    for (const task of tasks) {
      if (task.error) {
        error = task.error;
        break;
      }
    }

    const artifacts =
      (record.artifacts ?? []).map((a) => ({
        fileName: a.fileName,
        fileSize: a.fileSize ?? 0,
        absolutePath: a.absolutePath,
      })) ?? [];

    const skillNames = (record.skills ?? []).map((s) => s.name);
    const taskName = record.turnName ?? tasks[0]?.name ?? null;

    return {
      taskName,
      skillNames,
      startedAt,
      endedAt,
      error,
      artifacts,
      childrenTasks,
    };
  }

  async getTasks(): Promise<TaskItemDto[]> {
    const records = await this.skillExecutionService.getRecords();
    const tasks: TaskItemDto[] = await Promise.all(records.map((record) => this.mapRecord(record)));

    tasks.sort((a, b) => {
      const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return tb - ta;
    });

    return tasks;
  }

  async getTaskStats(): Promise<TaskStatsResponseDto> {
    const tasks = await this.getTasks();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    let today = 0;
    let thisWeek = 0;

    for (const t of tasks) {
      const ts = t.startedAt;
      if (!ts) continue;
      const d = new Date(ts);
      if (d >= startOfToday) today++;
      if (d >= startOfWeek) thisWeek++;
    }

    return {
      today,
      thisWeek,
      total: tasks.length,
    };
  }
}

