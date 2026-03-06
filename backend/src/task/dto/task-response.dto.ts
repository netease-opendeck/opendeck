import { ApiProperty } from '@nestjs/swagger';

export class TaskMessageDto {
  @ApiProperty({ description: '角色' })
  role: string;

  @ApiProperty({ description: '消息内容' })
  content: string;

  @ApiProperty({ description: '时间戳', required: false })
  timestamp?: string;
}

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

  @ApiProperty({ description: '子任务名称', required: false, nullable: true })
  name: string | null;

  @ApiProperty({ description: '子任务状态', required: false, nullable: true })
  status: string | null;

  @ApiProperty({ description: '子任务错误信息', required: false, nullable: true })
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

  @ApiProperty({ type: [TaskMessageDto], description: '该轮对话消息' })
  messages: TaskMessageDto[];

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

