export interface TaskArtifact {
  fileName: string;
  fileSize: number | null;
  absolutePath: string;
}

export interface TaskMessage {
  role: string;
  content: string;
  timestamp?: string;
}

export interface TaskHistoryItem {
  id: string;
  taskName: string | null;
  skillName: string;
  startedAt: string | null;
  endedAt: string | null;
  error: string | null;
  detail: string | null;
  artifacts: TaskArtifact[];
  messages: TaskMessage[];
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

