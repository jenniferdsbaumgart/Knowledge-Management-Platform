import type { Source, SourceType } from '@knowledge-platform/shared';
import { BaseConnector } from './base/index.js';
import { ApiConnector } from './api/index.js';
import { DocumentConnector } from './document/index.js';
import { WebConnector } from './web/index.js';

// Export all connectors
export { BaseConnector, type FetchResult, type DocumentData, type ConnectorStatus } from './base/index.js';
export { ApiConnector } from './api/index.js';
export { DocumentConnector } from './document/index.js';
export { WebConnector } from './web/index.js';

/**
 * Factory function to create the appropriate connector for a source
 */
export function createConnector(source: Source): BaseConnector {
    switch (source.type) {
        case 'API':
            return new ApiConnector(source);
        case 'DOCUMENT':
            return new DocumentConnector(source);
        case 'WEB':
            return new WebConnector(source);
        case 'DATABASE':
            throw new Error('Database connector not yet implemented');
        default:
            throw new Error(`Unknown source type: ${source.type}`);
    }
}

/**
 * Check if a source type is supported
 */
export function isSourceTypeSupported(type: SourceType): boolean {
    return ['API', 'DOCUMENT', 'WEB'].includes(type);
}
