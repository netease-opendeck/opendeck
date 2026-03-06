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

export interface ChildTask {
  id: string;
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
  messages: TaskMessage[];
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

