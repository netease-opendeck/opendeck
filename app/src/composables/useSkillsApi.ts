import axios, { AxiosError } from 'axios';
import type {
  SkillApiError,
  SkillDetail,
  SkillListItem,
} from '@/types';

interface SkillsListResponse {
  skills: SkillListItem[];
}

interface SkillDetailResponse {
  skill: SkillDetail;
}

interface BackendErrorBody {
  statusCode?: number;
  message?: string;
}

function normalizeSkillError(error: unknown): SkillApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<BackendErrorBody>;
    const status = axiosError.response?.status;
    const body = axiosError.response?.data;
    const statusCode = body?.statusCode ?? status;
    const message =
      body?.message ||
      axiosError.message ||
      '技能服务暂不可用，请稍后重试';

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

export async function fetchSkills(): Promise<SkillListItem[]> {
  try {
    const res = await http.get<SkillsListResponse>('/skills');
    return res.data.skills ?? [];
  } catch (error) {
    throw normalizeSkillError(error);
  }
}

export async function fetchSkillDetail(
  slug: string,
): Promise<SkillDetail> {
  try {
    const res = await http.get<SkillDetailResponse>(`/skills/${slug}`);
    return res.data.skill;
  } catch (error) {
    throw normalizeSkillError(error);
  }
}

