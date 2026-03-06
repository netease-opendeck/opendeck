import { Module } from '@nestjs/common';
import { SkillExecutionModule } from '../skill-execution/skill-execution.module';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';

@Module({
  imports: [SkillExecutionModule],
  controllers: [TaskController],
  providers: [TaskService],
})
export class TaskModule {}

