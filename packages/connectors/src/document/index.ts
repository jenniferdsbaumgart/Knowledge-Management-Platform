import * as fs from 'fs/promises';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import type { DocumentSourceConfig, Source } from '@knowledge-platform/shared';
import { BaseConnector, FetchResult, DocumentData, ConnectorStatus } from '../base/index.js';

/**
 * Connector for document files (PDF, Word, Excel, etc.)
 */
export class DocumentConnector extends BaseConnector<DocumentSourceConfig> {
    constructor(source: Source) {
        super(source);
    }

    async testConnection(): Promise<ConnectorStatus> {
        try {
            // For local storage, check if the path exists
            if (this.config.storageType === 'local') {
                const stats = await fs.stat(this.config.path);
                return {
                    connected: stats.isDirectory(),
                    message: stats.isDirectory() ? 'Directory accessible' : 'Path is not a directory',
                    lastChecked: new Date(),
                    details: {
                        isDirectory: stats.isDirectory(),
                        path: this.config.path,
                    },
                };
            }

            // For S3/MinIO, we'd need to check bucket access
            return {
                connected: true,
                message: 'Object storage connection would be tested here',
                lastChecked: new Date(),
            };
        } catch (error) {
            return {
                connected: false,
                message: error instanceof Error ? error.message : 'Connection failed',
                lastChecked: new Date(),
            };
        }
    }

    async fetchAll(): Promise<FetchResult> {
        const documents: DocumentData[] = [];
        const files = await this.listFiles();

        for (const filePath of files) {
            try {
                const doc = await this.processFile(filePath);
                if (doc) {
                    documents.push(doc);
                }
            } catch (error) {
                console.error(`Failed to process file ${filePath}:`, error);
            }
        }

        return {
            documents,
            metadata: {
                totalCount: documents.length,
                fetchedAt: new Date(),
            },
        };
    }

    async fetchIncremental(since: Date): Promise<FetchResult> {
        const documents: DocumentData[] = [];
        const files = await this.listFiles();

        for (const filePath of files) {
            try {
                const stats = await fs.stat(filePath);
                if (stats.mtime > since) {
                    const doc = await this.processFile(filePath);
                    if (doc) {
                        documents.push(doc);
                    }
                }
            } catch (error) {
                console.error(`Failed to process file ${filePath}:`, error);
            }
        }

        return {
            documents,
            metadata: {
                totalCount: documents.length,
                fetchedAt: new Date(),
            },
        };
    }

    async fetchOne(externalId: string): Promise<DocumentData | null> {
        try {
            const filePath = path.join(this.config.path, externalId);
            return await this.processFile(filePath);
        } catch {
            return null;
        }
    }

    private async listFiles(): Promise<string[]> {
        const allFiles: string[] = [];
        const extensions = this.config.fileTypes.map((t) =>
            t.startsWith('.') ? t : `.${t}`
        );

        const walkDir = async (dir: string) => {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    await walkDir(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (extensions.includes(ext)) {
                        allFiles.push(fullPath);
                    }
                }
            }
        };

        await walkDir(this.config.path);
        return allFiles;
    }

    private async processFile(filePath: string): Promise<DocumentData | null> {
        const ext = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath);
        const stats = await fs.stat(filePath);

        let content = '';

        switch (ext) {
            case '.pdf':
                content = await this.extractPDF(filePath);
                break;
            case '.docx':
            case '.doc':
                content = await this.extractWord(filePath);
                break;
            case '.xlsx':
            case '.xls':
                content = await this.extractExcel(filePath);
                break;
            case '.csv':
                content = await this.extractCSV(filePath);
                break;
            case '.txt':
            case '.md':
                content = await fs.readFile(filePath, 'utf-8');
                break;
            default:
                console.warn(`Unsupported file type: ${ext}`);
                return null;
        }

        return this.transform({
            filePath,
            fileName,
            content,
            stats,
            ext,
        });
    }

    private async extractPDF(filePath: string): Promise<string> {
        const buffer = await fs.readFile(filePath);
        const data = await pdfParse(buffer);
        return data.text;
    }

    private async extractWord(filePath: string): Promise<string> {
        const buffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }

    private async extractExcel(filePath: string): Promise<string> {
        const buffer = await fs.readFile(filePath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        let content = '';
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            content += `\n--- Sheet: ${sheetName} ---\n${csv}`;
        }

        return content.trim();
    }

    private async extractCSV(filePath: string): Promise<string> {
        return await fs.readFile(filePath, 'utf-8');
    }

    protected transform(raw: unknown): DocumentData {
        const data = raw as {
            filePath: string;
            fileName: string;
            content: string;
            stats: { size: number; mtime: Date };
            ext: string;
        };

        return {
            externalId: data.filePath,
            title: data.fileName,
            content: data.content,
            metadata: {
                sourceType: 'DOCUMENT',
                filePath: data.filePath,
                fileName: data.fileName,
                fileType: data.ext,
                fileSize: data.stats.size,
                lastModified: data.stats.mtime.toISOString(),
            },
        };
    }

    validateConfig(): boolean {
        if (!this.config.path) return false;
        if (!this.config.fileTypes || this.config.fileTypes.length === 0) return false;
        return true;
    }
}
