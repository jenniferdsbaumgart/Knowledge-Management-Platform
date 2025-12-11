import { CHUNKING } from '@knowledge-platform/shared';

export interface ChunkResult {
    chunks: TextChunk[];
    metadata: {
        originalLength: number;
        chunkCount: number;
    };
}

export interface TextChunk {
    content: string;
    startIndex: number;
    endIndex: number;
    metadata?: Record<string, unknown>;
}

export interface ChunkingOptions {
    chunkSize?: number;
    chunkOverlap?: number;
    separators?: string[];
    preserveWhitespace?: boolean;
}

/**
 * Service for splitting text into semantic chunks for embedding
 */
export class ChunkingService {
    private defaultOptions: Required<ChunkingOptions>;

    constructor(options: ChunkingOptions = {}) {
        this.defaultOptions = {
            chunkSize: options.chunkSize ?? CHUNKING.DEFAULT_SIZE,
            chunkOverlap: options.chunkOverlap ?? CHUNKING.OVERLAP,
            separators: options.separators ?? ['\n\n', '\n', '. ', ' ', ''],
            preserveWhitespace: options.preserveWhitespace ?? false,
        };
    }

    /**
     * Split text into chunks using recursive character text splitter strategy
     */
    chunk(text: string, options?: ChunkingOptions): ChunkResult {
        const opts = { ...this.defaultOptions, ...options };
        const chunks = this.splitRecursively(text, opts.separators, opts.chunkSize, opts.chunkOverlap);

        return {
            chunks: chunks.map((content, index) => ({
                content: opts.preserveWhitespace ? content : content.trim(),
                startIndex: this.findStartIndex(text, content, index, chunks),
                endIndex: this.findEndIndex(text, content, index, chunks),
            })),
            metadata: {
                originalLength: text.length,
                chunkCount: chunks.length,
            },
        };
    }

    /**
     * Split text with semantic awareness (headings, paragraphs)
     */
    chunkSemantic(text: string, options?: ChunkingOptions): ChunkResult {
        const opts = { ...this.defaultOptions, ...options };

        // First, split by semantic boundaries (headings, double newlines)
        const sections = this.splitBySemanticBoundaries(text);

        const chunks: TextChunk[] = [];
        let currentChunk = '';
        let startIndex = 0;

        for (const section of sections) {
            if (currentChunk.length + section.length <= opts.chunkSize) {
                currentChunk += (currentChunk ? '\n\n' : '') + section;
            } else {
                if (currentChunk) {
                    const endIndex = startIndex + currentChunk.length;
                    chunks.push({
                        content: currentChunk.trim(),
                        startIndex,
                        endIndex,
                    });
                    startIndex = endIndex - opts.chunkOverlap;
                }

                // If section itself is too large, split it further
                if (section.length > opts.chunkSize) {
                    const subChunks = this.splitRecursively(
                        section,
                        ['. ', ' ', ''],
                        opts.chunkSize,
                        opts.chunkOverlap
                    );
                    for (const subChunk of subChunks) {
                        chunks.push({
                            content: subChunk.trim(),
                            startIndex,
                            endIndex: startIndex + subChunk.length,
                        });
                        startIndex += subChunk.length - opts.chunkOverlap;
                    }
                    currentChunk = '';
                } else {
                    currentChunk = section;
                }
            }
        }

        // Add remaining chunk
        if (currentChunk.trim()) {
            chunks.push({
                content: currentChunk.trim(),
                startIndex,
                endIndex: startIndex + currentChunk.length,
            });
        }

        return {
            chunks,
            metadata: {
                originalLength: text.length,
                chunkCount: chunks.length,
            },
        };
    }

    /**
     * Split by sentence for more granular chunking
     */
    chunkBySentence(text: string, sentencesPerChunk: number = 3): ChunkResult {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const chunks: TextChunk[] = [];
        let currentIndex = 0;

        for (let i = 0; i < sentences.length; i += sentencesPerChunk) {
            const chunkSentences = sentences.slice(i, i + sentencesPerChunk);
            const content = chunkSentences.join(' ').trim();

            chunks.push({
                content,
                startIndex: currentIndex,
                endIndex: currentIndex + content.length,
            });

            currentIndex += content.length;
        }

        return {
            chunks,
            metadata: {
                originalLength: text.length,
                chunkCount: chunks.length,
            },
        };
    }

    private splitRecursively(
        text: string,
        separators: string[],
        chunkSize: number,
        overlap: number
    ): string[] {
        if (text.length <= chunkSize) {
            return [text];
        }

        const separator = separators[0];
        const remainingSeparators = separators.slice(1);

        let splits: string[];
        if (separator === '') {
            // Character-level split
            splits = text.split('');
        } else {
            splits = text.split(separator);
        }

        const chunks: string[] = [];
        let currentChunk = '';

        for (const split of splits) {
            const testChunk = currentChunk
                ? currentChunk + separator + split
                : split;

            if (testChunk.length <= chunkSize) {
                currentChunk = testChunk;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk);
                }

                if (split.length > chunkSize && remainingSeparators.length > 0) {
                    // Recursively split with next separator
                    const subChunks = this.splitRecursively(
                        split,
                        remainingSeparators,
                        chunkSize,
                        overlap
                    );
                    chunks.push(...subChunks);
                    currentChunk = '';
                } else {
                    currentChunk = split;
                }
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk);
        }

        // Apply overlap
        if (overlap > 0) {
            return this.applyOverlap(chunks, overlap);
        }

        return chunks;
    }

    private applyOverlap(chunks: string[], overlap: number): string[] {
        if (chunks.length <= 1) return chunks;

        const result: string[] = [];

        for (let i = 0; i < chunks.length; i++) {
            let chunk = chunks[i];

            // Add overlap from previous chunk
            if (i > 0) {
                const prevChunk = chunks[i - 1];
                const overlapText = prevChunk.slice(-overlap);
                chunk = overlapText + chunk;
            }

            result.push(chunk);
        }

        return result;
    }

    private splitBySemanticBoundaries(text: string): string[] {
        // Split by markdown headings or double newlines
        const pattern = /(?=^#{1,6}\s)|(?=\n\n)/gm;
        return text.split(pattern).filter(s => s.trim());
    }

    private findStartIndex(
        text: string,
        chunk: string,
        index: number,
        allChunks: string[]
    ): number {
        let position = 0;
        for (let i = 0; i < index; i++) {
            const foundPos = text.indexOf(allChunks[i], position);
            if (foundPos !== -1) {
                position = foundPos + allChunks[i].length;
            }
        }
        return text.indexOf(chunk, position);
    }

    private findEndIndex(
        text: string,
        chunk: string,
        index: number,
        allChunks: string[]
    ): number {
        const start = this.findStartIndex(text, chunk, index, allChunks);
        return start + chunk.length;
    }
}
