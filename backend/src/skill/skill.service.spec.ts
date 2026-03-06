import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { SkillService } from './skill.service';

const FIXTURES_ROOT = path.join(process.cwd(), 'test', 'fixtures', 'skills-root');

describe('SkillService', () => {
  let service: SkillService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENCLAW_ROOT') return FIXTURES_ROOT;
              if (key === 'OPENCLAW_SKILLS_PATH') return undefined;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SkillService>(SkillService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('getSkillsPath()', () => {
    it('returns null when OPENCLAW_ROOT is not configured', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OPENCLAW_ROOT') return undefined;
        return undefined;
      });
      const result = service.getSkillsPath();
      expect(result).toBeNull();
    });

    it('returns {root}/workspace/skills when only OPENCLAW_ROOT is set', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OPENCLAW_ROOT') return '/tmp/openclaw';
        if (key === 'OPENCLAW_SKILLS_PATH') return undefined;
        return undefined;
      });
      const result = service.getSkillsPath();
      expect(result).toBe(path.join('/tmp/openclaw', 'workspace/skills'));
    });

    it('returns {root}/{customPath} when OPENCLAW_SKILLS_PATH is set', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OPENCLAW_ROOT') return '/tmp/openclaw';
        if (key === 'OPENCLAW_SKILLS_PATH') return 'custom/skills';
        return undefined;
      });
      const result = service.getSkillsPath();
      expect(result).toBe(path.join('/tmp/openclaw', 'custom/skills'));
    });
  });

  describe('loadOpenclawConfig()', () => {
    it('returns empty object when openclaw.json does not exist', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OPENCLAW_ROOT') return '/nonexistent/path';
        return undefined;
      });
      const result = await service.loadOpenclawConfig();
      expect(result).toEqual({});
    });

    it('returns parsed entries when openclaw.json exists and is valid', async () => {
      const result = await service.loadOpenclawConfig();
      expect(result).toHaveProperty('aliyun-oss');
      expect(result['aliyun-oss']).toEqual({ enabled: true });
      expect(result['disabled-by-config']).toEqual({ enabled: false });
    });

    it('returns empty object when openclaw.json has invalid JSON', async () => {
      const invalidRoot = path.join(process.cwd(), 'test', 'fixtures', 'skills-invalid-json');
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OPENCLAW_ROOT') return invalidRoot;
        return undefined;
      });
      const result = await service.loadOpenclawConfig();
      expect(result).toEqual({});
    });
  });

  describe('scanSkills()', () => {
    it('returns empty array when skills directory does not exist', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OPENCLAW_ROOT') return '/nonexistent/path';
        return undefined;
      });
      const result = await service.scanSkills();
      expect(result).toEqual([]);
    });

    it('returns empty array when OPENCLAW_ROOT is not configured', async () => {
      jest.spyOn(configService, 'get').mockImplementation(() => undefined);
      const result = await service.scanSkills();
      expect(result).toEqual([]);
    });

    it('returns parsed skill list for valid skill folders', async () => {
      const result = await service.scanSkills();
      expect(result.length).toBeGreaterThan(0);

      const aliyunOss = result.find((s) => s.slug === 'aliyun-oss');
      expect(aliyunOss).toBeDefined();
      expect(aliyunOss!.name).toBe('阿里云OSS技能');
      expect(aliyunOss!.description).toBe('阿里云OSS技能描述');
      expect(aliyunOss!.version).toBe('0.1.0');
      expect(aliyunOss!.status).toBe('enabled');
    });

    it('marks .disabled folder as disabled', async () => {
      const result = await service.scanSkills();
      const disabledSkill = result.find((s) => s.slug === 'disabled-skill');
      expect(disabledSkill).toBeDefined();
      expect(disabledSkill!.status).toBe('disabled');
    });

    it('marks openclaw.json enabled:false as disabled', async () => {
      const result = await service.scanSkills();
      const disabledByConfig = result.find((s) => s.slug === 'disabled-by-config');
      expect(disabledByConfig).toBeDefined();
      expect(disabledByConfig!.status).toBe('disabled');
    });

    it('uses default version 1.0.0 when _meta.json is absent', async () => {
      const result = await service.scanSkills();
      const noMeta = result.find((s) => s.slug === 'no-meta-json');
      expect(noMeta).toBeDefined();
      expect(noMeta!.version).toBe('1.0.0');
    });

    it('sorts results by slug', async () => {
      const result = await service.scanSkills();
      for (let i = 1; i < result.length; i++) {
        expect(result[i].slug >= result[i - 1].slug).toBe(true);
      }
    });

    it('skips folder without SKILL.md', async () => {
      const result = await service.scanSkills();
      expect(result.find((s) => s.slug === 'no-skill-md')).toBeUndefined();
    });
  });

  describe('getEnabledSkills()', () => {
    it('returns only enabled skills', async () => {
      const result = await service.getEnabledSkills();
      expect(result.every((s) => s.status === 'enabled')).toBe(true);
      expect(result.find((s) => s.slug === 'disabled-skill')).toBeUndefined();
      expect(result.find((s) => s.slug === 'disabled-by-config')).toBeUndefined();
    });
  });

  describe('getSkillBySlug()', () => {
    it('returns skill detail with doc when slug exists and is enabled', async () => {
      const result = await service.getSkillBySlug('aliyun-oss');
      expect(result).not.toBeNull();
      expect(result!.slug).toBe('aliyun-oss');
      expect(result!.name).toBe('阿里云OSS技能');
      expect(result!.doc).toContain('这是 SKILL.md 正文内容');
      expect(result!.doc).not.toContain('---');
      expect(result!.status).toBe('enabled');
    });

    it('returns null when slug does not exist', async () => {
      const result = await service.getSkillBySlug('nonexistent-skill');
      expect(result).toBeNull();
    });

    it('returns skill with status disabled for disabled slug', async () => {
      const result = await service.getSkillBySlug('disabled-skill');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('disabled');
    });

    it('doc contains only body, not frontmatter', async () => {
      const result = await service.getSkillBySlug('aliyun-oss');
      expect(result).not.toBeNull();
      expect(result!.doc).not.toMatch(/^---/);
      expect(result!.doc).not.toContain('name:');
      expect(result!.doc).toContain('这是 SKILL.md 正文内容');
    });
  });

  describe('getEnabledSkillBySlug()', () => {
    it('returns skill when slug exists and is enabled', async () => {
      const result = await service.getEnabledSkillBySlug('aliyun-oss');
      expect(result).not.toBeNull();
      expect(result!.slug).toBe('aliyun-oss');
    });

    it('returns null when slug exists but is disabled', async () => {
      const result = await service.getEnabledSkillBySlug('disabled-skill');
      expect(result).toBeNull();
    });

    it('returns null when slug does not exist', async () => {
      const result = await service.getEnabledSkillBySlug('nonexistent');
      expect(result).toBeNull();
    });
  });
});
