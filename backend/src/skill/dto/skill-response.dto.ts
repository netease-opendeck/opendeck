import { ApiProperty } from '@nestjs/swagger';

export class SkillItemDto {
  @ApiProperty({ example: 'aliyun-oss' })
  slug: string;

  @ApiProperty({ example: '阿里云OSS技能' })
  name: string;

  @ApiProperty({ example: '阿里云OSS技能描述' })
  description: string;

  @ApiProperty({ example: '0.1.0' })
  version: string;

  @ApiProperty({ example: '2026-03-05T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-03-05T10:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ enum: ['enabled', 'disabled'] })
  status: 'enabled' | 'disabled';
}

export class SkillDetailDto extends SkillItemDto {
  @ApiProperty({ description: 'SKILL.md 正文内容（不含 frontmatter）' })
  doc: string;
}

export class SkillsListResponseDto {
  @ApiProperty({ type: [SkillItemDto] })
  skills: SkillItemDto[];
}

export class SkillDetailResponseDto {
  @ApiProperty({ type: SkillDetailDto })
  skill: SkillDetailDto;
}
