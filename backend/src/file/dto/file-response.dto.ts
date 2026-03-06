import { ApiProperty } from '@nestjs/swagger';

export class FileItemDto {
  @ApiProperty()
  fileName: string;

  @ApiProperty()
  filePath: string;

  @ApiProperty({ nullable: true })
  createdAt: string | null;

  @ApiProperty()
  skillName: string;
}

export class FileTreeDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  path: string;

  @ApiProperty({ type: [FileItemDto] })
  files: FileItemDto[];
}

export class FileStatsDto {
  @ApiProperty()
  today: number;

  @ApiProperty()
  thisWeek: number;

  @ApiProperty()
  total: number;
}
