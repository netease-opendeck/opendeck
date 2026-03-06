import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service';
import { SkillExecutionService } from '../skill-execution/skill-execution.service';
import { ExecutionRecord } from '../skill-execution/interfaces/execution-record.interface';

describe('TaskService', () => {
  let service: TaskService;
  let skillExecutionService: SkillExecutionService;

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
  });

  describe('getTasks()', () => {
    it('includes messages on each task from record.messages', async () => {
      const records: ExecutionRecord[] = [
        {
          sessionId: 's1',
          turnId: 'turn-1',
          timestamp: '2026-03-05T08:54:00Z',
          messages: [
            { role: 'user', content: '查询天气', timestamp: '2026-03-05T08:54:00Z' },
            { role: 'assistant', content: '晴，15°C。', timestamp: '2026-03-05T08:54:10Z' },
          ],
          tasks: [
            { id: 'task-1', name: '天气查询', skill: 'weather', startedAt: '2026-03-05T08:54:00Z', endedAt: '2026-03-05T08:54:10Z' },
          ],
          artifacts: [],
        },
      ];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);

      const tasks = await service.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].messages).toEqual([
        { role: 'user', content: '查询天气', timestamp: '2026-03-05T08:54:00Z' },
        { role: 'assistant', content: '晴，15°C。', timestamp: '2026-03-05T08:54:10Z' },
      ]);
    });

    it('returns empty messages array when record has no messages', async () => {
      const records: ExecutionRecord[] = [
        {
          sessionId: 's1',
          turnId: 'turn-1',
          tasks: [
            { id: 'task-1', skill: 'none', startedAt: '2026-03-05T08:54:00Z', endedAt: '2026-03-05T08:54:10Z' },
          ],
          artifacts: [],
        },
      ];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);

      const tasks = await service.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].messages).toEqual([]);
    });

    it('shares same messages for all tasks in one record', async () => {
      const sharedMessages = [
        { role: 'user', content: '做两件事', timestamp: '2026-03-05T08:54:00Z' },
        { role: 'assistant', content: '好的。', timestamp: '2026-03-05T08:54:30Z' },
      ];
      const records: ExecutionRecord[] = [
        {
          sessionId: 's1',
          turnId: 'turn-1',
          messages: sharedMessages,
          tasks: [
            { id: 'task-1', name: '任务A', skill: 'weather', startedAt: '2026-03-05T08:54:00Z', endedAt: '2026-03-05T08:54:10Z' },
            { id: 'task-2', name: '任务B', skill: 'none', startedAt: '2026-03-05T08:54:00Z', endedAt: '2026-03-05T08:54:55Z' },
          ],
          artifacts: [],
        },
      ];
      jest.spyOn(skillExecutionService, 'getRecords').mockResolvedValue(records);

      const tasks = await service.getTasks();

      expect(tasks).toHaveLength(2);
      expect(tasks[0].messages).toEqual(sharedMessages);
      expect(tasks[1].messages).toEqual(sharedMessages);
    });
  });
});
