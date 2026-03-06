import axios, { AxiosError } from 'axios';
import type { FileApiError, FileItem, FileStats, FileTreeNode } from '@/types';

interface FilesResponse {
  files: FileItem[];
}

interface FileContentResponse {
  content: string;
}

interface BackendErrorBody {
  statusCode?: number;
  message?: string;
}

function normalizeFileError(error: unknown): FileApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<BackendErrorBody>;
    const status = axiosError.response?.status;
    const body = axiosError.response?.data;
    const statusCode = body?.statusCode ?? status;
    const message =
      body?.message ||
      axiosError.message ||
      '文件服务暂不可用，请稍后重试';

    if (status === 404) {
      return {
        type: 'not_found',
        message,
        statusCode,
      };
    }

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

export async function fetchFiles(): Promise<FileItem[]> {
  try {
    const res = await http.get<FilesResponse>('/files');
    return res.data.files ?? [];
  } catch (error) {
    throw normalizeFileError(error);
  }
}

export async function fetchFileTree(): Promise<FileTreeNode[]> {
  try {
    const res = await http.get<FileTreeNode[]>('/files/tree');
    return res.data ?? [];
  } catch (error) {
    throw normalizeFileError(error);
  }
}

export async function fetchFileStats(): Promise<FileStats> {
  try {
    const res = await http.get<FileStats>('/files/stats');
    return res.data;
  } catch (error) {
    throw normalizeFileError(error);
  }
}

export async function fetchFileContent(path: string): Promise<string> {
  try {
    const res = await http.get<FileContentResponse>('/files/content', {
      params: { path },
    });
    return res.data.content;
  } catch (error) {
    throw normalizeFileError(error);
  }
}

