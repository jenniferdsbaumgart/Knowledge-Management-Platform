import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    UploadedFiles,
    UseInterceptors,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiConsumes, ApiBody, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UploadService, UploadedFile } from './upload.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class UploadController {
    constructor(private uploadService: UploadService) { }

    @Post(':sourceId')
    @Roles(UserRole.ADMIN, UserRole.CLIENT)
    @UseInterceptors(FilesInterceptor('files', 20, {
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
        fileFilter: (_req, file, cb) => {
            const allowedMimes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain',
                'text/csv',
                'text/markdown',
                'application/json',
            ];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
            }
        },
    }))
    @ApiOperation({ summary: 'Upload files for a document source' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
            },
        },
    })
    async uploadFiles(
        @Param('sourceId') sourceId: string,
        @UploadedFiles() files: Express.Multer.File[],
    ): Promise<{ files: UploadedFile[] }> {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files provided');
        }
        const uploadedFiles = await this.uploadService.uploadFiles(files, sourceId);
        return { files: uploadedFiles };
    }

    @Get(':sourceId')
    @Roles(UserRole.ADMIN, UserRole.CLIENT)
    @ApiOperation({ summary: 'List files for a source' })
    async listFiles(@Param('sourceId') sourceId: string): Promise<{ files: string[] }> {
        const files = await this.uploadService.listFiles(sourceId);
        return { files };
    }

    @Delete(':sourceId/:fileName')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Delete a file' })
    async deleteFile(
        @Param('sourceId') sourceId: string,
        @Param('fileName') fileName: string,
    ): Promise<{ message: string }> {
        await this.uploadService.deleteFile(`${sourceId}/${fileName}`);
        return { message: 'File deleted' };
    }
}
