import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('accessToken');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    register: (data: { email: string; password: string; name: string }) =>
        api.post('/auth/register', data),
    logout: () => api.post('/auth/logout'),
    me: () => api.post('/auth/me'),
};

// Sources API
export const sourcesApi = {
    list: (params?: { page?: number; limit?: number }) =>
        api.get('/sources', { params }),
    get: (id: string) => api.get(`/sources/${id}`),
    create: (data: any) => api.post('/sources', data),
    update: (id: string, data: any) => api.put(`/sources/${id}`, data),
    delete: (id: string) => api.delete(`/sources/${id}`),
    testConnection: (id: string) => api.post(`/sources/${id}/test`),
};

// Knowledge API
export const knowledgeApi = {
    list: (params?: { page?: number; limit?: number; search?: string }) =>
        api.get('/knowledge', { params }),
    get: (id: string) => api.get(`/knowledge/${id}`),
    stats: () => api.get('/knowledge/stats'),
};

// Search API
export const searchApi = {
    search: (query: string, options?: { mode?: string; limit?: number }) =>
        api.post('/search', { query, ...options }),
    rag: (data: {
        query: string;
        conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
        maxTokens?: number;
        temperature?: number
    }) => api.post('/search/rag', data),
};

// Sync API
export const syncApi = {
    trigger: (sourceId: string) => api.post(`/sync/${sourceId}`),
    status: (sourceId: string) => api.get(`/sync/${sourceId}/status`),
    logs: (params?: { page?: number; limit?: number; sourceId?: string }) =>
        api.get('/sync/logs', { params }),
    cancel: (sourceId: string) => api.post(`/sync/${sourceId}/cancel`),
};

// Analytics API
export const analyticsApi = {
    dashboard: (days?: number) => api.get('/analytics/dashboard', { params: { days } }),
    events: (params?: { page?: number; limit?: number }) =>
        api.get('/analytics/events', { params }),
};

// CMS API
export const cmsApi = {
    list: (params?: { page?: number; limit?: number; status?: string }) =>
        api.get('/cms', { params }),
    get: (id: string) => api.get(`/cms/${id}`),
    create: (data: any) => api.post('/cms', data),
    update: (id: string, data: any) => api.put(`/cms/${id}`, data),
    delete: (id: string) => api.delete(`/cms/${id}`),
    publish: (id: string) => api.post(`/cms/${id}/publish`),
    unpublish: (id: string) => api.post(`/cms/${id}/unpublish`),
};

// Upload API
export const uploadApi = {
    upload: (sourceId: string, files: File[], onProgress?: (percent: number) => void) => {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        return api.post(`/upload/${sourceId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percent);
                }
            },
        });
    },
    list: (sourceId: string) => api.get(`/upload/${sourceId}`),
    delete: (sourceId: string, fileName: string) => api.delete(`/upload/${sourceId}/${fileName}`),
};

// FAQ API
export const faqApi = {
    list: (params?: { page?: number; limit?: number; status?: string; categoryId?: string }) =>
        api.get('/faq', { params }),
    get: (id: string) => api.get(`/faq/${id}`),
    create: (data: { question: string; answer: string; categoryId?: string; status?: string }) =>
        api.post('/faq', data),
    update: (id: string, data: { question?: string; answer?: string; categoryId?: string; status?: string }) =>
        api.put(`/faq/${id}`, data),
    delete: (id: string) => api.delete(`/faq/${id}`),
    approve: (id: string) => api.post(`/faq/${id}/approve`),
    archive: (id: string) => api.post(`/faq/${id}/archive`),
    generate: (sourceId: string, maxPerDocument?: number) =>
        api.post('/faq/generate', { sourceId, maxPerDocument }),
    generateAll: (maxPerSource?: number) =>
        api.post('/faq/generate-all', { maxPerSource }),
    exportJson: (status?: string) =>
        api.get('/faq/export/json', { params: { status } }),
    categories: () => api.get('/faq/categories'),
    createCategory: (data: { name: string; slug?: string }) => api.post('/faq/categories', data),
    deleteCategory: (id: string) => api.delete(`/faq/categories/${id}`),
    // Public endpoints
    public: () => api.get('/faq/public/list'),
    search: (query: string, limit?: number) => api.post('/faq/public/search', { query, limit }),
};

// Organisations API (super admin only)
export const organisationsApi = {
    list: () => api.get('/organisations'),
    get: (id: string) => api.get(`/organisations/${id}`),
    create: (data: { name: string; slug?: string }) => api.post('/organisations', data),
    update: (id: string, data: { name?: string; slug?: string }) => api.put(`/organisations/${id}`, data),
    delete: (id: string) => api.delete(`/organisations/${id}`),
    switch: (organisationId: string) => api.post('/organisations/switch', { organisationId }),
};
