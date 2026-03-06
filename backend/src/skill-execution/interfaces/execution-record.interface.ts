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
  error?: string | null;
}

export interface ExecutionRecord {
  sessionId?: string;
  turnId?: string;
  timestamp?: string;
  skills?: Array<{
    name: string;
    description?: string;
  }>;
  tasks?: TaskRecord[];
  artifacts?: ArtifactRecord[];
}

