import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { SkillExecutionModule } from '../skill-execution/skill-execution.module';

@Module({
  imports: [SkillExecutionModule],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
