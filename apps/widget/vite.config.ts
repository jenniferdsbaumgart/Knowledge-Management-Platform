import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'KnowledgeWidget',
            fileName: 'widget',
            formats: ['iife', 'es'],
        },
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
            },
        },
    },
    server: {
        port: 3001,
    },
});
