export interface TaskArtifact {
  fileName: string;
  fileSize: number | null;
  absolutePath: string;
}

export interface ChildTask {
  id: string;
  role: string;
  timestamp: string | null;
  content: Array<Record<string, unknown>>;
  isError: boolean;
  // Backward-compatible fields from API
  name: string | null;
  status: string | null;
  error: string | null;
}

export interface TaskHistoryItem {
  id: string;
  taskName: string | null;
  skillNames: string[];
  startedAt: string | null;
  endedAt: string | null;
  error: string | null;
  artifacts: TaskArtifact[];
  childrenTasks: ChildTask[];
}

export interface TaskHistoryStats {
  today: number;
  thisWeek: number;
  total: number;
}

export type TaskHistoryErrorType =
  | 'unavailable'
  | 'network'
  | 'unknown';

export interface TaskHistoryApiError {
  type: TaskHistoryErrorType;
  message: string;
  statusCode?: number;
}

