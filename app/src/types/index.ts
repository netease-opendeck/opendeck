export type Role = 'user' | 'expert' | 'system';

export type IdentityId =
  | 'productManager'
  | 'developer'
  | 'marketing'
  | 'designer'
  | 'contentCreator'
  | 'dataAnalyst'
  | 'custom';

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: Role;
  userType: 'consumer' | 'producer';
  identities?: (IdentityId | string)[];
  language: string;
  balance: number;
}

export interface Expert {
  id: string;
  userId: string;
  name: string;
  title: string;
  description: string;
  avatar: string;
  specialties: string[];
  rating: number;
  solutionsCount: number;
}

export interface SolutionStep {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  description?: string;
  contextSummary?: string;
}

export interface Solution {
  id: string;
  expertId: string;
  title: string;
  description: string;
  price: number;
  paymentType: 'subscription' | 'one-time' | 'per-use';
  tags: string[];
  version: string;
  status: 'active' | 'draft';
  features: string[];
  steps?: SolutionStep[];
  skillDoc?: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'review';
  progress: number;
  solutionId?: string;
  executionSteps?: SolutionStep[];
  expertId?: string;
  createdAt: Date;
  updatedAt: Date;
  parameters: Record<string, unknown>;
  artifacts: Artifact[];
  isGroup?: boolean;
  triggerUserPrompt?: string;
  triggerMessageId?: string;
}

export interface Artifact {
  id: string;
  type: 'file' | 'link' | 'text';
  title: string;
  url?: string;
  content?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon?: string;
  parameters?: string[];
}

// Legacy 类型，仅用于历史方案相关代码，新的技能模块请使用 SkillListItem / SkillDetail。
export interface MySolutionItem {
  id: string;
  name: string;
  description?: string;
  skillDoc?: string;
  status: 'enabled' | 'disabled';
  revenue: number;
  userCount?: number;
  useCount?: number;
  reviews?: {
    id: string;
    userName: string;
    rating: number;
    content: string;
    date: string;
  }[];
}

export * from './skill';
export * from './file';
export * from './task-history';
