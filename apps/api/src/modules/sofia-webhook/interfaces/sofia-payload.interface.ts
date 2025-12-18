export interface SofiaFaqPayload {
    organisationId: string;
    organisationName: string;
    timestamp: string;
    faqs: Array<{
        id: string;
        question: string;
        answer: string;
        category?: string;
        tags?: string[];
        sourceId?: string;
        status: string;
        createdAt: string;
        updatedAt: string;
    }>;
    summary: {
        totalFaqs: number;
        updateType: 'create' | 'update' | 'delete' | 'sync';
        affectedIds: string[];
    };
}

export interface SofiaWebhookJob {
    organisationId: string;
    url: string;
    method: string;
    payload: SofiaFaqPayload;
    headers: Record<string, string>;
    secret?: string;
}
