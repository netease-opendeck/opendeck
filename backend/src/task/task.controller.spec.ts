import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { SkillExecutionService } from '../skill-execution/skill-execution.service';

describe('TaskController', () => {
  let controller: TaskController;
  let taskService: TaskService;
  let skillExecutionService: SkillExecutionService;

  const mockTasks = [
    {
      taskName: '合肥天气查询',
      skillName: 'weather',
      startedAt: '2026-03-05T08:54:00Z',
      endedAt: '2026-03-05T08:54:10Z',
      error: null,
      detail: '查询合肥当前天气及三天预报',
      artifacts: [],
    },
  ];

  const mockStats = { today: 1, thisWeek: 2, total: 3 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        {
          provide: TaskService,
          useValue: {
            getTasks: jest.fn(),
            getTaskStats: jest.fn(),
          },
        },
        {
          provide: SkillExecutionService,
          useValue: {
            getOpenclawRoot: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
    taskService = module.get<TaskService>(TaskService);
    skillExecutionService = module.get<SkillExecutionService>(SkillExecutionService);
  });

  describe('GET /tasks', () => {
    it('returns { tasks: [...] } when normal', async () => {
      jest.spyOn(skillExecutionService, 'getOpenclawRoot').mockReturnValue('/tmp');
      jest.spyOn(taskService, 'getTasks').mockResolvedValue(mockTasks as any);

      const result = await controller.getTasks();
      expect(result).toEqual({ tasks: mockTasks });
    });

    it('throws 503 when OPENCLAW_ROOT is not configured', async () => {
      jest.spyOn(skillExecutionService, 'getOpenclawRoot').mockReturnValue(null);

      await expect(controller.getTasks()).rejects.toMatchObject({
        status: HttpStatus.SERVICE_UNAVAILABLE,
        response: {
          statusCode: 503,
          message: 'OPENCLAW_ROOT not configured',
          error: 'Service Unavailable',
        },
      });
    });
  });

  describe('GET /tasks/stats', () => {
    it('returns 200 with stats', async () => {
      jest.spyOn(skillExecutionService, 'getOpenclawRoot').mockReturnValue('/tmp');
      jest.spyOn(taskService, 'getTaskStats').mockResolvedValue(mockStats as any);

      const result = await controller.getTaskStats();
      expect(result).toEqual(mockStats);
    });

    it('throws 503 when OPENCLAW_ROOT is not configured', async () => {
      jest.spyOn(skillExecutionService, 'getOpenclawRoot').mockReturnValue(null);

      await expect(controller.getTaskStats()).rejects.toMatchObject({
        status: HttpStatus.SERVICE_UNAVAILABLE,
      });
    });
  });
});

