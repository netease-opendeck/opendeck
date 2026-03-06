import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { SkillController } from './skill.controller';
import { SkillService } from './skill.service';

describe('SkillController', () => {
  let controller: SkillController;
  let skillService: SkillService;

  const mockEnabledSkills = [
    {
      slug: 'aliyun-oss',
      name: '阿里云OSS技能',
      description: '描述',
      version: '0.1.0',
      createdAt: '2026-03-05T10:00:00.000Z',
      updatedAt: '2026-03-05T10:00:00.000Z',
      status: 'enabled' as const,
    },
  ];

  const mockSkillDetail = {
    ...mockEnabledSkills[0],
    doc: 'SKILL.md 正文',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SkillController],
      providers: [
        {
          provide: SkillService,
          useValue: {
            getSkillsPath: jest.fn(),
            getEnabledSkills: jest.fn(),
            getEnabledSkillBySlug: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SkillController>(SkillController);
    skillService = module.get<SkillService>(SkillService);
  });

  describe('GET /skills', () => {
    it('returns { skills: [...] } with only enabled skills when normal', async () => {
      jest.spyOn(skillService, 'getSkillsPath').mockReturnValue('/tmp/skills');
      jest.spyOn(skillService, 'getEnabledSkills').mockResolvedValue(mockEnabledSkills);

      const result = await controller.getSkills();
      expect(result).toEqual({ skills: mockEnabledSkills });
    });

    it('returns { skills: [] } when skills directory does not exist', async () => {
      jest.spyOn(skillService, 'getSkillsPath').mockReturnValue('/tmp/skills');
      jest.spyOn(skillService, 'getEnabledSkills').mockResolvedValue([]);

      const result = await controller.getSkills();
      expect(result).toEqual({ skills: [] });
    });

    it('throws 503 when OPENCLAW_ROOT is not configured', async () => {
      jest.spyOn(skillService, 'getSkillsPath').mockReturnValue(null);

      await expect(controller.getSkills()).rejects.toMatchObject({
        status: HttpStatus.SERVICE_UNAVAILABLE,
        response: {
          statusCode: 503,
          message: 'OPENCLAW_ROOT not configured',
          error: 'Service Unavailable',
        },
      });
    });
  });

  describe('GET /skills/:slug', () => {
    it('returns 200 with skill when slug exists', async () => {
      jest.spyOn(skillService, 'getSkillsPath').mockReturnValue('/tmp/skills');
      jest.spyOn(skillService, 'getEnabledSkillBySlug').mockResolvedValue(mockSkillDetail);

      const result = await controller.getSkillBySlug('aliyun-oss');
      expect(result).toEqual({ skill: mockSkillDetail });
    });

    it('throws 404 with JSON body when slug does not exist', async () => {
      jest.spyOn(skillService, 'getSkillsPath').mockReturnValue('/tmp/skills');
      jest.spyOn(skillService, 'getEnabledSkillBySlug').mockResolvedValue(null);

      await expect(controller.getSkillBySlug('nonexistent')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: {
          statusCode: 404,
          message: 'Skill not found',
          error: 'Not Found',
        },
      });
    });

    it('throws 404 when slug corresponds to disabled skill', async () => {
      jest.spyOn(skillService, 'getSkillsPath').mockReturnValue('/tmp/skills');
      jest.spyOn(skillService, 'getEnabledSkillBySlug').mockResolvedValue(null);

      await expect(controller.getSkillBySlug('disabled-skill')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: {
          statusCode: 404,
          message: 'Skill not found',
          error: 'Not Found',
        },
      });
    });

    it('throws 503 when OPENCLAW_ROOT is not configured', async () => {
      jest.spyOn(skillService, 'getSkillsPath').mockReturnValue(null);

      await expect(controller.getSkillBySlug('aliyun-oss')).rejects.toMatchObject({
        status: HttpStatus.SERVICE_UNAVAILABLE,
        response: {
          statusCode: 503,
          message: 'OPENCLAW_ROOT not configured',
          error: 'Service Unavailable',
        },
      });
    });
  });
});
