import { ApiProperty } from '@nestjs/swagger';

export class TaskArtifactDto {
  @ApiProperty({ description: '文件名' })
  fileName: string;

  @ApiProperty({ description: '文件大小（字节）', required: false, nullable: true })
  fileSize: number | null;

  @ApiProperty({ description: '文件绝对路径' })
  absolutePath: string;
}

export class ChildTaskDto {
  @ApiProperty({ description: '子任务 ID' })
  id: string;

  @ApiProperty({ description: '消息角色' })
  role: string;

  @ApiProperty({ description: '消息时间戳（ISO）', required: false, nullable: true })
  timestamp: string | null;

  @ApiProperty({
    description: '消息内容（原始 content 数组）',
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  content: Record<string, unknown>[];

  @ApiProperty({
    description: '是否错误（来自 message.isError，缺失默认为 false）',
  })
  isError: boolean;

  @ApiProperty({
    description: '兼容字段：子任务名称',
    required: false,
    nullable: true,
    deprecated: true,
  })
  name: string | null;

  @ApiProperty({
    description: '兼容字段：子任务状态',
    required: false,
    nullable: true,
    deprecated: true,
  })
  status: string | null;

  @ApiProperty({
    description: '兼容字段：子任务错误信息（isError=true 时有值）',
    required: false,
    nullable: true,
    deprecated: true,
  })
  error: string | null;
}

export class TaskItemDto {
  @ApiProperty({ description: '任务名称' })
  taskName: string | null;

  @ApiProperty({ description: '技能名称列表' })
  skillNames: string[];

  @ApiProperty({ description: '任务开始时间', required: false, nullable: true })
  startedAt: string | null;

  @ApiProperty({ description: '任务结束时间', required: false, nullable: true })
  endedAt: string | null;

  @ApiProperty({ description: '错误信息', required: false, nullable: true })
  error: string | null;

  @ApiProperty({ type: [TaskArtifactDto], description: '任务产生的文件列表' })
  artifacts: TaskArtifactDto[];

  @ApiProperty({ type: [ChildTaskDto], description: '子任务列表' })
  childrenTasks: ChildTaskDto[];
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

