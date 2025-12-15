"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Send, Loader2, Trash2 } from "lucide-react";

interface ChatInputProps {
    onSend: (message: string) => void;
    onClear?: () => void;
    isLoading?: boolean;
    disabled?: boolean;
}

export function ChatInput({ onSend, onClear, isLoading, disabled }: ChatInputProps) {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const handleSubmit = () => {
        if (!input.trim() || isLoading || disabled) return;
        onSend(input.trim());
        setInput("");
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto max-w-3xl px-4 py-4">
                <div className="relative flex items-end gap-2">
                    <div className="relative flex-1">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a question about your knowledge base..."
                            disabled={isLoading || disabled}
                            rows={1}
                            className={cn(
                                "w-full resize-none rounded-xl border bg-card px-4 py-3 pr-12 text-sm",
                                "placeholder:text-muted-foreground",
                                "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                "min-h-[48px] max-h-[200px]"
                            )}
                        />
                        <Button
                            type="button"
                            size="icon"
                            onClick={handleSubmit}
                            disabled={!input.trim() || isLoading || disabled}
                            className="absolute bottom-2 right-2 h-8 w-8 rounded-lg"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    {onClear && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={onClear}
                            disabled={isLoading}
                            className="h-12 w-12 shrink-0 text-muted-foreground hover:text-destructive"
                            title="Clear conversation"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                    Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">Enter</kbd> to send, <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">Shift + Enter</kbd> for new line
                </p>
            </div>
        </div>
    );
}
