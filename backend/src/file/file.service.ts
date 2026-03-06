import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SkillExecutionService } from '../skill-execution/skill-execution.service';
import { ExecutionRecord } from '../skill-execution/interfaces/execution-record.interface';

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

@Injectable()
export class FileService {
  constructor(
    private readonly configService: ConfigService,
    private readonly skillExecutionService: SkillExecutionService,
  ) {}

  getOpenclawRoot(): string | null {
    const root = this.configService.get<string>('OPENCLAW_ROOT');
    return root?.trim() ? root : null;
  }

  private taskIdToSkill(record: ExecutionRecord, taskId: string): string {
    const task = record.tasks?.find((t) => t.id === taskId);
    return task?.skill ?? 'none';
  }

  private taskIdToCreatedAt(record: ExecutionRecord, taskId: string): string | null {
    const task = record.tasks?.find((t) => t.id === taskId);
    if (!task) return null;
    if (task.endedAt) return task.endedAt;
    if (task.startedAt) return task.startedAt;
    return record.timestamp ?? null;
  }

  async getFiles(): Promise<FileItem[]> {
    const records = await this.skillExecutionService.getRecords();
    const map = new Map<string, { item: FileItem; recordTs: string }>();

    for (const record of records) {
      const recordTs = record.timestamp ?? '';
      const artifacts = record.artifacts ?? [];

      for (const art of artifacts) {
        const filePath = art.absolutePath?.trim();
        if (!filePath) continue;

        const skillName = art.taskId
          ? this.taskIdToSkill(record, art.taskId)
          : 'none';
        const createdAt = art.taskId
          ? this.taskIdToCreatedAt(record, art.taskId)
          : null;
        const fileName = art.fileName ?? path.basename(filePath);

        const item: FileItem = {
          fileName,
          filePath,
          createdAt,
          skillName,
        };

        const existing = map.get(filePath);
        if (!existing || recordTs > existing.recordTs) {
          map.set(filePath, { item, recordTs });
        }
      }
    }

    return Array.from(map.values()).map((x) => x.item);
  }

  async getFileByPath(filePath: string): Promise<FileItem | null> {
    const files = await this.getFiles();
    const normalized = path.normalize(filePath);
    return files.find((f) => path.normalize(f.filePath) === normalized) ?? null;
  }

  async getFileContent(filePath: string): Promise<string | null> {
    const files = await this.getFiles();
    const normalized = path.normalize(filePath);
    const allowed = files.some((f) => path.normalize(f.filePath) === normalized);
    if (!allowed) return null;

    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  async getFileTree(): Promise<FileTreeNode[]> {
    const files = await this.getFiles();
    const byDir = new Map<string, FileItem[]>();

    for (const file of files) {
      const dirPath = path.dirname(file.filePath);
      const list = byDir.get(dirPath) ?? [];
      list.push(file);
      byDir.set(dirPath, list);
    }

    return Array.from(byDir.entries())
      .map(([dirPath, dirFiles]) => ({
        name: path.basename(dirPath),
        path: dirPath,
        files: dirFiles,
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  async getFileStats(): Promise<FileStats> {
    const files = await this.getFiles();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    let today = 0;
    let thisWeek = 0;

    for (const f of files) {
      const ts = f.createdAt;
      if (!ts) continue;
      const d = new Date(ts);
      if (d >= startOfToday) today++;
      if (d >= startOfWeek) thisWeek++;
    }

    return {
      today,
      thisWeek,
      total: files.length,
    };
  }
}
