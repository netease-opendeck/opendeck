import { Injectable } from '@nestjs/common';
import { SkillExecutionService } from '../skill-execution/skill-execution.service';
import { ExecutionRecord, TaskRecord } from '../skill-execution/interfaces/execution-record.interface';
import { ChildTaskDto, TaskItemDto, TaskStatsResponseDto } from './dto/task-response.dto';

@Injectable()
export class TaskService {
  constructor(private readonly skillExecutionService: SkillExecutionService) {}

  private mapRecord(record: ExecutionRecord): TaskItemDto {
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

    const messages = (record.messages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.timestamp != null && { timestamp: m.timestamp }),
    }));

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
    const tasks: TaskItemDto[] = records.map((record) => this.mapRecord(record));

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

