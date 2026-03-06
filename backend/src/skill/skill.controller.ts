import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkillService } from './skill.service';
import { SkillsListResponseDto, SkillDetailResponseDto } from './dto/skill-response.dto';

@ApiTags('skills')
@Controller('skills')
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get()
  @ApiOperation({ summary: '获取技能列表' })
  @ApiResponse({ status: 200, description: '返回启用的技能列表' })
  async getSkills() {
    const skillsPath = this.skillService.getSkillsPath();
    if (!skillsPath) {
      throw new HttpException(
        { statusCode: 503, message: 'OPENCLAW_ROOT not configured', error: 'Service Unavailable' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const skills = await this.skillService.getEnabledSkills();
    return { skills } as SkillsListResponseDto;
  }

  @Get(':slug')
  @ApiOperation({ summary: '获取单个技能详情' })
  @ApiResponse({ status: 200, description: '返回技能详情' })
  @ApiResponse({ status: 404, description: '技能不存在或已禁用' })
  async getSkillBySlug(@Param('slug') slug: string) {
    const skillsPath = this.skillService.getSkillsPath();
    if (!skillsPath) {
      throw new HttpException(
        { statusCode: 503, message: 'OPENCLAW_ROOT not configured', error: 'Service Unavailable' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const skill = await this.skillService.getEnabledSkillBySlug(slug);
    if (!skill) {
      throw new HttpException(
        { statusCode: 404, message: 'Skill not found', error: 'Not Found' },
        HttpStatus.NOT_FOUND,
      );
    }

    return { skill } as SkillDetailResponseDto;
  }
}
