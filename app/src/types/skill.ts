export type SkillStatus = 'enabled' | 'disabled';

export interface SkillListItem {
  slug: string;
  name: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  status: SkillStatus;
}

export interface SkillDetail extends SkillListItem {
  doc: string;
}

export type SkillErrorType = 'not_found' | 'unavailable' | 'network' | 'unknown';

export interface SkillApiError {
  type: SkillErrorType;
  message: string;
  statusCode?: number;
}

