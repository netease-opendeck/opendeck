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

export class FileWarningDto {
  @ApiProperty()
  scope: 'reflection-scan' | 'reflection-stat';

  @ApiProperty()
  path: string;

  @ApiProperty()
  code: string;

  @ApiProperty({ required: false })
  message?: string;
}

export class FilesResponseDto {
  @ApiProperty({ type: [FileItemDto] })
  files: FileItemDto[];

  @ApiProperty({ type: [FileWarningDto] })
  warnings: FileWarningDto[];
}

export class FileTreeResponseDto {
  @ApiProperty({ type: [FileTreeDto] })
  tree: FileTreeDto[];

  @ApiProperty({ type: [FileWarningDto] })
  warnings: FileWarningDto[];
}

export class FileStatsResponseDto extends FileStatsDto {
  @ApiProperty({ type: [FileWarningDto] })
  warnings: FileWarningDto[];
}
