"use client";

import { cn } from "@/lib/utils";
import { User, Bot, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface Source {
    documentTitle: string;
    content: string;
    score: number;
}

interface ChatMessageProps {
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
    isLoading?: boolean;
}

export function ChatMessage({ role, content, sources, isLoading }: ChatMessageProps) {
    const isUser = role === "user";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex gap-4 px-4 py-6",
                isUser ? "bg-transparent" : "bg-muted/30"
            )}
        >
            {/* Avatar */}
            <div
                className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
                )}
            >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3 overflow-hidden">
                <div className="text-sm font-medium text-muted-foreground">
                    {isUser ? "You" : "Knowledge Assistant"}
                </div>

                {isLoading ? (
                    <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="whitespace-pre-wrap">{content}</p>
                    </div>
                )}

                {/* Sources */}
                {sources && sources.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Sources
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {sources.map((source, index) => (
                                <div
                                    key={index}
                                    className="group flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs transition-colors hover:bg-muted/50"
                                >
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                                        {index + 1}
                                    </span>
                                    <span className="truncate max-w-[200px] font-medium">
                                        {source.documentTitle}
                                    </span>
                                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
