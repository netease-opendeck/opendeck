import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';

describe('FileController', () => {
  let controller: FileController;
  let fileService: FileService;

  const mockFiles = [
    {
      fileName: 'report.md',
      filePath: '/path/to/report.md',
      createdAt: '2026-03-05T08:54:00Z',
      skillName: 'weather',
    },
  ];

  const mockTree = [
    { name: 'memory', path: '/path/memory', files: mockFiles },
  ];

  const mockStats = { today: 1, thisWeek: 2, total: 3 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileController],
      providers: [
        {
          provide: FileService,
          useValue: {
            getOpenclawRoot: jest.fn(),
            getFiles: jest.fn(),
            getFileByPath: jest.fn(),
            getFileContent: jest.fn(),
            getFileTree: jest.fn(),
            getFileStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FileController>(FileController);
    fileService = module.get<FileService>(FileService);
  });

  describe('GET /files', () => {
    it('returns { files: [...] } when normal', async () => {
      jest.spyOn(fileService, 'getOpenclawRoot').mockReturnValue('/tmp');
      jest.spyOn(fileService, 'getFiles').mockResolvedValue(mockFiles);

      const result = await controller.getFiles();
      expect(result).toEqual({ files: mockFiles });
    });

    it('throws 503 when OPENCLAW_ROOT is not configured', async () => {
      jest.spyOn(fileService, 'getOpenclawRoot').mockReturnValue(null);

      await expect(controller.getFiles()).rejects.toMatchObject({
        status: HttpStatus.SERVICE_UNAVAILABLE,
        response: {
          statusCode: 503,
          message: 'OPENCLAW_ROOT not configured',
          error: 'Service Unavailable',
        },
      });
    });
  });

  describe('GET /files/by-path', () => {
    it('returns 200 when path exists', async () => {
      jest.spyOn(fileService, 'getOpenclawRoot').mockReturnValue('/tmp');
      jest.spyOn(fileService, 'getFileByPath').mockResolvedValue(mockFiles[0]);

      const result = await controller.getFileByPath('/path/to/report.md');
      expect(result).toEqual(mockFiles[0]);
    });

    it('throws 400 when path is missing', async () => {
      jest.spyOn(fileService, 'getOpenclawRoot').mockReturnValue('/tmp');

      await expect(controller.getFileByPath('')).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: { statusCode: 400, message: 'path is required' },
      });
    });

    it('throws 404 when file not found', async () => {
      jest.spyOn(fileService, 'getOpenclawRoot').mockReturnValue('/tmp');
      jest.spyOn(fileService, 'getFileByPath').mockResolvedValue(null);

      await expect(controller.getFileByPath('/nonexistent')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { statusCode: 404, message: 'File not found' },
      });
    });

    it('throws 503 when OPENCLAW_ROOT is not configured', async () => {
      jest.spyOn(fileService, 'getOpenclawRoot').mockReturnValue(null);

      await expect(controller.getFileByPath('/path')).rejects.toMatchObject({
        status: HttpStatus.SERVICE_UNAVAILABLE,
      });
    });
  });

  describe('GET /files/content', () => {
    it('returns 200 with content when file exists', async () => {
      jest.spyOn(fileService, 'getOpenclawRoot').mockReturnValue('/tmp');
      jest.spyOn(fileService, 'getFileByPath').mockResolvedValue(mockFiles[0]);
      jest.spyOn(fileService, 'getFileContent').mockResolvedValue('file content');

      const result = await controller.getFileContent('/path/to/report.md');
      expect(result).toEqual({ content: 'file content' });
    });

    it('throws 400 when path is missing', async () => {
      jest.spyOn(fileService, 'getOpenclawRoot').mockReturnValue('/tmp');

      await expect(controller.getFileContent('')).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
    });

    it('throws 404 when file content cannot be read', async () => {
      jest.spyOn(fileService, 'getOpenclawRoot').mockReturnValue('/tmp');
      jest.spyOn(fileService, 'getFileByPath').mockResolvedValue(mockFiles[0]);
      jest.spyOn(fileService, 'getFileContent').mockResolvedValue(null);

      await expect(controller.getFileContent('/path/to/report.md')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { statusCode: 404, message: 'File not found' },
      });
    });
  });

  describe('GET /files/tree', () => {
    it('returns 200 with tree', async () => {
      jest.spyOn(fileService, 'getOpenclawRoot').mockReturnValue('/tmp');
      jest.spyOn(fileService, 'getFileTree').mockResolvedValue(mockTree);

      const result = await controller.getFileTree();
      expect(result).toEqual(mockTree);
    });

    it('throws 503 when OPENCLAW_ROOT is not configured', async () => {
      jest.spyOn(fileService, 'getOpenclawRoot').mockReturnValue(null);

      await expect(controller.getFileTree()).rejects.toMatchObject({
        status: HttpStatus.SERVICE_UNAVAILABLE,
      });
    });
  });

  describe('GET /files/stats', () => {
    it('returns 200 with stats', async () => {
      jest.spyOn(fileService, 'getOpenclawRoot').mockReturnValue('/tmp');
      jest.spyOn(fileService, 'getFileStats').mockResolvedValue(mockStats);

      const result = await controller.getFileStats();
      expect(result).toEqual(mockStats);
    });

    it('throws 503 when OPENCLAW_ROOT is not configured', async () => {
      jest.spyOn(fileService, 'getOpenclawRoot').mockReturnValue(null);

      await expect(controller.getFileStats()).rejects.toMatchObject({
        status: HttpStatus.SERVICE_UNAVAILABLE,
      });
    });
  });
});
