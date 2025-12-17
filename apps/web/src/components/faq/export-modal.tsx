'use client';

import React, { useState } from 'react';
import { Download, FileJson, Table, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useActiveOrganisation } from '@/context/ActiveOrganisationContext';
import { api } from '@/lib/api';

interface ExportFormat {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    extension: string;
    contentType: string;
}

const EXPORT_FORMATS: ExportFormat[] = [
    {
        id: 'rag-bundle',
        name: 'RAG Bundle',
        description: 'Full JSON with embeddings for vector databases',
        icon: <Sparkles className="w-5 h-5" />,
        extension: 'json',
        contentType: 'application/json',
    },
    {
        id: 'openai-jsonl',
        name: 'OpenAI JSONL',
        description: 'Fine-tuning format for GPT models',
        icon: <FileJson className="w-5 h-5" />,
        extension: 'jsonl',
        contentType: 'application/jsonl',
    },
    {
        id: 'langchain',
        name: 'LangChain',
        description: 'Compatible with LangChain/LlamaIndex',
        icon: <FileJson className="w-5 h-5" />,
        extension: 'json',
        contentType: 'application/json',
    },
    {
        id: 'system-prompt',
        name: 'System Prompt',
        description: 'Markdown bundle for direct LLM use',
        icon: <MessageSquare className="w-5 h-5" />,
        extension: 'md',
        contentType: 'text/markdown',
    },
    {
        id: 'csv',
        name: 'CSV',
        description: 'Tabular format for analytics and import',
        icon: <Table className="w-5 h-5" />,
        extension: 'csv',
        contentType: 'text/csv',
    },
];

interface ExportModalProps {
    open: boolean;
    onClose: () => void;
}

export function ExportModal({ open, onClose }: ExportModalProps) {
    const { activeOrgId } = useActiveOrganisation();
    const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
    const [status, setStatus] = useState<'APPROVED' | 'DRAFT' | 'all'>('APPROVED');
    const [includeEmbeddings, setIncludeEmbeddings] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!selectedFormat || !activeOrgId) return;

        setIsExporting(true);

        try {
            const format = EXPORT_FORMATS.find(f => f.id === selectedFormat);
            if (!format) return;

            const params = new URLSearchParams({
                status,
                includeEmbeddings: String(includeEmbeddings),
            });

            const response = await api.get(
                `/organisations/${activeOrgId}/faq/export/${selectedFormat}?${params}`,
                { responseType: 'blob' }
            );

            // Create download link
            const blob = new Blob([response.data], { type: format.contentType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `faq-export-${selectedFormat}-${Date.now()}.${format.extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            onClose();
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-primary" />
                        Export FAQ Knowledge Base
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Format Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-foreground">Select Format</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {EXPORT_FORMATS.map((format) => (
                                <button
                                    key={format.id}
                                    onClick={() => setSelectedFormat(format.id)}
                                    className={`flex items-start gap-3 p-4 rounded-lg border transition-all text-left ${selectedFormat === format.id
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                        }`}
                                >
                                    <div className={`mt-0.5 ${selectedFormat === format.id ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {format.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-foreground">{format.name}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{format.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Status Filter</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as typeof status)}
                                className="w-full px-3 py-2 bg-muted/50 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                            >
                                <option value="APPROVED">Approved Only</option>
                                <option value="DRAFT">Draft Only</option>
                                <option value="all">All Entries</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Include Embeddings</label>
                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    id="includeEmbeddings"
                                    checked={includeEmbeddings}
                                    onChange={(e) => setIncludeEmbeddings(e.target.checked)}
                                    className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                                />
                                <label htmlFor="includeEmbeddings" className="text-sm text-muted-foreground">
                                    Include vector embeddings
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Info Box */}
                    {selectedFormat && (
                        <div className="bg-muted/30 rounded-lg p-4 text-sm">
                            <div className="font-medium text-foreground mb-1">
                                {EXPORT_FORMATS.find(f => f.id === selectedFormat)?.name}
                            </div>
                            <div className="text-muted-foreground">
                                {selectedFormat === 'rag-bundle' &&
                                    'Exports complete FAQ data with pre-computed embeddings. Import directly into Pinecone, Weaviate, or another platform instance.'
                                }
                                {selectedFormat === 'openai-jsonl' &&
                                    'Creates a JSONL file compatible with OpenAI fine-tuning. Each FAQ becomes a conversation example.'
                                }
                                {selectedFormat === 'langchain' &&
                                    'Standard document format for LangChain and LlamaIndex. Includes metadata for filtering and retrieval.'
                                }
                                {selectedFormat === 'system-prompt' &&
                                    'Generates a complete Markdown prompt you can paste into ChatGPT, Claude, or any LLM interface.'
                                }
                                {selectedFormat === 'csv' &&
                                    'Tabular format for spreadsheet analysis or bulk import into vector databases.'
                                }
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={!selectedFormat || isExporting}
                        className="min-w-[120px]"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
