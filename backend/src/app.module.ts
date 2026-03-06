import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SkillModule } from './skill/skill.module';
import { FileModule } from './file/file.module';
import { SkillExecutionModule } from './skill-execution/skill-execution.module';
import { TaskModule } from './task/task.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SkillExecutionModule,
    SkillModule,
    FileModule,
    TaskModule,
  ],
})
export class AppModule {}
