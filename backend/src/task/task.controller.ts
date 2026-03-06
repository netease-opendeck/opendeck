import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { TasksListResponseDto, TaskStatsResponseDto } from './dto/task-response.dto';
import { SkillExecutionService } from '../skill-execution/skill-execution.service';

@ApiTags('tasks')
@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly skillExecutionService: SkillExecutionService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取所有任务列表' })
  @ApiResponse({ status: 200, description: '返回任务列表', type: TasksListResponseDto })
  async getTasks() {
    if (!this.skillExecutionService.getOpenclawRoot()) {
      throw new HttpException(
        {
          statusCode: 503,
          message: 'OPENCLAW_ROOT not configured',
          error: 'Service Unavailable',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const tasks = await this.taskService.getTasks();
    return { tasks } as TasksListResponseDto;
  }

  @Get('stats')
  @ApiOperation({ summary: '获取任务统计' })
  @ApiResponse({ status: 200, description: '今天、本周、全部任务数量', type: TaskStatsResponseDto })
  async getTaskStats() {
    if (!this.skillExecutionService.getOpenclawRoot()) {
      throw new HttpException(
        {
          statusCode: 503,
          message: 'OPENCLAW_ROOT not configured',
          error: 'Service Unavailable',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return this.taskService.getTaskStats();
  }
}

