'use client';

import { FaqChat } from '@/components/faq-chat';

export default function FaqChatPage() {
    return (
        <div className="container mx-auto max-w-5xl py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Knowledge Assistant</h1>
                <p className="text-muted-foreground mt-2">Chat with your FAQ knowledge base using RAG.</p>
            </div>

            <FaqChat />
        </div>
    );
}
