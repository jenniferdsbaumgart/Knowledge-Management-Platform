"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { faqApi, sourcesApi } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Plus,
    Sparkles,
    Check,
    Archive,
    Trash2,
    Edit,
    HelpCircle,
} from "lucide-react";
import { motion } from "framer-motion";

interface FaqEntry {
    id: string;
    question: string;
    answer: string;
    status: "DRAFT" | "APPROVED" | "ARCHIVED";
    category?: { id: string; name: string };
    confidence: number;
    viewCount: number;
    createdAt: string;
}

const statusConfig = {
    DRAFT: { label: "Draft", color: "bg-yellow-500/10 text-yellow-500" },
    APPROVED: { label: "Approved", color: "bg-green-500/10 text-green-500" },
    ARCHIVED: { label: "Archived", color: "bg-zinc-500/10 text-zinc-500" },
};

export default function FaqPage() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [selectedSource, setSelectedSource] = useState<string>("");
    const [newQuestion, setNewQuestion] = useState("");
    const [newAnswer, setNewAnswer] = useState("");

    const { data: faqData, isLoading } = useQuery({
        queryKey: ["faqs", statusFilter],
        queryFn: () =>
            faqApi.list({
                limit: 50,
                status: statusFilter !== "all" ? statusFilter : undefined,
            }),
    });

    const { data: sourcesData } = useQuery({
        queryKey: ["sources"],
        queryFn: () => sourcesApi.list({ limit: 100 }),
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => faqApi.approve(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faqs"] }),
    });

    const archiveMutation = useMutation({
        mutationFn: (id: string) => faqApi.archive(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faqs"] }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => faqApi.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faqs"] }),
    });

    const generateMutation = useMutation({
        mutationFn: (sourceId: string) => faqApi.generate(sourceId, 5),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["faqs"] });
            setGenerateDialogOpen(false);
            setSelectedSource("");
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: { question: string; answer: string }) => faqApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["faqs"] });
            setAddDialogOpen(false);
            setNewQuestion("");
            setNewAnswer("");
        },
    });

    const faqs: FaqEntry[] = faqData?.data?.items || [];
    const sources = sourcesData?.data?.items || [];

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="FAQ Management"
                description="Manage frequently asked questions for AI assistants and help centres."
            />

            {/* Actions Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-3">
                    <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate FAQs
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Generate FAQs with AI</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <p className="text-sm text-muted-foreground">
                                    Select a source to generate FAQ entries from its indexed content.
                                </p>
                                <Select value={selectedSource} onValueChange={setSelectedSource}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sources.map((source: any) => (
                                            <SelectItem key={source.id} value={source.id}>
                                                {source.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={() => selectedSource && generateMutation.mutate(selectedSource)}
                                    disabled={!selectedSource || generateMutation.isPending}
                                    className="w-full"
                                >
                                    {generateMutation.isPending ? "Generating..." : "Generate FAQs"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add FAQ
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add FAQ Manually</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Question</label>
                                    <input
                                        type="text"
                                        value={newQuestion}
                                        onChange={(e) => setNewQuestion(e.target.value)}
                                        placeholder="Enter the question..."
                                        className="w-full px-3 py-2 border rounded-md bg-background"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Answer</label>
                                    <textarea
                                        value={newAnswer}
                                        onChange={(e) => setNewAnswer(e.target.value)}
                                        placeholder="Enter the answer..."
                                        rows={4}
                                        className="w-full px-3 py-2 border rounded-md bg-background resize-none"
                                    />
                                </div>
                                <Button
                                    onClick={() => {
                                        if (newQuestion && newAnswer) {
                                            createMutation.mutate({ question: newQuestion, answer: newAnswer });
                                        }
                                    }}
                                    disabled={!newQuestion || !newAnswer || createMutation.isPending}
                                    className="w-full"
                                >
                                    {createMutation.isPending ? "Creating..." : "Create FAQ"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* FAQ List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                    ))}
                </div>
            ) : faqs.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No FAQs yet</h3>
                        <p className="text-muted-foreground text-center max-w-md">
                            Generate FAQs from your indexed sources or create them manually.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={faq.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="hover:border-primary/50 transition-colors">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-base font-medium">
                                                {faq.question}
                                            </CardTitle>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={statusConfig[faq.status].color}>
                                                {statusConfig[faq.status].label}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                        {faq.answer}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-muted-foreground">
                                            {faq.category?.name && (
                                                <span className="mr-4">Category: {faq.category.name}</span>
                                            )}
                                            <span>Views: {faq.viewCount}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {faq.status === "DRAFT" && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => approveMutation.mutate(faq.id)}
                                                    disabled={approveMutation.isPending}
                                                >
                                                    <Check className="mr-1 h-3 w-3" />
                                                    Approve
                                                </Button>
                                            )}
                                            {faq.status !== "ARCHIVED" && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => archiveMutation.mutate(faq.id)}
                                                    disabled={archiveMutation.isPending}
                                                >
                                                    <Archive className="mr-1 h-3 w-3" />
                                                    Archive
                                                </Button>
                                            )}
                                            <Button size="sm" variant="ghost">
                                                <Edit className="mr-1 h-3 w-3" />
                                                Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive"
                                                onClick={() => deleteMutation.mutate(faq.id)}
                                                disabled={deleteMutation.isPending}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
