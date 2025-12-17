import React, { useState } from 'react';
import { Send, User as UserIcon, Bot, Loader2, Sparkles, Download, Database } from 'lucide-react';
import { useActiveOrganisation } from '@/context/ActiveOrganisationContext';
import { api } from '@/lib/api';
import { ExportModal } from '@/components/faq/export-modal';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Array<{
        id: string;
        question: string;
        similarity: number;
    }>;
}

export function FaqChat() {
    const { activeOrgId } = useActiveOrganisation();
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [showExportModal, setShowExportModal] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || !activeOrgId) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: query
        };

        setMessages(prev => [...prev, userMessage]);
        setQuery('');
        setIsLoading(true);

        try {
            const response = await api.post(`/organisations/${activeOrgId}/faq-rag/chat`, {
                question: userMessage.content
            });

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.data.answer,
                sources: response.data.sources
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Failed to get answer:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm sorry, I encountered an error while trying to find an answer. Please try again."
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = () => {
        if (messages.length === 0) return;

        let exportContent = `# FAQ Chat Export - ${new Date().toLocaleString()}\n\n`;

        messages.forEach(msg => {
            exportContent += `## ${msg.role === 'user' ? 'User' : 'Assistant'}\n`;
            exportContent += `${msg.content}\n\n`;

            if (msg.role === 'assistant' && msg.sources && msg.sources.length > 0) {
                exportContent += `**Sources:**\n`;
                msg.sources.forEach(source => {
                    exportContent += `- ${source.question} (Similarity: ${(source.similarity * 100).toFixed(1)}%)\n`;
                });
                exportContent += `\n`;
            }
            exportContent += `---\n\n`;
        });

        const blob = new Blob([exportContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `faq-chat-export-${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!activeOrgId) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-lg border border-border">
                <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground">Select an Organisation</h3>
                <p className="text-muted-foreground max-w-sm mt-2">
                    Please select an organisation from the specific tasks to start chatting with your knowledge base.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[600px] border border-border rounded-lg bg-card shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-foreground">FAQ Assistant</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                        title="Export knowledge base"
                    >
                        <Database className="w-4 h-4" />
                        Export KB
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={messages.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Export conversation"
                    >
                        <Download className="w-4 h-4" />
                        Chat
                    </button>
                    <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
                        Deep RAG
                    </span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                        <Bot className="w-12 h-12 text-muted-foreground/50" />
                        <p className="text-sm">Ask any question about your FAQs!</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                    >
                        <div
                            className={`flex max-w-[80%] rounded-lg p-4 shadow-sm ${msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card border border-border text-foreground'
                                }`}
                        >
                            <div className="flex gap-3">
                                <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-primary-foreground/20' : 'bg-muted'
                                    }`}>
                                    {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} className="text-muted-foreground" />}
                                </div>
                                <div className="flex-1">
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                                    {/* Sources Citation */}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-border/50">
                                            <p className="text-xs font-semibold mb-2 opacity-70 uppercase tracking-wider">Sources Used:</p>
                                            <ul className="space-y-1">
                                                {msg.sources.map((source, idx) => (
                                                    <li key={idx} className="text-xs bg-muted/50 px-2 py-1.5 rounded border border-border/50 text-muted-foreground">
                                                        <span className="font-medium text-foreground">Q: {source.question}</span>
                                                        <span className="ml-2 opacity-50">({(source.similarity * 100).toFixed(1)}% match)</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start w-full">
                        <div className="bg-card border border-border rounded-lg p-4 shadow-sm flex items-center gap-3">
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-card">
                <form onSubmit={handleSearch} className="flex gap-2 relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-1 px-4 py-3 bg-muted/50 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all shadow-sm text-foreground placeholder:text-muted-foreground"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center min-w-[50px]"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
            </div>

            {/* Export Modal */}
            <ExportModal
                open={showExportModal}
                onClose={() => setShowExportModal(false)}
            />
        </div>
    );
}
