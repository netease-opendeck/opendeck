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

export interface FileWarningItem {
  scope: 'reflection-scan' | 'reflection-stat';
  path: string;
  code: string;
  message?: string;
}

export interface FilesResult {
  files: FileItem[];
  warnings: FileWarningItem[];
}

export interface FileTreeResult {
  tree: FileTreeNode[];
  warnings: FileWarningItem[];
}

export interface FileStatsResult extends FileStats {
  warnings: FileWarningItem[];
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

  private getReflectionRoot(root: string): string {
    return path.join(root, 'workspace', 'memory', 'reflection');
  }

  private parseReflectionDateFromName(fileName: string): string | null {
    const matched = /^reflection-(\d{4})-(\d{2})-(\d{2})\.md$/i.exec(fileName);
    if (!matched) return null;
    const y = Number(matched[1]);
    const m = Number(matched[2]);
    const d = Number(matched[3]);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
    const date = new Date(Date.UTC(y, m - 1, d));
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  private statBirthOrCtimeIso(stat: { birthtime: Date; ctime: Date }): string | null {
    const birthMs = stat.birthtime?.getTime?.() ?? Number.NaN;
    if (Number.isFinite(birthMs) && birthMs > 0) return new Date(birthMs).toISOString();
    const ctimeMs = stat.ctime?.getTime?.() ?? Number.NaN;
    if (Number.isFinite(ctimeMs) && ctimeMs > 0) return new Date(ctimeMs).toISOString();
    return null;
  }

  private compareByCreatedAtDesc(a: FileItem, b: FileItem): number {
    const ta = a.createdAt ? Date.parse(a.createdAt) : Number.NaN;
    const tb = b.createdAt ? Date.parse(b.createdAt) : Number.NaN;
    const aValid = Number.isFinite(ta);
    const bValid = Number.isFinite(tb);
    if (aValid && bValid && ta !== tb) return tb - ta;
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;
    return a.filePath.localeCompare(b.filePath);
  }

  private toWarning(
    scope: FileWarningItem['scope'],
    warningPath: string,
    code: string,
    message?: string,
  ): FileWarningItem {
    return { scope, path: warningPath, code, message };
  }

  private async collectReflectionFiles(root: string): Promise<FilesResult> {
    const reflectionRoot = this.getReflectionRoot(root);
    const warnings: FileWarningItem[] = [];
    const items: FileItem[] = [];

    const walk = async (currentDir: string): Promise<void> => {
      let entries: string[];
      try {
        entries = await fs.readdir(currentDir);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        warnings.push(
          this.toWarning(
            'reflection-scan',
            currentDir,
            err?.code ?? 'READDIR_FAILED',
            err?.message,
          ),
        );
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        let stat: Awaited<ReturnType<typeof fs.stat>>;
        try {
          stat = await fs.stat(fullPath);
        } catch (error) {
          const err = error as NodeJS.ErrnoException;
          warnings.push(
            this.toWarning(
              'reflection-stat',
              fullPath,
              err?.code ?? 'STAT_FAILED',
              err?.message,
            ),
          );
          continue;
        }

        if (stat.isDirectory()) {
          await walk(fullPath);
          continue;
        }
        if (!stat.isFile() || !entry.toLowerCase().endsWith('.md')) continue;

        const createdAt =
          this.statBirthOrCtimeIso(stat) ??
          this.parseReflectionDateFromName(entry);
        items.push({
          fileName: entry,
          filePath: fullPath,
          createdAt,
          skillName: 'reflection',
        });
      }
    };

    await walk(reflectionRoot);
    return { files: items, warnings };
  }

  private async collectArtifactFiles(): Promise<FileItem[]> {
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

  async getFilesResult(): Promise<FilesResult> {
    const root = this.getOpenclawRoot();
    if (!root) return { files: [], warnings: [] };

    const artifactFiles = await this.collectArtifactFiles();
    const reflection = await this.collectReflectionFiles(root);
    const merged = new Map<string, FileItem>();

    for (const item of reflection.files) merged.set(item.filePath, item);
    for (const item of artifactFiles) merged.set(item.filePath, item);

    const files = Array.from(merged.values()).sort((a, b) => this.compareByCreatedAtDesc(a, b));
    return { files, warnings: reflection.warnings };
  }

  async getFiles(): Promise<FileItem[]> {
    const result = await this.getFilesResult();
    return result.files;
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

  async getFileTreeResult(): Promise<FileTreeResult> {
    const result = await this.getFilesResult();
    const byDir = new Map<string, FileItem[]>();

    for (const file of result.files) {
      const dirPath = path.dirname(file.filePath);
      const list = byDir.get(dirPath) ?? [];
      list.push(file);
      byDir.set(dirPath, list);
    }

    const tree = Array.from(byDir.entries())
      .map(([dirPath, dirFiles]) => ({
        name: path.basename(dirPath),
        path: dirPath,
        files: dirFiles,
      }))
      .sort((a, b) => a.path.localeCompare(b.path));

    return { tree, warnings: result.warnings };
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

  async getFileStatsResult(): Promise<FileStatsResult> {
    const result = await this.getFilesResult();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    let today = 0;
    let thisWeek = 0;

    for (const f of result.files) {
      const ts = f.createdAt;
      if (!ts) continue;
      const d = new Date(ts);
      if (d >= startOfToday) today++;
      if (d >= startOfWeek) thisWeek++;
    }

    return {
      today,
      thisWeek,
      total: result.files.length,
      warnings: result.warnings,
    };
  }
}
