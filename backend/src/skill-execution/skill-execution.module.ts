import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SkillExecutionService } from './skill-execution.service';

@Module({
  imports: [ConfigModule],
  providers: [SkillExecutionService],
  exports: [SkillExecutionService],
})
export class SkillExecutionModule {}

