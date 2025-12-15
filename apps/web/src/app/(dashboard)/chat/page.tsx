"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { searchApi } from "@/lib/api";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { PageHeader } from "@/components/shared/page-header";
import { MessageSquare, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: Array<{
        documentTitle: string;
        content: string;
        score: number;
    }>;
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const ragMutation = useMutation({
        mutationFn: (query: string) => {
            const conversationHistory = messages.map((m) => ({
                role: m.role,
                content: m.content,
            }));
            return searchApi.rag({ query, conversationHistory });
        },
        onSuccess: (response) => {
            const { answer, sources } = response.data;
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: answer,
                    sources: sources || [],
                },
            ]);
        },
        onError: (error: any) => {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: `Sorry, I encountered an error: ${error.message || "Unknown error"}. Please try again.`,
                },
            ]);
        },
    });

    const handleSend = (message: string) => {
        // Add user message
        setMessages((prev) => [
            ...prev,
            {
                id: Date.now().toString(),
                role: "user",
                content: message,
            },
        ]);

        // Trigger RAG query
        ragMutation.mutate(message);
    };

    const handleClear = () => {
        setMessages([]);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Header */}
            <div className="shrink-0 px-6 pt-6 pb-2">
                <PageHeader
                    title="Knowledge Chat"
                    description="Ask questions about your indexed knowledge base."
                />
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center h-full px-4 text-center"
                    >
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25 mb-6">
                            <Sparkles className="h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Welcome to Knowledge Chat</h2>
                        <p className="text-muted-foreground max-w-md mb-8">
                            Ask any question about your indexed documents. I'll search through your knowledge base and provide answers with source citations.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-2xl">
                            {[
                                "What documents do I have about APIs?",
                                "Summarise the main topics in my knowledge base",
                                "What are the key insights from recent syncs?",
                            ].map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(suggestion)}
                                    className="rounded-xl border bg-card p-4 text-left text-sm hover:bg-muted/50 transition-colors"
                                >
                                    <MessageSquare className="h-4 w-4 text-primary mb-2" />
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <div className="max-w-3xl mx-auto">
                        {messages.map((message) => (
                            <ChatMessage
                                key={message.id}
                                role={message.role}
                                content={message.content}
                                sources={message.sources}
                            />
                        ))}

                        {/* Loading indicator */}
                        {ragMutation.isPending && (
                            <ChatMessage
                                role="assistant"
                                content=""
                                isLoading
                            />
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="shrink-0">
                <ChatInput
                    onSend={handleSend}
                    onClear={messages.length > 0 ? handleClear : undefined}
                    isLoading={ragMutation.isPending}
                />
            </div>
        </div>
    );
}
