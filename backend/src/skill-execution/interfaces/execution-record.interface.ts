export interface ArtifactRecord {
  taskId?: string;
  fileName: string;
  fileSize?: number;
  absolutePath: string;
}

export interface TaskRecord {
  id: string;
  name?: string;
  skill?: string;
  taskType?: string;
  scheduledName?: string | null;
  detail?: string;
  status?: string;
  startedAt?: string;
  endedAt?: string;
  output?: string | null;
  error?: string | null;
}

export interface MessageRecord {
  role: string;
  content: Array<Record<string, unknown>>;
  isError?: boolean;
  timestamp?: string;
}

export interface ExecutionRecord {
  sessionId?: string;
  sessionFile?: string;
  startMessageId?: string;
  turnId?: string;
  turnName?: string;
  timestamp?: string;
  messages?: MessageRecord[];
  skills?: Array<{
    name: string;
    description?: string;
  }>;
  tasks?: TaskRecord[];
  artifacts?: ArtifactRecord[];
}

