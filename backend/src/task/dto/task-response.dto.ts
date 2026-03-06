import { ApiProperty } from '@nestjs/swagger';

export class TaskArtifactDto {
  @ApiProperty({ description: '文件名' })
  fileName: string;

  @ApiProperty({ description: '文件大小（字节）', required: false, nullable: true })
  fileSize: number | null;

  @ApiProperty({ description: '文件绝对路径' })
  absolutePath: string;
}

export class TaskItemDto {
  @ApiProperty({ description: '任务名称' })
  taskName: string | null;

  @ApiProperty({ description: '技能名称' })
  skillName: string;

  @ApiProperty({ description: '任务开始时间', required: false, nullable: true })
  startedAt: string | null;

  @ApiProperty({ description: '任务结束时间', required: false, nullable: true })
  endedAt: string | null;

  @ApiProperty({ description: '错误信息', required: false, nullable: true })
  error: string | null;

  @ApiProperty({ description: '任务详情', required: false, nullable: true })
  detail: string | null;

  @ApiProperty({ type: [TaskArtifactDto], description: '任务产生的文件列表' })
  artifacts: TaskArtifactDto[];
}

export class TasksListResponseDto {
  @ApiProperty({ type: [TaskItemDto], description: '任务列表' })
  tasks: TaskItemDto[];
}

export class TaskStatsResponseDto {
  @ApiProperty({ description: '今天新增任务数量' })
  today: number;

  @ApiProperty({ description: '本周新增任务数量' })
  thisWeek: number;

  @ApiProperty({ description: '全部任务数量' })
  total: number;
}

