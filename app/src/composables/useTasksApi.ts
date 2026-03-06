import axios, { AxiosError } from 'axios';
import type {
  TaskArtifact,
  TaskHistoryApiError,
  TaskHistoryItem,
  TaskHistoryStats,
} from '@/types';

interface TasksListResponseDto {
  tasks: {
    taskName: string | null;
    skillNames: string[];
    startedAt: string | null;
    endedAt: string | null;
    error: string | null;
    artifacts: {
      fileName: string;
      fileSize: number | null;
      absolutePath: string;
    }[];
    messages?: { role: string; content: string; timestamp?: string }[];
    childrenTasks?: { id: string; name: string | null; status: string | null; error: string | null }[];
  }[];
}

type TaskStatsResponseDto = TaskHistoryStats;

interface BackendErrorBody {
  statusCode?: number;
  message?: string;
}

function normalizeTaskError(error: unknown): TaskHistoryApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<BackendErrorBody>;
    const status = axiosError.response?.status;
    const body = axiosError.response?.data;
    const statusCode = body?.statusCode ?? status;
    const message =
      body?.message ||
      axiosError.message ||
      '任务服务暂不可用，请稍后重试';

    if (status === 503) {
      return {
        type: 'unavailable',
        message,
        statusCode,
      };
    }

    return {
      type: status ? 'unknown' : 'network',
      message,
      statusCode,
    };
  }

  return {
    type: 'unknown',
    message: '未知错误，请稍后重试',
  };
}

const API_BASE_URL = import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_BASE_URL ?? '/api';

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchTasks(): Promise<TaskHistoryItem[]> {
  try {
    const res = await http.get<TasksListResponseDto>('/tasks');
    const list = res.data.tasks ?? [];
    return list.map((t, index): TaskHistoryItem => {
      const idBase = t.taskName ?? t.skillNames?.[0] ?? 'task';
      const idTime = t.startedAt ?? t.endedAt ?? String(index);
      const id = `${idBase}-${idTime}-${index}`;

      const artifacts: TaskArtifact[] =
        t.artifacts?.map((a) => ({
          fileName: a.fileName,
          fileSize: a.fileSize,
          absolutePath: a.absolutePath,
        })) ?? [];

      const messages = (t.messages ?? []).map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.timestamp != null && { timestamp: m.timestamp }),
      }));

      return {
        id,
        taskName: t.taskName,
        skillNames: t.skillNames ?? [],
        startedAt: t.startedAt,
        endedAt: t.endedAt,
        error: t.error,
        artifacts,
        messages,
        childrenTasks:
          t.childrenTasks?.map((c) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            error: c.error,
          })) ?? [],
      };
    });
  } catch (error) {
    throw normalizeTaskError(error);
  }
}

export async function fetchTaskStats(): Promise<TaskHistoryStats> {
  try {
    const res = await http.get<TaskStatsResponseDto>('/tasks/stats');
    return res.data;
  } catch (error) {
    throw normalizeTaskError(error);
  }
}

