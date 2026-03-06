import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ExecutionRecord } from './interfaces/execution-record.interface';

@Injectable()
export class SkillExecutionService {
  private readonly defaultExecutionPath = 'memory/skill-execution.jsonl';

  constructor(private readonly configService: ConfigService) {}

  getOpenclawRoot(): string | null {
    const root = this.configService.get<string>('OPENCLAW_ROOT');
    return root?.trim() ? root : null;
  }

  getExecutionFilePath(): string | null {
    const root = this.getOpenclawRoot();
    if (!root) return null;
    const relPath =
      this.configService.get<string>('OPENCLAW_SKILL_EXECUTION_PATH') ??
      this.defaultExecutionPath;
    return path.join(root, relPath);
  }

  async getRecords(): Promise<ExecutionRecord[]> {
    const execPath = this.getExecutionFilePath();
    if (!execPath) return [];

    let content: string;
    try {
      content = await fs.readFile(execPath, 'utf-8');
    } catch {
      return [];
    }

    const lines = content.split('\n').filter((line) => line.trim());
    const records: ExecutionRecord[] = [];

    for (const line of lines) {
      try {
        const record = JSON.parse(line) as ExecutionRecord;
        records.push(record);
      } catch {
        // skip invalid line
      }
    }

    return records;
  }
}

