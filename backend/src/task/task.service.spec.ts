import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs/promises';
import { TaskService } from './task.service';
import { SkillExecutionService } from '../skill-execution/skill-execution.service';
import { ExecutionRecord } from '../skill-execution/interfaces/execution-record.interface';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

describe('TaskService', () => {
  let service: TaskService;
  let skillExecutionService: SkillExecutionService;
  const mockedReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: SkillExecutionService,
          useValue: {
            getOpenclawRoot: jest.fn(),
            getRecords: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    skillExecutionService = module.get<SkillExecutionService>(SkillExecutionService);
    mockedReadFile.mockReset();
  });

  describe('getTasks()', () => {
    it('collects messages from startMessageId and excludes the last non-user anchor', async () => {
      const records: ExecutionRecord[] = [
        {
          sessionId: 's-1',
          sessionFile: '/tmp/session-1.jsonl',
          startMessageId: 'm-1',
          tasks: [
            { id: 'task-1', name: '天气查询', skill: 'weather', startedAt: '2026-03-05T08:54:00Z', endedAt: '2026-03-05T08:54:10Z' },
          ],
          artifacts: [],
        },
      ];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      mockedReadFile.mockResolvedValue(
        [
          JSON.stringify({
            id: 'm-1',
            timestamp: '2026-03-05T08:54:00Z',
            message: { role: 'user', content: [{ type: 'text', text: '查询天气' }] },
          }),
          JSON.stringify({
            id: 'm-2',
            timestamp: '2026-03-05T08:54:05Z',
            message: { role: 'assistant', content: [{ type: 'text', text: '杭州晴天' }] },
          }),
          JSON.stringify({
            id: 'm-3',
            timestamp: '2026-03-05T08:54:07Z',
            message: { role: 'user', content: [{ type: 'text', text: '再看明天' }] },
          }),
          JSON.stringify({
            id: 'm-4',
            timestamp: '2026-03-05T08:54:09Z',
            message: { role: 'assistant', content: [{ type: 'text', text: '明天多云' }] },
          }),
        ].join('\n'),
      );

      const tasks = await service.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].messages).toEqual([
        { role: 'user', content: '查询天气', timestamp: '2026-03-05T08:54:00Z' },
        { role: 'assistant', content: '杭州晴天', timestamp: '2026-03-05T08:54:05Z' },
        { role: 'user', content: '再看明天', timestamp: '2026-03-05T08:54:07Z' },
      ]);
    });

    it('returns empty messages array when sessionFile is missing or unreadable', async () => {
      const records: ExecutionRecord[] = [
        {
          sessionId: 's-1',
          sessionFile: '/tmp/not-found.jsonl',
          startMessageId: 'm-1',
          tasks: [
            { id: 'task-1', skill: 'none', startedAt: '2026-03-05T08:54:00Z', endedAt: '2026-03-05T08:54:10Z' },
          ],
          artifacts: [],
        },
      ];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      mockedReadFile.mockRejectedValue(new Error('ENOENT'));

      const tasks = await service.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].messages).toEqual([]);
    });

    it('returns empty messages array when startMessageId is not found', async () => {
      const records: ExecutionRecord[] = [
        {
          sessionId: 's-1',
          sessionFile: '/tmp/session-1.jsonl',
          startMessageId: 'm-not-exist',
          tasks: [
            { id: 'task-1', name: '任务A', skill: 'weather', startedAt: '2026-03-05T08:54:00Z', endedAt: '2026-03-05T08:54:10Z' },
          ],
          artifacts: [],
        },
      ];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      mockedReadFile.mockResolvedValue(
        JSON.stringify({
          id: 'm-1',
          timestamp: '2026-03-05T08:54:00Z',
          message: { role: 'user', content: [{ type: 'text', text: 'hello' }] },
        }),
      );

      const tasks = await service.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].messages).toEqual([]);
    });

    it('joins multiple text blocks with newline for content', async () => {
      const records: ExecutionRecord[] = [
        {
          sessionId: 's-1',
          sessionFile: '/tmp/session-2.jsonl',
          startMessageId: 'm-1',
          tasks: [
            { id: 'task-1', name: '任务A', skill: 'none', startedAt: '2026-03-05T08:54:00Z', endedAt: '2026-03-05T08:54:10Z' },
          ],
          artifacts: [],
        },
      ];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      mockedReadFile.mockResolvedValue(
        [
          JSON.stringify({
            id: 'm-1',
            timestamp: '2026-03-05T08:54:00Z',
            message: {
              role: 'assistant',
              content: [
                { type: 'text', text: '第一段' },
                { type: 'image', text: 'ignored' },
                { type: 'text', text: '第二段' },
              ],
            },
          }),
          JSON.stringify({
            id: 'm-2',
            timestamp: '2026-03-05T08:54:10Z',
            message: { role: 'assistant', content: [{ type: 'text', text: '结束锚点' }] },
          }),
        ].join('\n'),
      );

      const tasks = await service.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].messages).toEqual([
        {
          role: 'assistant',
          content: '第一段\n第二段',
          timestamp: '2026-03-05T08:54:00Z',
        },
      ]);
    });
  });
});
