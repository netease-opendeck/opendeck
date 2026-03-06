import { Injectable } from '@nestjs/common';
import { SkillExecutionService } from '../skill-execution/skill-execution.service';
import { ExecutionRecord, TaskRecord } from '../skill-execution/interfaces/execution-record.interface';
import { TaskItemDto, TaskStatsResponseDto } from './dto/task-response.dto';

@Injectable()
export class TaskService {
  constructor(private readonly skillExecutionService: SkillExecutionService) {}

  private mapTask(record: ExecutionRecord, task: TaskRecord): TaskItemDto {
    const artifacts =
      (record.artifacts ?? [])
        .filter((a) => a.taskId === task.id)
        .map((a) => ({
          fileName: a.fileName,
          fileSize: a.fileSize ?? 0,
          absolutePath: a.absolutePath,
        })) ?? [];

    return {
      taskName: task.name ?? null,
      skillName: task.skill ?? 'none',
      startedAt: task.startedAt ?? null,
      endedAt: task.endedAt ?? null,
      error: (task.error ?? null) as string | null,
      detail: task.detail ?? null,
      artifacts,
    };
  }

  async getTasks(): Promise<TaskItemDto[]> {
    const records = await this.skillExecutionService.getRecords();
    const tasks: TaskItemDto[] = [];

    for (const record of records) {
      for (const task of record.tasks ?? []) {
        tasks.push(this.mapTask(record, task));
      }
    }

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

