export interface FileItem {
  fileName: string;
  filePath: string;
  createdAt: string | null;
  skillName: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  files: FileItem[];
}

export interface FileStats {
  today: number;
  thisWeek: number;
  total: number;
}

export type FileErrorType = 'unavailable' | 'not_found' | 'network' | 'unknown';

export interface FileApiError {
  type: FileErrorType;
  message: string;
  statusCode?: number;
}

