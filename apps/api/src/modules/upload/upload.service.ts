import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

export interface UploadedFile {
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
}

@Injectable()
export class UploadService implements OnModuleInit {
    private minioClient: Minio.Client;
    private bucket: string;

    constructor(private configService: ConfigService) {
        this.bucket = this.configService.get<string>('minio.bucket') || 'knowledge-platform';

        this.minioClient = new Minio.Client({
            endPoint: this.configService.get<string>('minio.endPoint') || 'localhost',
            port: this.configService.get<number>('minio.port') || 9000,
            useSSL: this.configService.get<boolean>('minio.useSSL') || false,
            accessKey: this.configService.get<string>('minio.accessKey') || 'minio',
            secretKey: this.configService.get<string>('minio.secretKey') || 'minio123',
        });
    }

    async onModuleInit() {
        try {
            const exists = await this.minioClient.bucketExists(this.bucket);
            if (!exists) {
                await this.minioClient.makeBucket(this.bucket);
                console.log(`[Upload] Created bucket: ${this.bucket}`);
            }
        } catch (error) {
            console.warn(`[Upload] MinIO not available, using local storage`, error);
        }
    }

    async uploadFile(file: Express.Multer.File, sourceId: string): Promise<UploadedFile> {
        const fileName = `${sourceId}/${Date.now()}-${file.originalname}`;

        try {
            await this.minioClient.putObject(
                this.bucket,
                fileName,
                file.buffer,
                file.size,
                { 'Content-Type': file.mimetype }
            );

            return {
                originalName: file.originalname,
                fileName,
                mimeType: file.mimetype,
                size: file.size,
                url: `minio://${this.bucket}/${fileName}`,
            };
        } catch (error) {
            console.error('[Upload] Failed to upload to MinIO:', error);
            throw error;
        }
    }

    async uploadFiles(files: Express.Multer.File[], sourceId: string): Promise<UploadedFile[]> {
        return Promise.all(files.map(file => this.uploadFile(file, sourceId)));
    }

    async getFile(fileName: string): Promise<Buffer> {
        const chunks: Buffer[] = [];
        const stream = await this.minioClient.getObject(this.bucket, fileName);

        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
    }

    async listFiles(sourceId: string): Promise<string[]> {
        const files: string[] = [];
        const stream = this.minioClient.listObjects(this.bucket, `${sourceId}/`, true);

        return new Promise((resolve, reject) => {
            stream.on('data', (obj) => files.push(obj.name || ''));
            stream.on('end', () => resolve(files.filter(f => f)));
            stream.on('error', reject);
        });
    }

    async deleteFile(fileName: string): Promise<void> {
        await this.minioClient.removeObject(this.bucket, fileName);
    }

    async deleteSourceFiles(sourceId: string): Promise<void> {
        const files = await this.listFiles(sourceId);
        for (const file of files) {
            await this.deleteFile(file);
        }
    }
}
