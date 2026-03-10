import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import { SkillExecutionService } from '../skill-execution/skill-execution.service';
import {
  ExecutionRecord,
  MessageRecord,
  TaskRecord,
} from '../skill-execution/interfaces/execution-record.interface';
import { ChildTaskDto, TaskItemDto, TaskStatsResponseDto } from './dto/task-response.dto';

interface SessionFileRecord {
  id?: string;
  timestamp?: string;
  message?: {
    role?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
    timestamp?: number;
  };
}

interface SessionMessageItem extends MessageRecord {
  id: string;
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

    const id = parsed.id?.trim();
    const role = parsed.message?.role?.trim();
    if (!id || !role) return null;

    const textBlocks = (parsed.message?.content ?? [])
      .filter((block) => block?.type === 'text')
      .map((block) => block?.text ?? '')
      .filter((text) => text.length > 0);
    const content = textBlocks.join('\n');

    const timestamp =
      parsed.timestamp ??
      (typeof parsed.message?.timestamp === 'number'
        ? new Date(parsed.message.timestamp).toISOString()
        : undefined);

    return {
      id,
      role,
      content,
      ...(timestamp != null && { timestamp }),
    };
  }

  private async collectMessagesFromSessionFile(
    sessionFile?: string,
    startMessageId?: string,
  ): Promise<MessageRecord[]> {
    if (!sessionFile?.trim() || !startMessageId?.trim()) return [];

    let content: string;
    try {
      content = await fs.readFile(sessionFile, 'utf-8');
    } catch {
      return [];
    }

    const messages = content
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => this.lineToSessionMessage(line))
      .filter((message): message is SessionMessageItem => message !== null);

    const startIndex = messages.findIndex((message) => message.id === startMessageId);
    if (startIndex < 0) return [];

    let endAnchorIndex = -1;
    for (let i = startIndex + 1; i < messages.length; i++) {
      if (messages[i].role !== 'user') {
        endAnchorIndex = i;
      }
    }

    const collectionEnd = endAnchorIndex >= 0 ? endAnchorIndex : messages.length;
    if (collectionEnd <= startIndex) return [];

    return messages.slice(startIndex, collectionEnd).map((message) => ({
      role: message.role,
      content: message.content,
      ...(message.timestamp != null && { timestamp: message.timestamp }),
    }));
  }

  private async mapRecord(record: ExecutionRecord): Promise<TaskItemDto> {
    const tasks: TaskRecord[] = record.tasks ?? [];

    const childrenTasks: ChildTaskDto[] = tasks.map((task) => ({
      id: task.id,
      name: task.name ?? null,
      status: task.status ?? null,
      error: (task.error ?? null) as string | null,
    }));

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

    const messages = await this.collectMessagesFromSessionFile(
      record.sessionFile,
      record.startMessageId,
    );

    const skillNames = (record.skills ?? []).map((s) => s.name);

    const taskName = record.turnName ?? tasks[0]?.name ?? null;

    return {
      taskName,
      skillNames,
      startedAt,
      endedAt,
      error,
      artifacts,
      messages,
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

