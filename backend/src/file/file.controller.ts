import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileService } from './file.service';

@ApiTags('files')
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get()
  @ApiOperation({ summary: '获取所有文件列表' })
  @ApiResponse({ status: 200, description: '返回文件列表' })
  async getFiles() {
    if (!this.fileService.getOpenclawRoot()) {
      throw new HttpException(
        {
          statusCode: 503,
          message: 'OPENCLAW_ROOT not configured',
          error: 'Service Unavailable',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const files = await this.fileService.getFiles();
    return { files };
  }

  @Get('tree')
  @ApiOperation({ summary: '获取文件树' })
  @ApiResponse({ status: 200, description: '按目录分组的文件树' })
  async getFileTree() {
    if (!this.fileService.getOpenclawRoot()) {
      throw new HttpException(
        {
          statusCode: 503,
          message: 'OPENCLAW_ROOT not configured',
          error: 'Service Unavailable',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return this.fileService.getFileTree();
  }

  @Get('stats')
  @ApiOperation({ summary: '获取文件统计' })
  @ApiResponse({ status: 200, description: '今天、本周、全部数量' })
  async getFileStats() {
    if (!this.fileService.getOpenclawRoot()) {
      throw new HttpException(
        {
          statusCode: 503,
          message: 'OPENCLAW_ROOT not configured',
          error: 'Service Unavailable',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return this.fileService.getFileStats();
  }

  @Get('by-path')
  @ApiOperation({ summary: '按路径获取文件详情' })
  @ApiResponse({ status: 200, description: '返回文件详情' })
  @ApiResponse({ status: 404, description: '文件不存在' })
  async getFileByPath(@Query('path') pathParam: string) {
    if (!this.fileService.getOpenclawRoot()) {
      throw new HttpException(
        {
          statusCode: 503,
          message: 'OPENCLAW_ROOT not configured',
          error: 'Service Unavailable',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (!pathParam?.trim()) {
      throw new HttpException(
        { statusCode: 400, message: 'path is required', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const file = await this.fileService.getFileByPath(pathParam);
    if (!file) {
      throw new HttpException(
        { statusCode: 404, message: 'File not found', error: 'Not Found' },
        HttpStatus.NOT_FOUND,
      );
    }
    return file;
  }

  @Get('content')
  @ApiOperation({ summary: '获取文件内容' })
  @ApiResponse({ status: 200, description: '返回文件内容' })
  @ApiResponse({ status: 404, description: '文件不存在' })
  async getFileContent(@Query('path') pathParam: string) {
    if (!this.fileService.getOpenclawRoot()) {
      throw new HttpException(
        {
          statusCode: 503,
          message: 'OPENCLAW_ROOT not configured',
          error: 'Service Unavailable',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (!pathParam?.trim()) {
      throw new HttpException(
        { statusCode: 400, message: 'path is required', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const file = await this.fileService.getFileByPath(pathParam);
    if (!file) {
      throw new HttpException(
        { statusCode: 404, message: 'File not found', error: 'Not Found' },
        HttpStatus.NOT_FOUND,
      );
    }
    const content = await this.fileService.getFileContent(pathParam);
    if (content === null) {
      throw new HttpException(
        { statusCode: 404, message: 'File not found', error: 'Not Found' },
        HttpStatus.NOT_FOUND,
      );
    }
    return { content };
  }
}
