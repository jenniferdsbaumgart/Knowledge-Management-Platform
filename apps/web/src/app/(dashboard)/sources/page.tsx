"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sourcesApi, syncApi, uploadApi } from "@/lib/api";
import { Plus, RefreshCw, Trash2, CheckCircle, XCircle, Loader2, Upload, FileText, X, Search, Globe, Database } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function SourcesPage() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);

    const { data: sources, isLoading } = useQuery({
        queryKey: ["sources"],
        queryFn: () => sourcesApi.list().then((res) => res.data),
    });

    const syncMutation = useMutation({
        mutationFn: (sourceId: string) => syncApi.trigger(sourceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sources"] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (sourceId: string) => sourcesApi.delete(sourceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sources"] });
        },
    });

    return (
        <div className="space-y-8">
            <PageHeader
                title="Data Sources"
                description="Manage your knowledge base data sources."
                action={
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Source
                    </Button>
                }
            />

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Add New Source</DialogTitle>
                    </DialogHeader>
                    <AddSourceForm onClose={() => setShowForm(false)} />
                </DialogContent>
            </Dialog>

            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {Array(3).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-[200px] rounded-xl" />
                        ))}
                    </motion.div>
                ) : sources?.items?.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl"
                    >
                        <div className="p-4 bg-muted rounded-full mb-4">
                            <Database className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No data sources yet</h3>
                        <p className="text-muted-foreground mb-6 text-center max-w-sm">
                            Connect your first data source to start indexing content for RAG.
                        </p>
                        <Button onClick={() => setShowForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Source
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={{
                            hidden: { opacity: 0 },
                            show: {
                                opacity: 1,
                                transition: { staggerChildren: 0.1 }
                            }
                        }}
                        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {sources?.items?.map((source: any) => (
                            <motion.div
                                key={source.id}
                                variants={{
                                    hidden: { y: 20, opacity: 0 },
                                    show: { y: 0, opacity: 1 }
                                }}
                            >
                                <Card className="h-full group hover:shadow-lg transition-all duration-300 border hover:border-primary/50">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                {source.type === 'API' && <Search className="w-5 h-5" />}
                                                {source.type === 'DATABASE' && <Database className="w-5 h-5" />}
                                                {source.type === 'DOCUMENT' && <FileText className="w-5 h-5" />}
                                                {source.type === 'WEB' && <Globe className="w-5 h-5" />}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => syncMutation.mutate(source.id)}
                                                disabled={syncMutation.isPending || source.status === 'SYNCING'}
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${source.status === 'SYNCING' ? 'animate-spin' : ''}`} />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => deleteMutation.mutate(source.id)}
                                                disabled={deleteMutation.isPending}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <h3 className="font-semibold text-lg truncate mb-1">{source.name}</h3>
                                        <p className="text-xs font-mono text-muted-foreground mb-4 truncate">{source.config.url || "File Upload"}</p>

                                        <div className="flex items-center justify-between text-sm mb-4">
                                            <StatusBadge status={source.status} />
                                            <span className="text-xs text-muted-foreground">
                                                {source._count?.documents || 0} docs
                                            </span>
                                        </div>

                                        <div className="pt-4 border-t text-xs text-muted-foreground flex items-center justify-between">
                                            <span>Type: {source.type}</span>
                                            {source.lastSyncAt && (
                                                <span>
                                                    Synced: {new Date(source.lastSyncAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        SUCCESS: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        SYNCING: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 animate-pulse",
        FAILED: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
        IDLE: "text-muted-foreground"
    };

    const icons = {
        SUCCESS: CheckCircle,
        SYNCING: Loader2,
        FAILED: XCircle,
        IDLE: null
    };

    const Icon = icons[status as keyof typeof icons];

    return (
        <Badge
            variant="outline"
            className={`font-normal gap-1.5 ${styles[status as keyof typeof styles] || styles.IDLE}`}
        >
            {Icon && <Icon className={`w-3 h-3 ${status === 'SYNCING' ? 'animate-spin' : ''}`} />}
            {status}
        </Badge>
    );
}

function AddSourceForm({ onClose }: { onClose: () => void }) {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [type, setType] = useState("API");
    const [url, setUrl] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await sourcesApi.create(data);
            return response.data;
        },
        onSuccess: async (source) => {
            if (type === "DOCUMENT" && files.length > 0) {
                try {
                    await uploadApi.upload(source.id, files, setUploadProgress);
                } catch (error) {
                    console.error("Upload failed:", error);
                }
            }
            queryClient.invalidateQueries({ queryKey: ["sources"] });
            onClose();
        },
    });

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles((prev) => [...prev, ...droppedFiles]);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            name,
            type,
            config: type === "DOCUMENT"
                ? { type, fileCount: files.length }
                : { type, url, method: "GET" },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Production Database Documentation"
                        required
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium">Source Type</label>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="API">REST API</SelectItem>
                            <SelectItem value="DOCUMENT">Document Upload</SelectItem>
                            <SelectItem value="WEB">Web Scraper</SelectItem>
                            <SelectItem value="DATABASE">Database</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {type !== "DOCUMENT" && (
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Endpoint URL</label>
                        <Input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://api.example.com/v1/docs"
                            required={type !== "DOCUMENT"}
                        />
                    </div>
                )}
            </div>

            {type === "DOCUMENT" && (
                <div className="space-y-3 pt-2">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${isDragging
                            ? "border-primary bg-primary/5 scale-[0.99]"
                            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                            }`}
                    >
                        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                            <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm font-medium">
                            Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            PDF, Word, Excel, Markdown, JSON (max 10MB)
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.json,.csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    <AnimatePresence>
                        {files.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-2"
                            >
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Selected Files</p>
                                <div className="max-h-[150px] overflow-auto space-y-1 pr-1 custom-scrollbar">
                                    {files.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-2.5 bg-card border rounded-lg text-sm shadow-sm group"
                                        >
                                            <div className="flex items-center gap-3 truncate">
                                                <div className="p-1.5 bg-primary/10 rounded">
                                                    <FileText className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="flex flex-col truncate">
                                                    <span className="truncate font-medium">{file.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {(file.size / 1024).toFixed(1)} KB
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                onClick={() => removeFile(index)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span>Uploading...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <motion.div
                                    className="bg-primary h-full rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                    transition={{ ease: "linear" }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={createMutation.isPending || (type === "DOCUMENT" && files.length === 0)}
                >
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {createMutation.isPending ? "Creating..." : "Create Source"}
                </Button>
            </div>
        </form>
    );
}

