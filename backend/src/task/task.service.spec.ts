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
  const local = (ms: number) => new Date(ms).toLocaleString();

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
    it('collects from start and stops before next user role', async () => {
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
            type: 'message',
            id: 'm-1',
            timestamp: '2026-03-05T08:54:00Z',
            message: {
              role: 'user',
              timestamp: 1773217559000,
              isError: false,
              content: [{ type: 'text', text: '查询天气' }],
            },
          }),
          JSON.stringify({
            type: 'message',
            id: 'm-2',
            timestamp: '2026-03-05T08:54:05Z',
            message: {
              role: 'assistant',
              timestamp: 1773217565000,
              content: [{ type: 'text', text: '杭州晴天' }],
            },
          }),
          JSON.stringify({
            type: 'message',
            id: 'm-3',
            timestamp: '2026-03-05T08:54:07Z',
            message: {
              role: 'toolResult',
              timestamp: 1773217570000,
              content: [{ type: 'text', text: 'exec done' }],
            },
          }),
          JSON.stringify({
            type: 'message',
            id: 'm-4',
            timestamp: '2026-03-05T08:54:09Z',
            message: {
              role: 'User',
              timestamp: 1773217580000,
              content: [{ type: 'text', text: '新一轮用户输入' }],
            },
          }),
          JSON.stringify({
            type: 'message',
            id: 'm-5',
            timestamp: '2026-03-05T08:54:11Z',
            message: {
              role: 'assistant',
              timestamp: 1773217590000,
              content: [{ type: 'text', text: '不应被包含' }],
            },
          }),
        ].join('\n'),
      );

      const tasks = await service.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].childrenTasks).toEqual([
        {
          id: 'm-1',
          role: 'user',
          timestamp: local(1773217559000),
          content: [{ type: 'text', text: '查询天气' }],
          isError: false,
          name: null,
          status: null,
          error: 'false',
        },
        {
          id: 'm-2',
          role: 'assistant',
          timestamp: local(1773217565000),
          content: [{ type: 'text', text: '杭州晴天' }],
          isError: false,
          name: null,
          status: null,
          error: 'false',
        },
        {
          id: 'm-3',
          role: 'toolResult',
          timestamp: local(1773217570000),
          content: [{ type: 'text', text: 'exec done' }],
          isError: false,
          name: null,
          status: null,
          error: 'false',
        },
      ]);
      expect(tasks[0].startedAt).toBe(new Date(1773217559000).toISOString());
      expect(tasks[0].endedAt).toBe(new Date(1773217570000).toISOString());
    });

    it('uses last matched startMessageId when duplicated', async () => {
      const records: ExecutionRecord[] = [
        {
          sessionId: 's-1',
          sessionFile: '/tmp/session-2.jsonl',
          startMessageId: 'start',
          tasks: [
            { id: 'task-1', skill: 'none', startedAt: '2026-03-05T08:54:00Z', endedAt: '2026-03-05T08:54:10Z' },
          ],
          artifacts: [],
        },
      ];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      mockedReadFile.mockResolvedValue(
        [
          JSON.stringify({
            type: 'message',
            id: 'start',
            message: { role: 'user', timestamp: 1000, content: [{ type: 'text', text: 'first start' }] },
          }),
          JSON.stringify({
            type: 'message',
            id: 'x-1',
            message: { role: 'assistant', timestamp: 2000, content: [{ type: 'text', text: 'first branch' }] },
          }),
          JSON.stringify({
            type: 'message',
            id: 'start',
            message: { role: 'user', timestamp: 3000, content: [{ type: 'text', text: 'last start' }] },
          }),
          JSON.stringify({
            type: 'message',
            id: 'x-2',
            message: { role: 'assistant', timestamp: 4000, content: [{ type: 'text', text: 'kept' }] },
          }),
          JSON.stringify({
            type: 'message',
            id: 'anchor',
            message: { role: ' user ', timestamp: 5000, content: [{ type: 'text', text: 'anchor user' }] },
          }),
        ].join('\n'),
      );

      const tasks = await service.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].childrenTasks).toHaveLength(2);
      expect(tasks[0].childrenTasks[0].content[0]).toEqual({ type: 'text', text: 'last start' });
      expect(tasks[0].childrenTasks[1].content[0]).toEqual({ type: 'text', text: 'kept' });
    });

    it('collects to file end when no next user is found', async () => {
      const records: ExecutionRecord[] = [
        {
          sessionId: 's-1',
          sessionFile: '/tmp/session-3.jsonl',
          startMessageId: 'm-1',
          tasks: [
            { id: 'task-1', name: '任务A', skill: 'weather', startedAt: '2026-03-05T08:54:00Z', endedAt: '2026-03-05T08:54:10Z' },
          ],
          artifacts: [],
        },
      ];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      mockedReadFile.mockResolvedValue(
        [
          JSON.stringify({
            type: 'message',
            id: 'm-1',
            message: { role: 'user', timestamp: 1000, content: [{ type: 'text', text: 'hello' }] },
          }),
          JSON.stringify({
            type: 'message',
            id: 'm-2',
            message: { role: 'assistant', timestamp: 2000, content: [{ type: 'text', text: 'world' }] },
          }),
        ].join('\n'),
      );

      const tasks = await service.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].childrenTasks).toHaveLength(2);
    });

    it('falls back to legacy task time when message timestamps are missing', async () => {
      const records: ExecutionRecord[] = [
        {
          sessionId: 's-1',
          sessionFile: '/tmp/session-4.jsonl',
          startMessageId: 'm-1',
          tasks: [
            { id: 'task-1', name: '任务A', skill: 'none', startedAt: '2026-03-05T08:54:00Z', endedAt: '2026-03-05T08:54:10Z' },
          ],
          artifacts: [],
        },
      ];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      mockedReadFile.mockResolvedValue(
        JSON.stringify({
          type: 'message',
          id: 'm-1',
          message: { role: 'user', content: [{ type: 'text', text: 'no ts' }] },
        }),
      );

      const tasks = await service.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].childrenTasks[0].timestamp).toBeNull();
      expect(tasks[0].startedAt).toBe('2026-03-05T08:54:00Z');
      expect(tasks[0].endedAt).toBe('2026-03-05T08:54:10Z');
    });

    it('returns empty childrenTasks when startMessageId is not found', async () => {
      const records: ExecutionRecord[] = [
        {
          sessionId: 's-1',
          sessionFile: '/tmp/session-5.jsonl',
          startMessageId: 'missing',
          tasks: [{ id: 'task-1', startedAt: '2026-03-05T08:54:00Z', endedAt: '2026-03-05T08:54:10Z' }],
          artifacts: [],
        },
      ];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      mockedReadFile.mockResolvedValue(
        JSON.stringify({
          type: 'message',
          id: 'm-1',
          message: { role: 'user', timestamp: 1000, content: [{ type: 'text', text: 'tail' }] },
        }),
      );

      const tasks = await service.getTasks();
      expect(tasks[0].childrenTasks).toEqual([]);
    });

    it('redacts sensitive fields and maps isError to boolean-like error string', async () => {
      const records: ExecutionRecord[] = [
        {
          sessionId: 's-1',
          sessionFile: '/tmp/session-6.jsonl',
          startMessageId: 'm-1',
          tasks: [{ id: 'task-1', startedAt: '2026-03-05T08:54:00Z', endedAt: '2026-03-05T08:54:10Z' }],
          artifacts: [],
        },
      ];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      mockedReadFile.mockResolvedValue(
        JSON.stringify({
          type: 'message',
          id: 'm-1',
          message: {
            role: 'assistant',
            timestamp: 1773217559000,
            isError: true,
            content: [
              {
                type: 'toolCall',
                name: 'exec',
                arguments: {
                  command: 'curl ...',
                  apiKey: 'abc123',
                  Authorization: 'Bearer my-token',
                },
              },
            ],
          },
        }),
      );

      const tasks = await service.getTasks();
      const firstBlock = tasks[0].childrenTasks[0].content[0] as Record<string, unknown>;
      const args = firstBlock.arguments as Record<string, unknown>;

      expect(args.apiKey).toBe('[REDACTED]');
      expect(args.Authorization).toBe('[REDACTED]');
      expect(tasks[0].childrenTasks[0].error).toBe('true');
    });

    it('strips Sender untrusted metadata prefix for user text content', async () => {
      const records: ExecutionRecord[] = [
        {
          sessionId: 's-1',
          sessionFile: '/tmp/session-7.jsonl',
          startMessageId: 'm-1',
          tasks: [{ id: 'task-1', startedAt: '2026-03-05T08:54:00Z', endedAt: '2026-03-05T08:54:10Z' }],
          artifacts: [],
        },
      ];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);
      mockedReadFile.mockResolvedValue(
        JSON.stringify({
          type: 'message',
          id: 'm-1',
          message: {
            role: 'user',
            timestamp: 1773217559000,
            content: [
              {
                type: 'text',
                text:
                  'Sender (untrusted metadata):\n```json\n{\n  "label": "openclaw-control-ui",\n  "id": "openclaw-control-ui"\n}\n```\n\n[Wed 2026-03-11 16:25 GMT+8]\n请读取 AGENTS.md',
              },
            ],
          },
        }),
      );

      const tasks = await service.getTasks();
      const firstBlock = tasks[0].childrenTasks[0].content[0] as Record<string, unknown>;
      expect(firstBlock.text).toBe('请读取 AGENTS.md');
    });
  });
});
