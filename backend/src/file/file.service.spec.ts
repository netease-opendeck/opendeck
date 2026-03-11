import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileService } from './file.service';
import { SkillExecutionService } from '../skill-execution/skill-execution.service';
import { ExecutionRecord } from '../skill-execution/interfaces/execution-record.interface';

const FIXTURES_ROOT = path.join(process.cwd(), 'test', 'fixtures', 'file-root');
const MEMORY_DIR = path.join(FIXTURES_ROOT, 'memory');
const IRAN_PATH = path.join(MEMORY_DIR, 'iran-news-report-2026-03-05.md');
const OPENCLAW_PATH = path.join(MEMORY_DIR, 'openclaw-news-report-2026-03-05.md');
const JSONL_PATH = path.join(MEMORY_DIR, 'skill-execution.jsonl');
const REFLECTION_DIR = path.join(FIXTURES_ROOT, 'workspace', 'memory', 'reflection');
const REFLECTION_PATH = path.join(REFLECTION_DIR, 'reflection-2026-03-01.md');
const NESTED_REFLECTION_DIR = path.join(REFLECTION_DIR, 'nested');
const NESTED_REFLECTION_PATH = path.join(NESTED_REFLECTION_DIR, 'note.md');

const createJsonl = () => {
  const line1 = JSON.stringify({
    sessionId: 'agent:main:main',
    turnId: 'turn-5',
    timestamp: '2026-03-05T08:54:00Z',
    skills: [{ name: 'weather' }],
    tasks: [
      { id: 'task-1', skill: 'weather', endedAt: '2026-03-05T08:54:10Z', startedAt: '2026-03-05T08:54:00Z' },
      { id: 'task-2', skill: 'none', endedAt: '2026-03-05T08:54:55Z', startedAt: '2026-03-05T08:54:00Z' },
    ],
    artifacts: [
      { taskId: 'task-2', fileName: 'iran-news-report-2026-03-05.md', fileSize: 1332, absolutePath: IRAN_PATH },
    ],
  });
  const line2 = JSON.stringify({
    sessionId: 'agent:main:main',
    turnId: 'turn-3',
    timestamp: '2026-03-05T08:44:00Z',
    skills: [],
    tasks: [{ id: 'task-1', skill: 'none', endedAt: '2026-03-05T08:44:45Z', startedAt: '2026-03-05T08:44:00Z' }],
    artifacts: [
      { fileName: 'openclaw-news-report-2026-03-05.md', fileSize: 1988, absolutePath: OPENCLAW_PATH },
    ],
  });
  return line1 + '\n' + line2 + '\n';
};

describe('FileService', () => {
  let service: FileService;
  let configService: ConfigService;
  let skillExecutionService: SkillExecutionService;

  beforeAll(async () => {
    await fs.mkdir(MEMORY_DIR, { recursive: true });
    await fs.mkdir(NESTED_REFLECTION_DIR, { recursive: true });
    await fs.writeFile(JSONL_PATH, createJsonl());
    await fs.writeFile(REFLECTION_PATH, '# reflection day 1\n');
    await fs.writeFile(NESTED_REFLECTION_PATH, '# nested reflection\n');
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENCLAW_ROOT') return FIXTURES_ROOT;
              if (key === 'OPENCLAW_SKILL_EXECUTION_PATH') return undefined;
              return undefined;
            }),
          },
        },
        {
          provide: SkillExecutionService,
          useValue: {
            getRecords: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    configService = module.get<ConfigService>(ConfigService);
    skillExecutionService = module.get<SkillExecutionService>(SkillExecutionService);

    const defaultRecords: ExecutionRecord[] = JSON.parse(
      '[' + createJsonl().split('\n').filter(Boolean).join(',') + ']',
    ) as ExecutionRecord[];
    (skillExecutionService.getRecords as jest.Mock).mockResolvedValue(defaultRecords);
  });

  describe('getFiles()', () => {
    it('returns empty array when OPENCLAW_ROOT is not configured', async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'OPENCLAW_ROOT') return null;
        return undefined;
      });
      const result = await service.getFiles();
      expect(result).toEqual([]);
    });

    it('includes reflection markdown files recursively', async () => {
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue([]);
      const result = await service.getFiles();
      expect(result.some((f) => f.filePath === REFLECTION_PATH)).toBe(true);
      expect(result.some((f) => f.filePath === NESTED_REFLECTION_PATH)).toBe(true);
    });

    it('returns parsed file list for valid records', async () => {
      const records: ExecutionRecord[] = JSON.parse(
        '[' + createJsonl().split('\n').filter(Boolean).join(',') + ']',
      ) as ExecutionRecord[];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      const result = await service.getFiles();
      expect(result.length).toBe(4);

      const iran = result.find((f) => f.fileName === 'iran-news-report-2026-03-05.md');
      expect(iran).toBeDefined();
      expect(iran!.skillName).toBe('none');
      expect(iran!.createdAt).toBe('2026-03-05T08:54:55Z');

      const openclaw = result.find((f) => f.fileName === 'openclaw-news-report-2026-03-05.md');
      expect(openclaw).toBeDefined();
      expect(openclaw!.skillName).toBe('none');
      expect(openclaw!.createdAt).toBeNull();

      const reflection = result.find((f) => f.filePath === REFLECTION_PATH);
      expect(reflection).toBeDefined();
      expect(reflection!.skillName).toBe('reflection');
    });

    it('artifact with taskId gets skillName from tasks', async () => {
      const records: ExecutionRecord[] = JSON.parse(
        '[' + createJsonl().split('\n').filter(Boolean).join(',') + ']',
      ) as ExecutionRecord[];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      const result = await service.getFiles();
      const iran = result.find((f) => f.fileName === 'iran-news-report-2026-03-05.md');
      expect(iran!.skillName).toBe('none');
    });

    it('artifact without taskId has skillName none and createdAt null', async () => {
      const records: ExecutionRecord[] = JSON.parse(
        '[' + createJsonl().split('\n').filter(Boolean).join(',') + ']',
      ) as ExecutionRecord[];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      const result = await service.getFiles();
      const openclaw = result.find((f) => f.fileName === 'openclaw-news-report-2026-03-05.md');
      expect(openclaw!.skillName).toBe('none');
      expect(openclaw!.createdAt).toBeNull();
    });

    it('artifact with taskId gets createdAt from task.endedAt', async () => {
      const records: ExecutionRecord[] = JSON.parse(
        '[' + createJsonl().split('\n').filter(Boolean).join(',') + ']',
      ) as ExecutionRecord[];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      const result = await service.getFiles();
      const iran = result.find((f) => f.fileName === 'iran-news-report-2026-03-05.md');
      expect(iran!.createdAt).toBe('2026-03-05T08:54:55Z');
    });

    it('artifact with taskId but task has no endedAt uses startedAt', async () => {
      const line = JSON.stringify({
        timestamp: '2026-03-05T09:00:00Z',
        tasks: [{ id: 't1', skill: 'test', startedAt: '2026-03-05T09:00:05Z' }],
        artifacts: [{ taskId: 't1', fileName: 'test.md', absolutePath: path.join(MEMORY_DIR, 'test.md') }],
      });
      const records: ExecutionRecord[] = [JSON.parse(line) as ExecutionRecord];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      const result = await service.getFiles();
      const testFile = result.find((f) => f.filePath === path.join(MEMORY_DIR, 'test.md'));
      expect(testFile).toBeDefined();
      expect(testFile!.createdAt).toBe('2026-03-05T09:00:05Z');
    });

    it('deduplicates by absolutePath keeping latest by record timestamp', async () => {
      const dupLine = JSON.stringify({
        timestamp: '2026-03-06T10:00:00Z',
        tasks: [{ id: 'task-1', skill: 'weather', endedAt: '2026-03-06T10:00:10Z' }],
        artifacts: [{ taskId: 'task-1', fileName: 'iran-news-report-2026-03-05.md', absolutePath: IRAN_PATH }],
      });
      const records: ExecutionRecord[] = JSON.parse(
        '[' +
          createJsonl()
            .split('\n')
            .filter(Boolean)
            .concat(dupLine)
            .join(',') +
          ']',
      ) as ExecutionRecord[];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      const result = await service.getFiles();
      const iran = result.find((f) => f.filePath === IRAN_PATH);
      expect(iran).toBeDefined();
      expect(iran!.createdAt).toBe('2026-03-06T10:00:10Z');
    });

    it('prefers artifacts when path overlaps reflection file', async () => {
      const records: ExecutionRecord[] = [
        {
          timestamp: '2026-03-08T10:00:00Z',
          tasks: [{ id: 'task-r', skill: 'writer', endedAt: '2026-03-08T10:00:10Z' }],
          artifacts: [{ taskId: 'task-r', fileName: path.basename(REFLECTION_PATH), absolutePath: REFLECTION_PATH }],
        } as unknown as ExecutionRecord,
      ];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);

      const result = await service.getFiles();
      const samePath = result.find((f) => f.filePath === REFLECTION_PATH);
      expect(samePath).toBeDefined();
      expect(samePath!.skillName).toBe('writer');
      expect(samePath!.createdAt).toBe('2026-03-08T10:00:10Z');
    });

    it('sorts by createdAt desc with nulls last', async () => {
      const records: ExecutionRecord[] = JSON.parse(
        '[' + createJsonl().split('\n').filter(Boolean).join(',') + ']',
      ) as ExecutionRecord[];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);

      const result = await service.getFiles();
      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1].createdAt ? Date.parse(result[i - 1].createdAt as string) : Number.NaN;
        const curr = result[i].createdAt ? Date.parse(result[i].createdAt as string) : Number.NaN;
        if (Number.isFinite(prev) && Number.isFinite(curr)) {
          expect(prev).toBeGreaterThanOrEqual(curr);
        }
        if (!Number.isFinite(prev)) {
          expect(Number.isFinite(curr)).toBe(false);
        }
      }
    });
  });

  describe('getFilesResult()', () => {
    it('returns warnings when reflection directory cannot be read', async () => {
      jest
        .spyOn(service as unknown as { getReflectionRoot: (root: string) => string }, 'getReflectionRoot')
        .mockReturnValue(path.join(FIXTURES_ROOT, 'workspace', 'memory', 'missing-reflection'));
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue([]);

      const result = await service.getFilesResult();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].scope).toBe('reflection-scan');
    });
  });

  describe('getFileTree()', () => {
    it('returns tree grouped by directory', async () => {
      const result = await service.getFileTree();
      expect(result.length).toBeGreaterThan(0);
      const memory = result.find((n) => n.name === 'memory');
      expect(memory).toBeDefined();
      expect(memory!.files.length).toBe(2);
    });
  });

  describe('getFileTreeResult()', () => {
    it('returns tree and warnings', async () => {
      const result = await service.getFileTreeResult();
      expect(Array.isArray(result.tree)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('getFileStats()', () => {
    it('returns today, thisWeek, total', async () => {
      const result = await service.getFileStats();
      expect(result).toHaveProperty('today');
      expect(result).toHaveProperty('thisWeek');
      expect(result).toHaveProperty('total');
      expect(result.total).toBe(4);
    });
  });

  describe('getFileStatsResult()', () => {
    it('returns stats and warnings', async () => {
      const result = await service.getFileStatsResult();
      expect(result).toHaveProperty('today');
      expect(result).toHaveProperty('thisWeek');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('warnings');
    });
  });

  describe('getFileByPath()', () => {
    it('returns file when path exists', async () => {
      const result = await service.getFileByPath(IRAN_PATH);
      expect(result).not.toBeNull();
      expect(result!.fileName).toBe('iran-news-report-2026-03-05.md');
    });

    it('returns null when path does not exist', async () => {
      const result = await service.getFileByPath('/nonexistent/path/file.md');
      expect(result).toBeNull();
    });
  });

  describe('getFileContent()', () => {
    it('returns content when file exists and is in whitelist', async () => {
      const result = await service.getFileContent(IRAN_PATH);
      expect(result).not.toBeNull();
      expect(result).toContain('Iran News Report');
    });

    it('returns null when path is not in whitelist', async () => {
      const result = await service.getFileContent('/etc/passwd');
      expect(result).toBeNull();
    });
  });
});
