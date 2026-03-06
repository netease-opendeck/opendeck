import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import * as fs from 'fs';
import { ConfigModule } from '@nestjs/config';
import { SkillModule } from './skill/skill.module';
import { FileModule } from './file/file.module';
import { SkillExecutionModule } from './skill-execution/skill-execution.module';
import { TaskModule } from './task/task.module';

const appDistPath = join(__dirname, '..', '..', 'app', 'dist');

@Module({
  imports: [
    ...(process.env.NODE_ENV === 'production' && fs.existsSync(appDistPath)
      ? [
          ServeStaticModule.forRoot({
            rootPath: appDistPath,
          }),
        ]
      : []),
    ConfigModule.forRoot({ isGlobal: true }),
    SkillExecutionModule,
    SkillModule,
    FileModule,
    TaskModule,
  ],
})
export class AppModule {}
